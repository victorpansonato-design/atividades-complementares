/**
 * Bytes dos comprovantes, SEPARADOS dos metadados. Usa IndexedDB quando existe;
 * senão guarda em memória (some ao recarregar e o aluno precisa reanexar).
 * O backend real fará upload/armazenamento; isto é apenas para a demonstração.
 */
const DB_NAME = "atividades-complementares-demo";
const STORE = "attachments";

const memory = new Map<string, Blob>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
   if (dbPromise) return dbPromise;
   dbPromise = new Promise(resolve => {
      try {
         if (typeof indexedDB === "undefined") return resolve(null);
         const request = indexedDB.open(DB_NAME, 1);
         request.onupgradeneeded = () => request.result.createObjectStore(STORE);
         request.onsuccess = () => resolve(request.result);
         request.onerror = () => resolve(null);
         request.onblocked = () => resolve(null);
      } catch {
         resolve(null);
      }
   });
   return dbPromise;
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
   return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
   });
}

export async function bytesPersistence(): Promise<"indexeddb" | "memory"> {
   return (await openDb()) ? "indexeddb" : "memory";
}

export async function putBytes(id: string, blob: Blob): Promise<{ persisted: boolean }> {
   const db = await openDb();
   if (db) {
      try {
         await run(db, "readwrite", store => store.put(blob, id));
         return { persisted: true };
      } catch {
         // cota ou modo privado: cai para memória
      }
   }
   memory.set(id, blob);
   return { persisted: false };
}

export async function getBytes(id: string): Promise<Blob | null> {
   if (memory.has(id)) return memory.get(id)!;
   const db = await openDb();
   if (!db) return null;
   try {
      const result = await run<unknown>(db, "readonly", store => store.get(id));
      return result instanceof Blob ? result : null;
   } catch {
      return null;
   }
}

export async function deleteBytes(id: string): Promise<void> {
   memory.delete(id);
   const db = await openDb();
   if (!db) return;
   try {
      await run(db, "readwrite", store => store.delete(id));
   } catch {
      // ignorado: limpeza best effort
   }
}

export async function clearBytes(): Promise<void> {
   memory.clear();
   const db = await openDb();
   if (!db) return;
   try {
      await run(db, "readwrite", store => store.clear());
   } catch {
      // ignorado
   }
}
