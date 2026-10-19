import type { KeyValueStorage } from "../src/services/mock/mock-database";

export function createMemoryStorage(): KeyValueStorage & { dump(): string } {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
    dump: () => JSON.stringify(Object.fromEntries(values))
  };
}
