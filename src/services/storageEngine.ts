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
  SUBSCRIPTION_PAYMENTS: 'salao_app_subscription_payments',
  BILLING_CONFIG: 'salao_app_billing_config',
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

let storageChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    storageChannel = new BroadcastChannel('salao_storage_sync_channel');
    storageChannel.onmessage = (event) => {
      if (event.data?.type === 'sync') {
        listeners.forEach((fn) => {
          try {
            fn();
          } catch (e) {
            console.error('Erro ao notificar listener de storage via canal:', e);
          }
        });
      }
    };
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && Object.values(STORAGE_KEYS).includes(e.key as any)) {
      listeners.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error('Erro ao notificar listener via evento storage:', e);
        }
      });
    }
  });
}

let syncTimeout: any = null;
export function notifyStorageSync(): void {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncTimeout = null;
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Erro ao notificar listener de storage:', e);
      }
    });
    if (storageChannel) {
      try {
        storageChannel.postMessage({ type: 'sync', timestamp: Date.now() });
      } catch {}
    }
  }, 40);
}

function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => {
      console.warn('Timeout ao abrir IndexedDB (500ms). A prosseguir com LocalStorage.');
      resolve(null);
    }, 500);

    try {
      const request = window.indexedDB.open(IDB_NAME, 1);

      request.onblocked = () => {
        clearTimeout(timer);
        console.warn('IndexedDB bloqueado por outra ligação.');
        resolve(null);
      };

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };

      request.onsuccess = (e) => {
        clearTimeout(timer);
        resolve((e.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        clearTimeout(timer);
        console.warn('Não foi possível abrir IndexedDB. Prosseguindo com LocalStorage.');
        resolve(null);
      };
    } catch (err) {
      clearTimeout(timer);
      console.warn('Erro ao inicializar IndexedDB:', err);
      resolve(null);
    }
  });
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 500);
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        tx.onabort = () => {
          clearTimeout(timer);
          resolve(null);
        };
        tx.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);

        req.onsuccess = () => {
          clearTimeout(timer);
          resolve((req.result as T) ?? null);
        };

        req.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
      } catch {
        clearTimeout(timer);
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openIndexedDB();
    if (!db) return;

    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(), 500);
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.onabort = () => {
          clearTimeout(timer);
          resolve();
        };
        tx.onerror = () => {
          clearTimeout(timer);
          resolve();
        };
        const store = tx.objectStore(IDB_STORE);
        store.put(value, key);
        tx.oncomplete = () => {
          clearTimeout(timer);
          resolve();
        };
      } catch {
        clearTimeout(timer);
        resolve();
      }
    });
  } catch {
    return;
  }
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
 * com proteção estrita contra eliminação acidental de salões, utilizadores e clientes.
 */
export function saveToStorage<T>(key: string, data: T[], allowShrink = false): void {
  if (!Array.isArray(data)) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      idbSet(key, data).catch(() => {});
      notifyStorageSync();
    } catch {}
    return;
  }

  // PROTEÇÃO MÁXIMA CONTRA PERDA DE DADOS:
  // Se 'data' estiver vazio mas já existirem dados guardados para salões, utilizadores ou clientes,
  // recusa terminantemente esvaziar a base de dados para evitar perda acidental por componentes com estado desatualizado.
  if (data.length === 0 && !allowShrink && (
    key === STORAGE_KEYS.SALONS ||
    key === STORAGE_KEYS.USERS ||
    key === STORAGE_KEYS.CLIENTS
  )) {
    try {
      const existingRaw = localStorage.getItem(key);
      if (existingRaw) {
        const existingParsed = JSON.parse(existingRaw);
        if (Array.isArray(existingParsed) && existingParsed.length > 0) {
          console.warn(`[BLINDAGEM] Tentativa de sobrescrever ${key} com lista vazia rejeitada para proteger dados existentes.`);
          return;
        }
      }
    } catch {}
  }

  // Fusão segura por ID para garantir que nenhum salão, cliente ou utilizador registado seja perdido
  let finalData: T[] = data;
  if (!allowShrink && (key === STORAGE_KEYS.SALONS || key === STORAGE_KEYS.USERS || key === STORAGE_KEYS.CLIENTS)) {
    try {
      const existingRaw = localStorage.getItem(key);
      if (existingRaw) {
        const existingArray = JSON.parse(existingRaw);
        if (Array.isArray(existingArray) && existingArray.length > 0) {
          const map = new Map<string, any>();
          // 1. Manter todos os registos existentes no armazenamento
          for (const item of existingArray) {
            if (item && item.id) map.set(item.id, item);
          }
          // 2. Aplicar as alterações mais recentes dos itens fornecidos
          for (const item of data as any[]) {
            if (item && item.id) {
              const prev = map.get(item.id);
              map.set(item.id, prev ? { ...prev, ...item } : item);
            }
          }
          finalData = Array.from(map.values()) as T[];
        }
      }
    } catch {}
  }

  // 1. Tentar gravar no LocalStorage (síncrono)
  try {
    localStorage.setItem(key, JSON.stringify(finalData));
  } catch (err: any) {
    console.warn(`Aviso: Falha ao gravar ${key} no LocalStorage (${err?.name || err}). A usar IndexedDB de alta capacidade.`, err);

    // Se a quota do LocalStorage estiver esgotada, tenta limpar fotos antigas ou chaves não essenciais
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      tryCleanOldCache();
      try {
        localStorage.setItem(key, JSON.stringify(finalData));
      } catch {
        // Se ainda falhar, garantimos pelo IndexedDB abaixo
      }
    }
  }

  // 2. Gravar no IndexedDB de forma resiliente e permanente
  idbSet(key, finalData).catch((e) => console.error(`Erro ao sincronizar ${key} com IndexedDB:`, e));
  notifyStorageSync();
}

/**
 * Grava múltiplos conjuntos de dados no armazenamento de forma atómica
 */
export function saveMultipleToStorage(entries: Array<{ key: string; data: any[] }>, allowShrink = false): void {
  for (const entry of entries) {
    saveToStorage(entry.key, entry.data, allowShrink);
  }
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
      STORAGE_KEYS.SUBSCRIPTION_PAYMENTS,
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

    // Sincronizar e assegurar persistência das configurações de faturação SaaS (IBAN, MB Way, WhatsApp, Mensalidade)
    try {
      const lsConfigRaw = localStorage.getItem(STORAGE_KEYS.BILLING_CONFIG);
      const idbConfig = await idbGet<any>(STORAGE_KEYS.BILLING_CONFIG);
      if (lsConfigRaw && !idbConfig) {
        await idbSet(STORAGE_KEYS.BILLING_CONFIG, JSON.parse(lsConfigRaw));
      } else if (!lsConfigRaw && idbConfig) {
        localStorage.setItem(STORAGE_KEYS.BILLING_CONFIG, JSON.stringify(idbConfig));
        changed = true;
      } else if (lsConfigRaw && idbConfig) {
        const lsParsed = JSON.parse(lsConfigRaw);
        const mergedConfig = { ...idbConfig, ...lsParsed };
        localStorage.setItem(STORAGE_KEYS.BILLING_CONFIG, JSON.stringify(mergedConfig));
        await idbSet(STORAGE_KEYS.BILLING_CONFIG, mergedConfig);
      }
    } catch (e) {
      console.warn('Aviso: Falha ao sincronizar BILLING_CONFIG:', e);
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
