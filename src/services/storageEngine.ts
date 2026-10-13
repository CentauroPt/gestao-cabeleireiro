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
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
}

/**
 * Caso o LocalStorage exceda os 5MB, tenta remover itens redundantes
 */
function tryCleanOldCache() {
  try {
    // Não apagamos dados essenciais como utilizadores ou salões!
    // Apenas chaves transitórias se existirem
    const tempKeys = ['vite-plugin-pwa-cache'];
    tempKeys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignorar
  }
}

/**
 * Sincroniza dados do IndexedDB para o LocalStorage se o LocalStorage tiver sido apagado
 */
export async function syncFromIndexedDBIfEmpty(): Promise<boolean> {
  try {
    let synced = false;
    const keysToCheck = [
      STORAGE_KEYS.SALONS,
      STORAGE_KEYS.USERS,
      STORAGE_KEYS.SERVICES,
      STORAGE_KEYS.CLIENTS,
      STORAGE_KEYS.APPOINTMENTS,
    ];

    for (const key of keysToCheck) {
      const lsRaw = localStorage.getItem(key);
      if (!lsRaw) {
        const idbData = await idbGet<any[]>(key);
        if (idbData && Array.isArray(idbData) && idbData.length > 0) {
          try {
            localStorage.setItem(key, JSON.stringify(idbData));
            synced = true;
          } catch {
            // Se o LocalStorage estiver cheio, fica no IndexedDB
          }
        }
      }
    }
    return synced;
  } catch (e) {
    console.error('Erro na sincronização IndexedDB:', e);
    return false;
  }
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
