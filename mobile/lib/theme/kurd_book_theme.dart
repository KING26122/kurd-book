import 'package:flutter/material.dart';

enum KurdbookThemeId { dark, moredark, rush, gold }

/// Kurdish Book design tokens — a faithful port of the CSS custom properties
/// from `apps/web/src/index.css` (themes: dark, moredark, rush, gold).
///
/// Colors are stored as opaque ARGB values (0xAARRGGBB) so translucent design
/// tokens (borders, glows, glassy surfaces) keep their exact alpha.
class KurdbookPalette {
  const KurdbookPalette({
    required this.bg,
    required this.bgElev,
    required this.surface,
    required this.surfaceSolid,
    required this.surface2,
    required this.surface3,
    required this.text,
    required this.textStrong,
    required this.muted,
    required this.muted2,
    required this.border,
    required this.borderStrong,
    required this.primary,
    required this.primaryStrong,
    required this.primaryFg,
    required this.accent,
    required this.accent2,
    required this.danger,
    required this.dangerSoft,
    required this.success,
    required this.glow,
    required this.gradient,
    required this.gradientSoft,
    required this.chatWallpaper,
    required this.shadow,
  });

  final Color bg;
  final Color bgElev;
  final Color surface;
  final Color surfaceSolid;
  final Color surface2;
  final Color surface3;
  final Color text;
  final Color textStrong;
  final Color muted;
  final Color muted2;
  final Color border;
  final Color borderStrong;
  final Color primary;
  final Color primaryStrong;
  final Color primaryFg;
  final Color accent;
  final Color accent2;
  final Color danger;
  final Color dangerSoft;
  final Color success;
  final Color glow;
  final List<Color> gradient;
  final List<Color> gradientSoft;
  final List<Color> chatWallpaper;
  final Color shadow;

