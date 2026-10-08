import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { GavetaState, GavetaStore } from './gavetaStore';

const StoreContext = createContext<GavetaStore | null>(null);

export const StoreProvider = StoreContext.Provider;

export function useGaveta<T>(selector: (s: GavetaState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreProvider missing');
  return useStore(store, selector);
}
