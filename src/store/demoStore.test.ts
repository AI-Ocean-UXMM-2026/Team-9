import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import { emptyAppData, type AppData } from '../domain/types';
import { createDemoStore } from './demoStore';
import { PERSISTENCE_VERSION, STORAGE_KEY } from './persistence';

function memoryStorage(initial: string | null = null) {
  const values = new Map<string, string>();
  if (initial !== null) values.set(STORAGE_KEY, initial);
  const storage: StateStorage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };
  return { storage, values };
}

const exampleData = (): AppData => ({
  ...emptyAppData(),
  openingBalance: {
    amount: 125_000,
    referenceAt: '2026-10-21T08:00:00+06:30',
    timeZone: 'Asia/Rangoon',
  },
});

describe('versioned demo persistence', () => {
  it('saves a manual transaction, corrects the same ID, then supports delete and undo', () => {
    const store = createDemoStore(memoryStorage().storage, {
      skipHydration: true,
    });
    store.getState().setOpeningBalance({
      amount: 100_000,
      referenceAt: '2026-10-21T08:00:00+06:30',
      timeZone: 'Asia/Rangoon',
    });
    const record = {
      id: 'manual-1',
      type: 'expense' as const,
      amount: 12_000,
      currency: 'MMK' as const,
      date: '2026-10-21',
      dueDate: '2026-10-22',
      openingDayDisposition: 'after_reference' as const,
      categoryId: 'supplies',
      counterpartyId: null,
      cashStatus: 'pending' as const,
      confirmationStatus: 'not_applicable' as const,
      source: 'manual' as const,
      ocrReviewStatus: 'not_applicable' as const,
      createdAt: '2026-10-21T02:00:00Z',
      updatedAt: '2026-10-21T02:00:00Z',
    };
    store.getState().saveTransaction(record);
    store.getState().saveTransaction({
      ...record,
      amount: 10_000,
      cashStatus: 'settled',
      dueDate: undefined,
      updatedAt: '2026-10-21T03:00:00Z',
    });
    expect(store.getState().data.transactions).toHaveLength(1);
    expect(store.getState().data.transactions[0]).toMatchObject({
      id: 'manual-1',
      amount: 10_000,
      createdAt: record.createdAt,
    });
    const deleted = store.getState().deleteTransaction('manual-1');
    expect(store.getState().data.transactions).toHaveLength(0);
    store.getState().restoreTransaction(deleted!);
    expect(store.getState().data.transactions[0].id).toBe('manual-1');
  });
  it('validates updates and persists the single versioned app-data record', async () => {
    const { storage, values } = memoryStorage();
    const store = createDemoStore(storage, { skipHydration: true });
    await store.persist.rehydrate();
    store.getState().replaceData(exampleData());
    await new Promise((resolve) => setTimeout(resolve, 0));
    const saved = JSON.parse(values.get(STORAGE_KEY)!);
    expect(saved.version).toBe(PERSISTENCE_VERSION);
    expect(saved.state.data.openingBalance.amount).toBe(125_000);
    const restored = createDemoStore(storage, { skipHydration: true });
    await restored.persist.rehydrate();
    expect(restored.getState().data.openingBalance?.amount).toBe(125_000);
    expect(() =>
      store.getState().replaceData({
        ...emptyAppData(),
        transactions: [{}],
      } as unknown as AppData),
    ).toThrow();
    expect(store.getState().data.openingBalance?.amount).toBe(125_000);
  });
  it('resets corrupt JSON and leaves a visible recovery notice', async () => {
    const { storage, values } = memoryStorage('{bad json');
    const store = createDemoStore(storage, { skipHydration: true });
    await store.persist.rehydrate();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.getState().data).toEqual(emptyAppData());
    expect(store.getState().storageNotice).toMatch(/could not be read/);
    expect(JSON.parse(values.get(STORAGE_KEY)!).version).toBe(
      PERSISTENCE_VERSION,
    );
  });
  it('resets unknown versions with a recovery notice', async () => {
    const { storage } = memoryStorage(
      JSON.stringify({ version: 99, state: { legacy: true } }),
    );
    const store = createDemoStore(storage, { skipHydration: true });
    await store.persist.rehydrate();
    expect(store.getState().data).toEqual(emptyAppData());
    expect(store.getState().storageNotice).toContain('version 99');
  });
  it('resets data that fails current schema validation', async () => {
    const { storage } = memoryStorage(
      JSON.stringify({
        version: PERSISTENCE_VERSION,
        state: { data: { transactions: [{}] }, storageNotice: null },
      }),
    );
    const store = createDemoStore(storage, { skipHydration: true });
    await store.persist.rehydrate();
    expect(store.getState().data).toEqual(emptyAppData());
    expect(store.getState().storageNotice).toContain('invalid');
  });
  it('keeps current in-memory data and reports a browser storage write failure', async () => {
    const storage: StateStorage = {
      getItem: async () => null,
      setItem: async () => {
        throw new Error('storage unavailable');
      },
      removeItem: async () => {},
    };
    const store = createDemoStore(storage, { skipHydration: true });
    await store.persist.rehydrate();
    store.getState().replaceData(exampleData());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.getState().data.openingBalance?.amount).toBe(125_000);
    expect(store.getState().storageNotice).toMatch(/could not be saved/);
  });
});