  static KurdbookPalette of(KurdbookThemeId id) {
    switch (id) {
      case KurdbookThemeId.moredark:
        return KurdbookPalette(
          bg: Color(0xFF000000),
          bgElev: Color(0xFF050505),
          surface: Color(0xFF0A0A0A).withValues(alpha: 0.92),
          surfaceSolid: Color(0xFF0A0A0A),
          surface2: Color(0xFF111111),
          surface3: Color(0xFF191919),
          text: Color(0xFFF4F4F4),
          textStrong: Color(0xFFFFFFFF),
          muted: Color(0xFF909090),
          muted2: Color(0xFF626262),
          border: Color(0x33FFFFFF),
          borderStrong: Color(0x44FFFFFF),
          primary: Color(0xFFC8FF6B),
          primaryStrong: Color(0xFFB0F043),
          primaryFg: Color(0xFF0A1300),
          accent: Color(0xFFF2E8C9),
          accent2: Color(0xFFA7A7A7),
          danger: Color(0xFFFF5D5D),
          dangerSoft: Color(0x1FFF5D5D),
          success: Color(0xFFA6F56A),
          glow: Color(0x3DC8FF6B),
          gradient: [Color(0xFFC8FF6B), Color(0xFFF5F2E6), Color(0xFF999999)],
          gradientSoft: [Color(0x33C8FF6B), Color(0x0DFFFFFF)],
          chatWallpaper: [Color(0x0CC8FF6B), Color(0x0AFFFFFF), Color(0x0D000000)],
          shadow: Color(0xB3000000),
        );
      case KurdbookThemeId.rush:
        return KurdbookPalette(
          bg: Color(0xFF0C0618),
          bgElev: Color(0xFF100822),
          surface: Color(0xFF190C2B).withValues(alpha: 0.82),
          surfaceSolid: Color(0xFF190D2D),
          surface2: Color(0xFF24113F),
          surface3: Color(0xFF331A54),
          text: Color(0xFFF7EFFF),
          textStrong: Color(0xFFFFFFFF),
          muted: Color(0xFFAE97C9),
          muted2: Color(0xFF7D6598),
          border: Color(0x29CE9CFF),
          borderStrong: Color(0x4DCE9CFF),
          primary: Color(0xFFB45BFF),
          primaryStrong: Color(0xFF9B36F0),
          primaryFg: Color(0xFF170025),
          accent: Color(0xFF3CF2E3),
          accent2: Color(0xFFFF5FB7),
          danger: Color(0xFFFF668F),
          dangerSoft: Color(0x1FFF668F),
          success: Color(0xFF50F0C8),
          glow: Color(0x70B45BFF),
          gradient: [Color(0xFFFF4FD8), Color(0xFF8B5BFF), Color(0xFF3CF2E3)],
          gradientSoft: [Color(0x291F4FD8), Color(0x193CF2E3)],
          chatWallpaper: [Color(0x0FFF4FD8), Color(0x0F3CF2E3), Color(0x0C060C18)],
          shadow: Color(0x7F9B36F0),
        );
      case KurdbookThemeId.gold:
        return KurdbookPalette(
          bg: Color(0xFF0B0905),
          bgElev: Color(0xFF100D07),
          surface: Color(0xFF19140B).withValues(alpha: 0.84),
          surfaceSolid: Color(0xFF181309),
          surface2: Color(0xFF221A0D),
          surface3: Color(0xFF2E2312),
          text: Color(0xFFFBF5E6),
          textStrong: Color(0xFFFFFDF6),
          muted: Color(0xFFB6A580),
          muted2: Color(0xFF85775A),
          border: Color(0x2EE8C56B),
          borderStrong: Color(0x5CE8C56B),
          primary: Color(0xFFE8C56B),
          primaryStrong: Color(0xFFD6AD48),
          primaryFg: Color(0xFF1D1503),
          accent: Color(0xFFFFF1BF),
          accent2: Color(0xFFC98F47),
          danger: Color(0xFFFF7D6E),
          dangerSoft: Color(0x1FFF7D6E),
          success: Color(0xFFCBE08B),
          glow: Color(0x59E8C56B),
          gradient: [Color(0xFFF9EDC5), Color(0xFFE8C56B), Color(0xFFB07A2D)],
          gradientSoft: [Color(0x2EF9EDC5), Color(0x14B07A2D)],
          chatWallpaper: [Color(0x0CF9EDC5), Color(0x14B07A2D), Color(0x0C090B05)],
          shadow: Color(0xB3000000),
        );
      case KurdbookThemeId.dark:
      return KurdbookPalette(
        bg: Color(0xFF07101D),
        bgElev: Color(0xFF09172A),
        surface: Color(0xFF0D1C30).withValues(alpha: 0.82),
        surfaceSolid: Color(0xFF0F1F35),
        surface2: Color(0xFF142741),
        surface3: Color(0xFF1A3150),
        text: Color(0xFFEFF6FF),
        textStrong: Color(0xFFFFFFFF),
        muted: Color(0xFF8EA2BD),
        muted2: Color(0xFF617692),
        border: Color(0x2694B8DC),
        borderStrong: Color(0x4014B8DC),
        primary: Color(0xFF39E0B2),
        primaryStrong: Color(0xFF19C99A),
        primaryFg: Color(0xFF032018),
        accent: Color(0xFFF3CC6D),
        accent2: Color(0xFFF0835D),
        danger: Color(0xFFFF6B83),
        dangerSoft: Color(0x1FFF6B83),
        success: Color(0xFF41D99A),
        glow: Color(0x6139E0B2),
        gradient: [Color(0xFF39E0B2), Color(0xFFF3CC6D), Color(0xFFF0835D)],
        gradientSoft: [Color(0x2939E0B2), Color(0x1FF3CC6D)],
        chatWallpaper: [Color(0x0C39E0B2), Color(0x0AF3CC6D), Color(0x0C07101D)],
        shadow: Color(0xE6000000),
      );
    }
  }
}

