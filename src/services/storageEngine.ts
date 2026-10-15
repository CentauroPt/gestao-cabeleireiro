/**
 * Motor de persistência resiliente de dupla camada:
 * Camada 1: LocalStorage (síncrono, ultrarrápido).
 * Camada 2: IndexedDB (alta capacidade, imune a erros de quota de 5MB, persistência a longo prazo).
 * 
 * Garante que utilizadores, salões, clientes e reservas NUNCA se perdem
 * mesmo após fechar o navegador, limpar a cache leve ou exceder limites de fotos.
 */

export const STORAGE_KEYS = {
  SALONS: 'salao_app_salons',
  USERS: 'salao_app_users',
  SERVICES: 'salao_app_services',
  CLIENTS: 'salao_app_clients',
  APPOINTMENTS: 'salao_app_appointments',
  DEV_PASSWORD: 'salao_app_dev_password',
  SESSION: 'salao_app_active_session',
} as const;

export interface ActiveSession {
  appMode: 'landing' | 'salon' | 'developer';
  salonId: string;
  userId: string;
  timestamp: number;
}

const IDB_NAME = 'salao_master_persistent_v1';
const IDB_STORE = 'app_data_store';

type StorageSyncListener = () => void;
const listeners = new Set<StorageSyncListener>();

export function onStorageSync(listener: StorageSyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyStorageSync(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Erro ao notificar listener de storage:', e);
    }
  });
}

function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(IDB_NAME, 1);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };

      request.onsuccess = (e) => {
        resolve((e.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        console.warn('Não foi possível abrir IndexedDB. Prosseguindo com LocalStorage.');
        resolve(null);
      };
    } catch (err) {
      console.warn('Erro ao inicializar IndexedDB:', err);
      resolve(null);
    }
  });
}

export async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openIndexedDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve((req.result as T) ?? null);
      };

      req.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openIndexedDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Lê do LocalStorage com fallback seguro
 */
export function loadFromLocalStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Remover utilizadores de demonstração legados caso existam no armazenamento do browser
        if (key === STORAGE_KEYS.USERS) {
          const legacyUserIds = ['user-admin', 'user-colab-1', 'user-colab-2', 'user-admin-salon2', 'user-admin-salon3'];
          const legacyEmails = ['helena@atelierbeleza.pt', 'tiago@atelierbeleza.pt', 'rita@atelierbeleza.pt', 'marta@glamourchic.pt', 'carla@visualglow.pt'];
          parsed = parsed.filter((u: any) => !legacyUserIds.includes(u?.id) && !legacyEmails.includes(u?.email));
        }
        // Remover salões de demonstração legados caso existam
        if (key === STORAGE_KEYS.SALONS) {
          const legacySalonIds = ['salon-1', 'salon-2', 'salon-3'];
          parsed = parsed.filter((s: any) => !legacySalonIds.includes(s?.id));
        }
        if (parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error(`Erro ao ler ${key} do LocalStorage:`, e);
  }
  return fallback;
}

/**
 * Guarda dados no LocalStorage e no IndexedDB simultaneamente
 */
export function saveToStorage<T>(key: string, data: T[]): void {
  // 1. Tentar gravar no LocalStorage (síncrono)
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err: any) {
    console.warn(`Aviso: Falha ao gravar ${key} no LocalStorage (${err?.name || err}). A usar IndexedDB de alta capacidade.`, err);

    // Se a quota do LocalStorage estiver esgotada, tenta limpar fotos antigas ou chaves não essenciais
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      tryCleanOldCache();
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // Se ainda falhar, garantimos pelo IndexedDB abaixo
      }
    }
  }

  // 2. Gravar no IndexedDB de forma resiliente e permanente
  idbSet(key, data).catch((e) => console.error(`Erro ao sincronizar ${key} com IndexedDB:`, e));
  notifyStorageSync();
}

/**
 * Caso o LocalStorage exceda os 5MB, tenta remover itens redundantes
 */
function tryCleanOldCache() {
  try {
    const tempKeys = ['vite-plugin-pwa-cache'];
    tempKeys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignorar
  }
}

/**
 * Sincroniza e faz MERGE seguro entre o LocalStorage e o IndexedDB.
 * Se existirem salões/utilizadores em qualquer uma das camadas, junta-os garantindo
 * que NENHUM dado gravado se perde, mesmo que uma das camadas tenha sido apagada.
 */
export async function syncAndMergeStorage(): Promise<boolean> {
  try {
    let changed = false;
    const keysToCheck = [
      STORAGE_KEYS.SALONS,
      STORAGE_KEYS.USERS,
      STORAGE_KEYS.SERVICES,
      STORAGE_KEYS.CLIENTS,
      STORAGE_KEYS.APPOINTMENTS,
    ];

    for (const key of keysToCheck) {
      let lsArray: any[] = [];
      const lsRaw = localStorage.getItem(key);
      if (lsRaw) {
        try {
          const parsed = JSON.parse(lsRaw);
          if (Array.isArray(parsed)) lsArray = parsed;
        } catch {}
      }

      const idbData = await idbGet<any[]>(key);
      const idbArray = Array.isArray(idbData) ? idbData : [];

      if (lsArray.length === 0 && idbArray.length === 0) {
        continue;
      }

      // Merge inteligente por ID
      const map = new Map<string, any>();
      for (const item of idbArray) {
        if (item && item.id) map.set(item.id, item);
      }
      for (const item of lsArray) {
        if (item && item.id) {
          const prev = map.get(item.id);
          map.set(item.id, prev ? { ...prev, ...item } : item);
        }
      }

      const merged = Array.from(map.values());
      if (merged.length > lsArray.length || merged.length > idbArray.length) {
        try {
          localStorage.setItem(key, JSON.stringify(merged));
        } catch {}
        await idbSet(key, merged);
        changed = true;
      } else if (lsArray.length > 0 && idbArray.length === 0) {
        // Assegurar que IndexedDB tem a cópia do LocalStorage
        await idbSet(key, lsArray);
      } else if (lsArray.length === 0 && idbArray.length > 0) {
        // Assegurar que LocalStorage é restaurado a partir do IndexedDB
        try {
          localStorage.setItem(key, JSON.stringify(idbArray));
        } catch {}
        changed = true;
      }
    }

    if (changed) {
      notifyStorageSync();
    }
    return changed;
  } catch (e) {
    console.error('Erro na sincronização e merge de armazenamento:', e);
    return false;
  }
}

/**
 * Alias de compatibilidade
 */
export async function syncFromIndexedDBIfEmpty(): Promise<boolean> {
  return syncAndMergeStorage();
}

/**
 * Gestão de Sessão do Utilizador Ativo
 */
export function saveActiveSession(session: {
  appMode: 'landing' | 'salon' | 'developer';
  salonId: string;
  userId: string;
}): void {
  try {
    const payload: ActiveSession = {
      ...session,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(payload));
    idbSet(STORAGE_KEYS.SESSION, payload).catch(() => {});
  } catch (e) {
    console.error('Erro ao guardar sessão:', e);
  }
}

export function loadActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.salonId && parsed.userId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler sessão ativa:', e);
  }
  return null;
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    idbSet(STORAGE_KEYS.SESSION, null).catch(() => {});
  } catch (e) {
    console.error('Erro ao limpar sessão:', e);
  }
}
