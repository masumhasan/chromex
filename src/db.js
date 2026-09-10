// db.js
import { openDB } from "idb";

const DB_NAME = "my-extension-db";
const DB_VERSION = 1;
const STORE_NAME = "settings";

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    },
  });
};

// 🚀 Save or update an item
export const setItem = async (key, value) => {
  const db = await initDB();
  return db.put(STORE_NAME, { key, value });
};

// 🧠 Get one item by key
export const getItem = async (key) => {
  const db = await initDB();
  const result = await db.get(STORE_NAME, key);
  return result?.value ?? null;
};

// 📋 Get all key-value items
export const getAllItems = async () => {
  const db = await initDB();
  const entries = await db.getAll(STORE_NAME);
  const result = {};
  entries.forEach(({ key, value }) => {
    result[key] = value;
  });
  return result;
};

// 🔑 Get all keys only
export const getKeys = async () => {
  const db = await initDB();
  return db.getAllKeys(STORE_NAME);
};

// ❌ Delete a single item
export const deleteItem = async (key) => {
  const db = await initDB();
  return db.delete(STORE_NAME, key);
};
export const deleteItemByIndex = async (key, index) => {
  const data = (await getItem(key)) || [];
  data.splice(index, 1);
  return setItem(key, data);
};
// 💣 Delete all items
export const deleteAllItems = async () => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.store.clear();
  await tx.done;
};
