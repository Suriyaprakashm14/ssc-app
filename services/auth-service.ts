import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/firebase/config";

const authOrThrow = () => {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured.");
  return auth;
};

let readyAuth: Promise<Auth> | undefined;

export const initializeAuth = () => {
  if (!readyAuth) {
    const auth = authOrThrow();
    readyAuth = setPersistence(auth, browserLocalPersistence).then(() => auth);
  }
  return readyAuth;
};

const saveUserProfile = async (user: User) => {
  const db = getDb();
  if (!db) return;
  await setDoc(doc(db, "users", user.uid), {
    userId: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    providerIds: user.providerData.map((provider) => provider.providerId),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
};

export const loginWithGoogle = async (): Promise<User> => {
  const user = (await signInWithPopup(await initializeAuth(), new GoogleAuthProvider())).user;
  await saveUserProfile(user);
  return user;
};

export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  const user = (await signInWithEmailAndPassword(await initializeAuth(), email, password)).user;
  await saveUserProfile(user);
  return user;
};

export const registerWithEmail = async (email: string, password: string, displayName: string): Promise<User> => {
  const user = (await createUserWithEmailAndPassword(await initializeAuth(), email, password)).user;
  if (displayName.trim()) await updateProfile(user, { displayName: displayName.trim() });
  await saveUserProfile(user);
  return user;
};

export const requestPasswordReset = async (email: string) => sendPasswordResetEmail(await initializeAuth(), email);
export const getFreshIdToken = async () => (await initializeAuth()).currentUser?.getIdToken() ?? null;
export const logout = async () => signOut(await initializeAuth());
