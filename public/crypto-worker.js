/**
 * Dedicated Web Worker Enclave (Anti-Forensics & Zero-Knowledge Cryptography)
 * Runs in an isolated thread outside the main React/DOM context.
 * Symmetric keys (AES-256-GCM) are non-extractable (`extractable: false`).
 * Plaintext buffers are scrubbed with crypto.getRandomValues() before garbage collection.
 */

let activeCryptoKey = null;
let keyIdentifier = null;

// Cryptographic Memory Wiping: Scrubs sensitive typed array buffers with random noise
function wipeBuffer(buffer) {
  if (buffer && buffer.buffer) {
    try {
      self.crypto.getRandomValues(new Uint8Array(buffer.buffer));
    } catch (e) {
      buffer.fill(0);
    }
  }
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return self.btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary_string = self.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Decoy generator for Duress Vault (Plausible Deniability)
const DECOY_ENTRIES = [
  {
    title: 'Morning Garden & Tea',
    category: 'Daily Living',
    mode: 'reflection',
    mood: '🌸 Grateful',
    content: 'The morning sun was gentle today. I watered the sweet basil and lavender on the windowsill and enjoyed a warm cup of peppermint tea. Everything feels peaceful and calm.',
  },
  {
    title: 'Walk in the Pine Woods',
    category: 'Mindfulness',
    mode: 'reflection',
    mood: '🌿 Grounded',
    content: 'Took a slow stroll along the forest trail. Heard the sparrows singing high up in the oak branches. Taking deep breaths and remembering to be kind to myself.',
  },
  {
    title: 'Cinnamon Roll Baking',
    category: 'Creative Exploration',
    mode: 'brainstorm',
    mood: '😊 Joyful',
    content: 'Tried the old family recipe for cinnamon rolls with extra vanilla glaze. The kitchen smells wonderful. Looking forward to sharing these with neighbors this afternoon.',
  }
];

self.onmessage = async (event) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'INIT_KEY': {
        const { secret, salt } = payload;
        const enc = new TextEncoder();
        const rawSecret = enc.encode(secret || 'default-zero-knowledge-passkey-secret');
        const saltBuffer = enc.encode(salt || 'reflections-zk-salt-v1');

        // Import master key material
        const baseKey = await self.crypto.subtle.importKey(
          'raw',
          rawSecret,
          'PBKDF2',
          false,
          ['deriveKey']
        );

        // Derive non-extractable AES-GCM-256 key
        activeCryptoKey = await self.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256',
          },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false, // NON-EXTRACTABLE: Prevents DOM XSS exfiltration
          ['encrypt', 'decrypt']
        );

        keyIdentifier = 'zk-aes-gcm-256-' + Date.now();

        // Wipe intermediate secret buffer
        wipeBuffer(rawSecret);
        wipeBuffer(saltBuffer);

        self.postMessage({
          id,
          type: 'SUCCESS',
          payload: { keyId: keyIdentifier, initialized: true },
        });
        break;
      }

      case 'ENCRYPT': {
        if (!activeCryptoKey) {
          throw new Error('Encryption key not initialized in enclave worker.');
        }

        const { plaintext } = payload;
        const enc = new TextEncoder();
        const plaintextBuffer = enc.encode(plaintext || '');
        const iv = self.crypto.getRandomValues(new Uint8Array(12)); // 96-bit standard GCM IV

        const encryptedBuffer = await self.crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: iv,
            tagLength: 128,
          },
          activeCryptoKey,
          plaintextBuffer
        );

        const ciphertextBase64 = arrayBufferToBase64(encryptedBuffer);
        const ivBase64 = arrayBufferToBase64(iv);

        // Anti-Forensics Memory Hygiene: Scrub plaintext buffer immediately
        wipeBuffer(plaintextBuffer);

        self.postMessage({
          id,
          type: 'SUCCESS',
          payload: {
            ciphertext: ciphertextBase64,
            iv: ivBase64,
            keyId: keyIdentifier,
            wipedBytes: plaintextBuffer.byteLength,
          },
        });
        break;
      }

      case 'DECRYPT': {
        if (!activeCryptoKey) {
          throw new Error('Decryption key not initialized in enclave worker.');
        }

        const { ciphertext, iv } = payload;
        const encryptedBuffer = base64ToArrayBuffer(ciphertext);
        const ivBuffer = base64ToArrayBuffer(iv);

        const decryptedBuffer = await self.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: new Uint8Array(ivBuffer),
            tagLength: 128,
          },
          activeCryptoKey,
          encryptedBuffer
        );

        const dec = new TextDecoder();
        const decryptedBytes = new Uint8Array(decryptedBuffer);
        const plaintext = dec.decode(decryptedBytes);

        // Anti-Forensics Memory Hygiene: Scrub decrypted buffer immediately after string extraction
        wipeBuffer(decryptedBytes);

        self.postMessage({
          id,
          type: 'SUCCESS',
          payload: {
            plaintext,
            wipedBytes: decryptedBytes.byteLength,
          },
        });
        break;
      }

      case 'SHRED_KEY': {
        activeCryptoKey = null;
        keyIdentifier = null;
        self.postMessage({
          id,
          type: 'SUCCESS',
          payload: { shredded: true },
        });
        break;
      }

      case 'GET_DECOY_VAULT': {
        // Duress vault benign entries
        self.postMessage({
          id,
          type: 'SUCCESS',
          payload: { decoys: DECOY_ENTRIES },
        });
        break;
      }

      default:
        throw new Error(`Unknown enclave operation: ${type}`);
    }
  } catch (err) {
    self.postMessage({
      id,
      type: 'ERROR',
      error: err.message || String(err),
    });
  }
};
