import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
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

// CRITICAL: The app will break without specifying firebaseConfig.firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in with Google using popup
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Tests connection to Firestore server on app boot
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Verify internet connection.');
      return false;
    }
    // Permission denied confirms connection reached Firestore server
    return true;
  }
}

/**
 * Saves or updates a user-isolated reflection interaction entry
 */
export async function saveInteraction(userId: string, entry: InteractionEntry): Promise<void> {
  const docPath = `users/${userId}/interactions/${entry.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'interactions', entry.id);
    const sanitizedPayload = stripUndefined({
      ...entry,
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
) {
  const collectionPath = `users/${userId}/interactions`;
  const collRef = collection(db, 'users', userId, 'interactions');
  const q = query(collRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: InteractionEntry[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as InteractionEntry);
      });
      onData(items);
    },
    (error) => {
      const errInfo = handleFirestoreError(error, OperationType.LIST, collectionPath);
      onError(errInfo);
    }
  );
}
