import { createJSONStorage, type StateStorage } from 'zustand/middleware';

export const STORAGE_KEY = 'fintech-companion-demo-v1';
export const PERSISTENCE_VERSION = 1;
const MAX_STORAGE_CHARS = 5_000_000;

export function createSafeJsonStorage(
  storage: StateStorage,
  reportReadFailure: (message: string) => void,
) {
  let writeFailureReported = false;
  const reportWriteFailure = () => {
    if (writeFailureReported) return;
    writeFailureReported = true;
    reportReadFailure(
      'Demo data could not be saved in this browser. Check local storage availability.',
    );
  };
  const guardedStorage: StateStorage = {
    getItem: async (name) => {
      try {
        const item = await storage.getItem(name);
        if (item && item.length > MAX_STORAGE_CHARS) {
          reportReadFailure(
            'Saved demo data was too large and has been reset.',
          );
          await storage.removeItem(name);
          return null;
        }
        return item;
      } catch {
        reportReadFailure(
          'Saved demo data could not be read. The prototype is using an empty demo workspace.',
        );
        return null;
      }
    },
    setItem: async (name, value) => {
      try {
        if (value.length > MAX_STORAGE_CHARS)
          throw new Error('Demo data exceeds the storage limit.');
        await storage.setItem(name, value);
      } catch {
        reportWriteFailure();
      }
    },
    removeItem: async (name) => {
      try {
        await storage.removeItem(name);
      } catch {
        reportReadFailure(
          'Saved demo data could not be removed from this browser.',
        );
      }
    },
  };

  return createJSONStorage(() => guardedStorage);
}

export const browserStorage: StateStorage = {
  getItem: (name) => window.localStorage.getItem(name),
  setItem: (name, value) => window.localStorage.setItem(name, value),
  removeItem: (name) => window.localStorage.removeItem(name),
};
