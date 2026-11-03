import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../theme/kurd_book_theme.dart';

/// Global theme store instance shared across the native client.
final ThemeStore themeStore = ThemeStore();

/// Persisted app theme — mirrors `apps/web/src/stores/theme.ts`.
class ThemeStore extends ChangeNotifier {
  KurdbookThemeId theme = KurdbookThemeId.dark;

  static const String _key = 'kurdbook_theme';

  Future<void> load() async {
    try {
      final value = await FlutterSecureStorage().read(key: _key);
      if (value != null) {
        for (final candidate in KurdbookThemeId.values) {
          if (candidate.name == value) {
            theme = candidate;
            break;
          }
        }
      }
    } catch (_) {
      // ignore
    }
  }

  Future<void> setTheme(KurdbookThemeId value) async {
    theme = value;
    notifyListeners();
    try {
      await FlutterSecureStorage().write(key: _key, value: value.name);
    } catch (_) {
      // ignore
    }
  }
}
