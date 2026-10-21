import { create } from 'zustand';
import { persist, type StateStorage } from 'zustand/middleware';
import {
  emptyAppData,
  appDataSchema,
  persistedStoreSchema,
  type AppData,
  type PersistedStore,
} from '../domain/types';
import {
  browserStorage,
  createSafeJsonStorage,
  PERSISTENCE_VERSION,
  STORAGE_KEY,
} from './persistence';

export interface DemoStore extends PersistedStore {
  replaceData(data: AppData): void;
  dismissStorageNotice(): void;
}

export function createDemoStore(
  backingStorage: StateStorage = browserStorage,
  options: { skipHydration?: boolean } = {},
) {
  const jsonStorage = createSafeJsonStorage(backingStorage, (message) => {
    store.setState({ storageNotice: message });
  });

  const store = create<DemoStore>()(
    persist(
      (set) => ({
        data: emptyAppData(),
        storageNotice: null,
        replaceData: (data) => {
          const validated = appDataSchema.parse(data);
          set({ data: validated });
        },
        dismissStorageNotice: () => set({ storageNotice: null }),
      }),
      {
        name: STORAGE_KEY,
        version: PERSISTENCE_VERSION,
        storage: jsonStorage,
        skipHydration: options.skipHydration,
        partialize: (state) =>
          ({
            data: state.data,
            storageNotice: state.storageNotice,
          }) as DemoStore,
        migrate: (_persistedState, previousVersion) => ({
          data: emptyAppData(),
          storageNotice: `Saved demo data version ${previousVersion} was unsupported and has been reset.`,
        }),
        merge: (persisted, current) => {
          const result = persistedStoreSchema.safeParse(persisted);
          if (!result.success) {
            void Promise.resolve(backingStorage.removeItem(STORAGE_KEY)).catch(
              () => {},
            );
            return {
              ...current,
              data: emptyAppData(),
              storageNotice: 'Saved demo data was invalid and has been reset.',
            };
          }
          return { ...current, ...result.data };
        },
        onRehydrateStorage: () => (_state, error) => {
          if (error) {
            void Promise.resolve(backingStorage.removeItem(STORAGE_KEY)).catch(
              () => {},
            );
            store.setState({
              data: emptyAppData(),
              storageNotice:
                'Saved demo data could not be read and has been reset.',
            });
          }
        },
      },
    ),
  );
  return store;
}

export const useDemoStore = createDemoStore();