class KurdbookTheme {
  static ThemeData build(KurdbookThemeId id) {
    final p = KurdbookPalette.of(id);
    final colorScheme = ColorScheme.dark(
      primary: p.primary,
      onPrimary: p.primaryFg,
      primaryContainer: p.surface3,
      onPrimaryContainer: p.text,
      secondary: p.accent2,
      onSecondary: p.textStrong,
      secondaryContainer: p.surface2,
      onSecondaryContainer: p.text,
      tertiary: p.accent,
      onTertiary: p.textStrong,
      tertiaryContainer: p.surface2,
      onTertiaryContainer: p.text,
      error: p.danger,
      onError: p.textStrong,
      surface: p.surfaceSolid,
      onSurface: p.text,
      surfaceContainerHighest: p.surface2,
      onSurfaceVariant: p.text,
      outline: p.border,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: p.bg,
      cardColor: p.surfaceSolid,
      dividerColor: p.border,
      splashFactory: InkSparkle.splashFactory,
      fontFamily: 'Noto Kufi Arabic',
      fontFamilyFallback: ['Tahoma', 'Noto Naskh Arabic', 'system-ui', 'sans-serif'],
      textTheme: _textTheme(p),
      appBarTheme: AppBarTheme(
        backgroundColor: p.bg.withValues(alpha: 0.8),
        foregroundColor: p.text,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: _textStyle(p, 22, FontWeight.w900, p.textStrong, height: 1.25),
        iconTheme: IconThemeData(color: p.muted, size: 24),
        actionsIconTheme: IconThemeData(color: p.muted, size: 24),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Color(0xFF0F1F35).withValues(alpha: 0.82),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Color(0x2614B8DC)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Color(0x2614B8DC)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Color(0xFF39E0B2).withValues(alpha: 0.55)),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Color(0xFFFF6B83)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        hintStyle: TextStyle(color: Color(0xFF617692), fontFamily: 'Noto Kufi Arabic'),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Color(0xFF142741),
          foregroundColor: Color(0xFFEFF6FF),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: Color(0xFF1A3150),
        contentTextStyle: TextStyle(color: Color(0xFFEFF6FF), fontFamily: 'Noto Kufi Arabic'),
        behavior: SnackBarBehavior.floating,
      ),
      dividerTheme: const DividerThemeData(color: Color(0x2614B8DC), thickness: 1),
    );
  }

  static TextStyle _textStyle(
    KurdbookPalette p,
    double fontSize,
    FontWeight fontWeight,
    Color color, {
    double? height,
  }) {
    return TextStyle(
      fontFamily: 'Noto Kufi Arabic',
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      height: height,
    );
  }

  static TextTheme _textTheme(KurdbookPalette p) {
    return TextTheme(
      displayLarge: _textStyle(p, 36, FontWeight.w900, p.textStrong, height: 1.2),
      displayMedium: _textStyle(p, 28, FontWeight.w800, p.textStrong, height: 1.25),
      displaySmall: _textStyle(p, 24, FontWeight.w800, p.textStrong, height: 1.3),
      headlineLarge: _textStyle(p, 22, FontWeight.w800, p.textStrong, height: 1.3),
      headlineMedium: _textStyle(p, 20, FontWeight.w800, p.textStrong, height: 1.35),
      headlineSmall: _textStyle(p, 18, FontWeight.w800, p.textStrong, height: 1.4),
      titleLarge: _textStyle(p, 17, FontWeight.w700, p.textStrong, height: 1.4),
      titleMedium: _textStyle(p, 15, FontWeight.w700, p.textStrong, height: 1.45),
      titleSmall: _textStyle(p, 13, FontWeight.w700, p.textStrong, height: 1.5),
      bodyLarge: _textStyle(p, 16, FontWeight.w500, p.text, height: 1.55),
      bodyMedium: _textStyle(p, 14, FontWeight.w400, p.text, height: 1.6),
      bodySmall: _textStyle(p, 12, FontWeight.w400, p.muted, height: 1.55),
      labelLarge: _textStyle(p, 14, FontWeight.w700, p.text, height: 1.4),
      labelMedium: _textStyle(p, 12, FontWeight.w700, p.text, height: 1.45),
      labelSmall: _textStyle(p, 11, FontWeight.w700, p.muted, height: 1.45),
    );
  }
}
