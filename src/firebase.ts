import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDocFromServer,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { FirestoreErrorInfo, OperationType, InteractionEntry } from './types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Force long polling to bypass iframe/proxy stream buffering delays and prevent 10s timeout errors
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in with Google using popup with graceful user cancellation and blocker handling
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    // If the user closed or cancelled the popup, handle gracefully without error logs
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('auth/popup-closed-by-user') ||
      error?.message?.includes('popup-closed-by-user')
    ) {
      console.info('Google sign-in popup closed by user.');
      return null;
    }

    if (error?.code === 'auth/popup-blocked') {
      console.warn('Google sign-in popup was blocked by browser. Please enable popups or open in a new tab.');
      throw new Error(
        'Sign-in popup was blocked by your browser. Please allow popups or open the app in a new tab.'
      );
    }

    if (error?.code === 'auth/network-request-failed') {
      throw new Error('Network connection issue. Please verify your connection and try again.');
    }

    if (error?.code === 'auth/unauthorized-domain') {
      throw new Error('This app domain is not yet authorized in Firebase Console Authentication settings.');
    }

    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Strips all undefined values to null or removes them for Zero-Crash Payload Hygiene.
 */
export function stripUndefined<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

/**
 * Standardized Firestore error logger conforming to FirestoreErrorInfo
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || '';

  // Suppress loud console.error when user signed out and listener is tearing down
  const isCleanSignOutTeardown =
    !auth.currentUser &&
    (errCode === 'permission-denied' || errMsg.toLowerCase().includes('insufficient permissions'));

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  if (isCleanSignOutTeardown) {
    console.info('Firestore subscription cleanly detached on user sign-out.');
  } else {
    console.warn('Firestore operational notice:', JSON.stringify(errInfo));
  }

  return errInfo;
}

/**
 * Tests connection to Firestore server on app boot
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (
      errorMsg.includes('the client is offline') ||
      errorMsg.includes('Could not reach Cloud Firestore backend') ||
      errorMsg.includes('offline mode')
    ) {
      console.info('Firebase Firestore client operates with local cache until cloud backend reconnects.');
      return false;
    }
    // Permission denied confirms connection successfully reached Firestore server
    return true;
  }
}

/**
 * Saves or updates a user-isolated reflection interaction entry
 */
export async function saveInteraction(userId: string, entry: InteractionEntry): Promise<void> {
  if (!userId || !userId.trim()) {
    console.warn('Cannot save interaction: Missing authenticated user ID.');
    return;
  }

  const safeEntryId = entry.id || `entry-${Date.now()}`;
  const docPath = `users/${userId}/interactions/${safeEntryId}`;

  try {
    const docRef = doc(db, 'users', userId, 'interactions', safeEntryId);
    const sanitizedPayload = stripUndefined({
      ...entry,
      id: safeEntryId,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(docRef, sanitizedPayload, { merge: true });
  } catch (error) {
    const err = handleFirestoreError(error, OperationType.WRITE, docPath);
    throw new Error(err.error);
  }
}

/**
 * Deletes a user-isolated reflection interaction entry
 */
export async function deleteInteraction(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) return;

  const docPath = `users/${userId}/interactions/${entryId}`;
  try {
    const docRef = doc(db, 'users', userId, 'interactions', entryId);
    await deleteDoc(docRef);
  } catch (error) {
    const err = handleFirestoreError(error, OperationType.DELETE, docPath);
    throw new Error(err.error);
  }
}

/**
 * Subscribes in real-time to the current user's interaction entries
 */
export function subscribeToUserInteractions(
  userId: string,
  onData: (entries: InteractionEntry[]) => void,
  onError: (error: FirestoreErrorInfo) => void
): () => void {
  if (!userId || !userId.trim()) {
    return () => {};
  }

  const collectionPath = `users/${userId}/interactions`;
  const collRef = collection(db, 'users', userId, 'interactions');
  const q = query(collRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: InteractionEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as InteractionEntry;
        items.push({
          ...data,
          id: data.id || docSnap.id,
        });
      });

      // Defensive in-memory sort ensures perfect ordering even if legacy items lack timestamps
      items.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      onData(items);
    },
    (error) => {
      const errInfo = handleFirestoreError(error, OperationType.LIST, collectionPath);
      onError(errInfo);
    }
  );
}
