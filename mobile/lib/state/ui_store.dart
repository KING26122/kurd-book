import 'package:flutter/foundation.dart';

/// UI state flags ported from `apps/web/src/stores/ui.ts`.
class UiStore extends ChangeNotifier {
  bool composerOpen = false;
  bool storyComposerOpen = false;
  bool searchOpen = false;
  bool notificationsOpen = false;
  bool themeMenuOpen = false;

  void openComposer() => _set(composerOpen: true);
  void closeComposer() => _set(composerOpen: false);
  void openStoryComposer() => _set(storyComposerOpen: true);
  void closeStoryComposer() => _set(storyComposerOpen: false);
  void openSearch() => _set(searchOpen: true);
  void closeSearch() => _set(searchOpen: false);
  void openNotifications() => _set(notificationsOpen: true);
  void closeNotifications() => _set(notificationsOpen: false);
  void setThemeMenu(bool open) => _set(themeMenuOpen: open);

  void _set({bool? composerOpen, bool? storyComposerOpen, bool? searchOpen, bool? notificationsOpen, bool? themeMenuOpen}) {
    this.composerOpen = composerOpen ?? this.composerOpen;
    this.storyComposerOpen = storyComposerOpen ?? this.storyComposerOpen;
    this.searchOpen = searchOpen ?? this.searchOpen;
    this.notificationsOpen = notificationsOpen ?? this.notificationsOpen;
    this.themeMenuOpen = themeMenuOpen ?? this.themeMenuOpen;
    notifyListeners();
  }
}

final UiStore uiStore = UiStore();
