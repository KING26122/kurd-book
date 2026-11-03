import { create } from 'zustand';

interface UiStore {
  composerOpen: boolean;
  storyComposerOpen: boolean;
  searchOpen: boolean;
  notificationsOpen: boolean;
  themeMenuOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
  openStoryComposer: () => void;
  closeStoryComposer: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  openNotifications: () => void;
  closeNotifications: () => void;
  setThemeMenu: (open: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  composerOpen: false,
  storyComposerOpen: false,
  searchOpen: false,
  notificationsOpen: false,
  themeMenuOpen: false,
  openComposer: () => set({ composerOpen: true }),
  closeComposer: () => set({ composerOpen: false }),
  openStoryComposer: () => set({ storyComposerOpen: true }),
  closeStoryComposer: () => set({ storyComposerOpen: false }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  openNotifications: () => set({ notificationsOpen: true }),
  closeNotifications: () => set({ notificationsOpen: false }),
  setThemeMenu: (open) => set({ themeMenuOpen: open }),
}));
