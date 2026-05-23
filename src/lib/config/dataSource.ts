export type DataSource = 'mock' | 'd1' | 'postgres';

const DEFAULT_DATA_SOURCE: DataSource = 'mock';

function normalizeDataSource(value: string | undefined): DataSource {
  if (value === 'postgres') return 'postgres';
  if (value === 'd1') return 'd1';
  return DEFAULT_DATA_SOURCE;
}

function readConfiguredDataSource(): string | undefined {
  if (typeof process === 'undefined') return undefined;

  return (
    process.env.NEXT_PUBLIC_DATA_SOURCE ??
    process.env.DATA_SOURCE ??
    process.env.APP_DATA_SOURCE
  );
}

export function getDataSource(): DataSource {
  // Mock remains the safe default; D1 is only a prepared alternative path.
  return normalizeDataSource(readConfiguredDataSource());
}

export function isD1DataSource(): boolean {
  return getDataSource() === 'd1';
}

export function isPostgresDataSource(): boolean {
  return getDataSource() === 'postgres';
}
