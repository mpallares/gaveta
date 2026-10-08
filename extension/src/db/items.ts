import { conversationKey, type ConversationKey, type VendorId } from '@gaveta/shared';
import { getDb, type FolderItem } from './schema';

export async function listItems(): Promise<FolderItem[]> {
  return getDb().folder_items.toArray();
}

export async function listItemsInFolder(folderId: string): Promise<FolderItem[]> {
  const items = await getDb().folder_items.where('folderId').equals(folderId).toArray();
  return items.sort((a, b) => a.order - b.order || b.addedAt - a.addedAt);
}

/** Puts a conversation in a folder, moving it if it was already somewhere else. */
export async function addToFolder(
  vendorId: VendorId,
  conversationId: string,
  folderId: string,
): Promise<FolderItem> {
  const db = getDb();
  return db.transaction('rw', db.folders, db.folder_items, async () => {
    if (!(await db.folders.get(folderId))) throw new Error('Folder not found');
    const order = await db.folder_items.where('folderId').equals(folderId).count();
    const item: FolderItem = {
      id: conversationKey(vendorId, conversationId),
      folderId,
      vendorId,
      conversationId,
      order,
      addedAt: Date.now(),
    };
    await db.folder_items.put(item);
    return item;
  });
}

export async function removeFromFolder(key: ConversationKey): Promise<void> {
  await getDb().folder_items.delete(key);
}

export async function getItem(key: ConversationKey): Promise<FolderItem | undefined> {
  return getDb().folder_items.get(key);
}
