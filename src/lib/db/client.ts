export interface D1PreparedStatement<T = unknown> {
  bind(...values: unknown[]): D1PreparedStatement<T>;
  first<Row = T>(): Promise<Row | null>;
  all<Row = T>(): Promise<{ results: Row[] }>;
  run(): Promise<unknown>;
}

export interface D1DatabaseClient {
  prepare<T = unknown>(query: string): D1PreparedStatement<T>;
}

type GlobalWithD1 = typeof globalThis & {
  DB?: D1DatabaseClient;
  env?: {
    DB?: D1DatabaseClient;
  };
};

export function getDbClient(): D1DatabaseClient | null {
  if (typeof window !== 'undefined') return null;

  try {
    const globalWithD1 = globalThis as GlobalWithD1;
    return globalWithD1.DB ?? globalWithD1.env?.DB ?? null;
  } catch {
    return null;
  }
}

export function hasDbClient(): boolean {
  return getDbClient() !== null;
}
