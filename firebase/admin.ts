import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const loadEnvironmentFile = (filename: string, protectedKeys: Set<string>) => {
  const filepath = resolve(process.cwd(), filename);
  if (!existsSync(filepath)) return;
  for (const rawLine of readFileSync(filepath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    if (protectedKeys.has(key)) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
};

const inheritedKeys = new Set(Object.keys(process.env));
loadEnvironmentFile(".env", inheritedKeys);
loadEnvironmentFile(".env.local", inheritedKeys);

const required = (name: "FIREBASE_ADMIN_CLIENT_EMAIL" | "FIREBASE_ADMIN_PRIVATE_KEY") => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to seed Firestore.`);
  return value;
};

export const getAdminDb = () => {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: required("FIREBASE_ADMIN_CLIENT_EMAIL"),
        privateKey: required("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
      }),
    });
  }

  return getFirestore();
};
