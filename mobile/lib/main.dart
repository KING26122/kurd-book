import 'package:flutter/material.dart';

import 'app.dart';
import 'theme/kurd_book_theme.dart';
import 'widgets/kurdbook_widgets.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  KurdbookThemeState.current = KurdbookPalette.of(KurdbookThemeId.dark);
  runApp(const KurdbookApp());
}
