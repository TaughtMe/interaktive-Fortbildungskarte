export type DataSource = 'mock' | 'd1';

const DEFAULT_DATA_SOURCE: DataSource = 'mock';

function normalizeDataSource(value: string | undefined): DataSource {
  return value === 'd1' ? 'd1' : DEFAULT_DATA_SOURCE;
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
  return normalizeDataSource(readConfiguredDataSource());
}

export function isD1DataSource(): boolean {
  return getDataSource() === 'd1';
}
