import { getDb, type SearchIndexRow } from './schema';

export async function loadSerializedIndex(): Promise<SearchIndexRow | undefined> {
  return getDb().search_index.get('main');
}

export async function saveSerializedIndex(json: string, docCount: number): Promise<void> {
  await getDb().search_index.put({ id: 'main', json, docCount, updatedAt: Date.now() });
}

export async function clearSerializedIndex(): Promise<void> {
  await getDb().search_index.delete('main');
}
