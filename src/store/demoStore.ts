import { create } from 'zustand';
import { persist, type StateStorage } from 'zustand/middleware';
import {
  emptyAppData,
  appDataSchema,
  persistedStoreSchema,
  transactionSchema,
  type AppData,
  type PersistedStore,
  type Transaction,
} from '../domain/types';
import {
  browserStorage,
  createSafeJsonStorage,
  PERSISTENCE_VERSION,
  STORAGE_KEY,
} from './persistence';

export interface DemoStore extends PersistedStore {
  replaceData(data: AppData): void;
  setOpeningBalance(openingBalance: AppData['openingBalance']): void;
  saveTransaction(transaction: Transaction): void;
  deleteTransaction(id: string): Transaction | null;
  restoreTransaction(transaction: Transaction): void;
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
      (set, get) => ({
        data: emptyAppData(),
        storageNotice: null,
        replaceData: (data) => {
          const validated = appDataSchema.parse(data);
          set({ data: validated });
        },
        setOpeningBalance: (openingBalance) => {
          const validated = appDataSchema.parse({
            ...get().data,
            openingBalance,
          });
          set({ data: validated });
        },
        saveTransaction: (transaction) => {
          const current = get().data;
          const parsed = transactionSchema.parse(transaction);
          const prior = current.transactions.find(
            (item) => item.id === parsed.id,
          );
          const saved = {
            ...parsed,
            id: prior?.id ?? parsed.id,
            createdAt: prior?.createdAt ?? parsed.createdAt,
            paymentOccurrenceId:
              prior?.paymentOccurrenceId ?? parsed.paymentOccurrenceId,
          };
          const transactions = prior
            ? current.transactions.map((item) =>
                item.id === saved.id ? saved : item,
              )
            : [...current.transactions, saved];
          let paymentOccurrences = current.paymentOccurrences;
          if (saved.paymentOccurrenceId) {
            const now = new Date().toISOString();
            paymentOccurrences = current.paymentOccurrences.map(
              (occurrence) => {
                if (
                  occurrence.id !== saved.paymentOccurrenceId ||
                  occurrence.status === 'scheduled'
                )
                  return occurrence;
                const status =
                  saved.cashStatus === 'pending'
                    ? 'explicitly_unpaid'
                    : saved.confirmationStatus === 'unconfirmed'
                      ? 'assumed_unconfirmed'
                      : 'confirmed_paid';
                const action =
                  status === 'explicitly_unpaid'
                    ? 'marked_unpaid'
                    : status === 'confirmed_paid'
                      ? 'confirmed'
                      : 'corrected';
                return {
                  ...occurrence,
                  status,
                  paymentDate: saved.date,
                  paymentAmount: saved.amount,
                  history: [
                    ...occurrence.history,
                    {
                      action,
                      at: now,
                      previousAmount: occurrence.paymentAmount,
                      previousPaymentDate: occurrence.paymentDate,
                    },
                  ].slice(-100),
                } as typeof occurrence;
              },
            );
          }
          const validated = appDataSchema.parse({
            ...current,
            transactions,
            paymentOccurrences,
          });
          set({ data: validated });
        },
        deleteTransaction: (id): Transaction | null => {
          const current = get().data;
          const transaction = current.transactions.find(
            (item) => item.id === id,
          );
          if (!transaction) return null;
          if (transaction.paymentOccurrenceId)
            throw new Error(
              'A scheduled payment must be corrected through its occurrence.',
            );
          const validated = appDataSchema.parse({
            ...current,
            transactions: current.transactions.filter((item) => item.id !== id),
            duplicateReviews: current.duplicateReviews.filter(
              (review) =>
                review.firstTransactionId !== id &&
                review.secondTransactionId !== id,
            ),
          });
          set({ data: validated });
          return transaction;
        },
        restoreTransaction: (transaction) => {
          const current = get().data;
          if (current.transactions.some((item) => item.id === transaction.id))
            return;
          set({
            data: appDataSchema.parse({
              ...current,
              transactions: [...current.transactions, transaction],
            }),
          });
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
          return {
            ...current,
            ...result.data,
            data: {
              ...result.data.data,
              categories:
                result.data.data.categories.length > 0
                  ? result.data.data.categories
                  : emptyAppData().categories,
            },
          };
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
