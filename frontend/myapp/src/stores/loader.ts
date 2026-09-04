import { create } from 'zustand';

interface LoaderState {
  loadingCount: number;
  startLoading: () => void;
  stopLoading: () => void;
  isLoading: () => boolean;
}

export const useLoaderStore = create<LoaderState>((set, get) => ({
  loadingCount: 0,
  startLoading: () => set(
    state => ({
      loadingCount: state.loadingCount + 1,
    }),
  ),
  stopLoading: () => set(
    state => ({
      loadingCount: Math.max(0, state.loadingCount - 1),
    }),
  ),
  isLoading: () => get().loadingCount > 0,
}));
