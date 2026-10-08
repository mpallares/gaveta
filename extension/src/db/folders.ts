import { newId } from '@/lib/id';
import { getDb, type Folder } from './schema';

export const FOLDER_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#64748b',
] as const;

export class FolderLimitError extends Error {
  constructor(public readonly limit: number) {
    super(`Folder limit reached (${limit})`);
    this.name = 'FolderLimitError';
  }
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  color?: string;
  /** Maximum number of folders allowed in total. */
  limit: number;
}

export async function listFolders(): Promise<Folder[]> {
  const db = getDb();
  const all = await db.folders.toArray();
  return all.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
}

export async function countFolders(): Promise<number> {
  return getDb().folders.count();
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const db = getDb();
  const name = input.name.trim();
  if (name === '') throw new Error('Folder name is empty');
  return db.transaction('rw', db.folders, async () => {
    const count = await db.folders.count();
    if (count >= input.limit) throw new FolderLimitError(input.limit);
    const parentId = input.parentId ?? null;
    if (parentId !== null && !(await db.folders.get(parentId))) {
      throw new Error('Parent folder not found');
    }
    const siblings = await db.folders
      .where('parentId')
      .equals(parentId ?? '')
      .count();
    const now = Date.now();
    const folder: Folder = {
      id: newId(),
      parentId,
      name,
      color: input.color ?? FOLDER_COLORS[count % FOLDER_COLORS.length] ?? FOLDER_COLORS[0],
      order: siblings,
      createdAt: now,
      updatedAt: now,
    };
    await db.folders.add(folder);
    return folder;
  });
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === '') throw new Error('Folder name is empty');
  const updated = await getDb().folders.update(id, { name: trimmed, updatedAt: Date.now() });
  if (updated === 0) throw new Error('Folder not found');
}

export async function setFolderColor(id: string, color: string): Promise<void> {
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Invalid colour');
  await getDb().folders.update(id, { color, updatedAt: Date.now() });
}

/** Ids of `id` and every descendant folder. */
export async function collectSubtree(id: string): Promise<string[]> {
  const db = getDb();
  const result: string[] = [];
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    result.push(current);
    const children = await db.folders.where('parentId').equals(current).primaryKeys();
    queue.push(...children);
  }
  return result;
}

/** Deletes the folder and all sub-folders. Conversations inside become unfiled. */
export async function deleteFolder(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.folders, db.folder_items, async () => {
    const ids = await collectSubtree(id);
    await db.folder_items.where('folderId').anyOf(ids).delete();
    await db.folders.bulkDelete(ids);
  });
}

/** Moves a folder under a new parent, refusing cycles. */
export async function moveFolder(id: string, parentId: string | null): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.folders, async () => {
    if (parentId !== null) {
      const subtree = await collectSubtree(id);
      if (subtree.includes(parentId)) throw new Error('Cannot move a folder into itself');
      if (!(await db.folders.get(parentId))) throw new Error('Parent folder not found');
    }
    await db.folders.update(id, { parentId, updatedAt: Date.now() });
  });
}
