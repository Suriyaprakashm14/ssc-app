import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, where, type DocumentData } from "firebase/firestore";
import { getDb } from "@/firebase/config";

const dbOrThrow = () => { const db = getDb(); if (!db) throw new Error("Firebase is not configured. Add values to .env.local."); return db; };
export async function saveDocument<T extends DocumentData & { id: string }>(collectionName: string, item: T) { await setDoc(doc(dbOrThrow(), collectionName, item.id), item); return item; }
export async function addDocument<T extends DocumentData>(collectionName: string, item: T) { return addDoc(collection(dbOrThrow(), collectionName), item); }
export async function deleteDocument(collectionName: string, id: string) { return deleteDoc(doc(dbOrThrow(), collectionName, id)); }
export async function listUserDocuments<T>(collectionName: string, userId: string): Promise<T[]> { const snapshot = await getDocs(query(collection(dbOrThrow(), collectionName), where("userId", "==", userId), orderBy("createdAt", "desc"))); return snapshot.docs.map((item) => item.data() as T); }
