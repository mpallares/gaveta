import { describe, expect, it } from 'vitest';
import {
  addToFolder,
  createFolder,
  deleteFolder,
  FolderLimitError,
  getItem,
  listFolders,
  listItemsInFolder,
  listPinned,
  markIndexed,
  moveFolder,
  removeFromFolder,
  renameFolder,
  setFolderColor,
  setPinned,
  upsertSummaries,
} from '@/db';

describe('folders', () => {
  it('creates, renames, recolours and lists folders in order', async () => {
    const a = await createFolder({ name: 'Work', limit: 5 });
    const b = await createFolder({ name: 'Home', limit: 5 });
    await renameFolder(a.id, 'Work stuff');
    await setFolderColor(b.id, '#ef4444');
    const folders = await listFolders();
    expect(folders.map((f) => f.name)).toEqual(['Work stuff', 'Home']);
    expect(folders[1]?.color).toBe('#ef4444');
  });

  it('nests sub-folders and refuses cycles', async () => {
    const root = await createFolder({ name: 'Root', limit: 10 });
    const child = await createFolder({ name: 'Child', parentId: root.id, limit: 10 });
    expect(child.parentId).toBe(root.id);
    await expect(moveFolder(root.id, child.id)).rejects.toThrow(/into itself/);
    await moveFolder(child.id, null);
    expect((await listFolders()).find((f) => f.id === child.id)?.parentId).toBeNull();
  });

  it('enforces the free-tier limit', async () => {
    for (let i = 0; i < 5; i += 1) await createFolder({ name: `F${i}`, limit: 5 });
    await expect(createFolder({ name: 'Sixth', limit: 5 })).rejects.toBeInstanceOf(
      FolderLimitError,
    );
    expect((await listFolders()).length).toBe(5);
  });

  it('rejects empty names and invalid colours', async () => {
    await expect(createFolder({ name: '   ', limit: 5 })).rejects.toThrow(/empty/);
    const f = await createFolder({ name: 'X', limit: 5 });
    await expect(setFolderColor(f.id, 'red')).rejects.toThrow(/colour/);
  });

  it('deleting a folder removes its subtree and unfiles the chats', async () => {
    const root = await createFolder({ name: 'Root', limit: 10 });
    const child = await createFolder({ name: 'Child', parentId: root.id, limit: 10 });
    await addToFolder('mock', 'c1', root.id);
    await addToFolder('mock', 'c2', child.id);
    await deleteFolder(root.id);
    expect(await listFolders()).toEqual([]);
    expect(await getItem('mock:c1')).toBeUndefined();
    expect(await getItem('mock:c2')).toBeUndefined();
  });
});

describe('folder items', () => {
  it('a conversation lives in one folder at a time', async () => {
    const a = await createFolder({ name: 'A', limit: 5 });
    const b = await createFolder({ name: 'B', limit: 5 });
    await addToFolder('mock', 'c1', a.id);
    await addToFolder('mock', 'c1', b.id);
    expect(await listItemsInFolder(a.id)).toHaveLength(0);
    expect((await listItemsInFolder(b.id)).map((i) => i.conversationId)).toEqual(['c1']);
    await removeFromFolder('mock:c1');
    expect(await listItemsInFolder(b.id)).toHaveLength(0);
  });

  it('refuses unknown folders', async () => {
    await expect(addToFolder('mock', 'c1', 'nope')).rejects.toThrow(/not found/);
  });
});

describe('conversation metadata', () => {
  it('reports stale conversations and keeps pins across upserts', async () => {
    const first = await upsertSummaries('mock', [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 10 },
      { id: 'c2', title: 'Two', createdAt: 2, updatedAt: 20 },
    ]);
    expect(first).toEqual(['mock:c1', 'mock:c2']);

    await markIndexed('mock:c1', { updatedAt: 10, messageCount: 2, preview: 'hi' });
    await markIndexed('mock:c2', { updatedAt: 20, messageCount: 4, preview: 'yo' });
    await setPinned('mock:c2', true);

    const second = await upsertSummaries('mock', [
      { id: 'c1', title: 'One', createdAt: 1, updatedAt: 10 },
      { id: 'c2', title: 'Two (edited)', createdAt: 2, updatedAt: 25 },
    ]);
    expect(second).toEqual(['mock:c2']);

    const pinned = await listPinned('mock');
    expect(pinned.map((p) => p.title)).toEqual(['Two (edited)']);
    expect(pinned[0]?.messageCount).toBe(4);
  });
});
