import 'package:flutter/material.dart';

import '../theme/kurd_book_theme.dart';

/// Shared Kurd Book design-system widgets — a port of the `@layer components`
/// classes from `apps/web/src/index.css` (glass panels, buttons, inputs, chips,
/// tabs, skeletons, story rings, badges, aurora background, toasts).

/// Holds the currently selected design theme inside the widget tree so that
/// small design components can read tokens without a widget rebuild.
class KurdbookThemeState {
  static KurdbookPalette current = KurdbookPalette.of(KurdbookThemeId.dark);

  static void setPalette(KurdbookPalette palette) => current = palette;
}

class KurdbookGradients {
  static LinearGradient linear(List<Color> colors, {Alignment begin = Alignment.topLeft, Alignment end = Alignment.bottomRight}) {
    final stops = List<double>.generate(colors.length, (i) => i / (colors.length - 1));
    return LinearGradient(begin: begin, end: end, stops: stops, colors: colors);
  }
}

class AuroraBackground extends StatelessWidget {
  const AuroraBackground({super.key, this.child, this.palette});

  final Widget? child;
  final KurdbookPalette? palette;

  @override
  Widget build(BuildContext context) {
    final p = palette ?? KurdbookThemeState.current;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: p.bg,
        gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [p.bg, p.bgElev]),
      ),
      child: Stack(
        children: [
          Positioned(top: -140, right: -120, child: _Glow(color: p.glow, size: 340)),
          Positioned(top: -80, left: -140, child: _Glow(color: p.glow, size: 300)),
          Positioned(bottom: -160, left: -100, child: _Glow(color: p.glow, size: 360, opacity: 0.5)),
          if (child != null) Positioned.fill(child: child!),
        ],
      ),
    );
  }
}

class _Glow extends StatelessWidget {
  const _Glow({required this.color, required this.size, this.opacity = 0.16});

  final Color color;
  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color.withValues(alpha: opacity)),
    );
  }
}

class GlassPanel extends StatelessWidget {
  const GlassPanel({super.key, required this.child, this.padding = 0.0});

  final Widget child;
  final double padding;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return Container(
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: p.surface,
        border: Border(
          top: BorderSide(color: p.border),
          bottom: BorderSide(color: p.border),
          left: BorderSide(color: p.border),
          right: BorderSide(color: p.border),
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: p.shadow, blurRadius: 70, offset: const Offset(0, 24))],
      ),
      child: child,
    );
  }
}

enum BtnVariant { primary, soft, ghost, danger }

class Btn extends StatelessWidget {
  const Btn({
    super.key,
    required this.child,
    this.onPressed,
    this.variant = BtnVariant.soft,
    this.icon,
    this.full = false,
    this.padding,
  });

  final Widget child;
  final VoidCallback? onPressed;
  final BtnVariant variant;
  final Widget? icon;
  final bool full;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    final radius = BorderRadius.circular(16);
    Widget content = child;
    if (icon != null) {
      content = Row(mainAxisSize: MainAxisSize.min, children: [icon!, const SizedBox(width: 8), child]);
    }

    return SizedBox(
      width: full ? double.infinity : null,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: radius,
          child: Container(
            padding: padding ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: variant == BtnVariant.primary ? null : variant == BtnVariant.soft ? p.surface2 : variant == BtnVariant.danger ? p.dangerSoft : Colors.transparent,
              gradient: variant == BtnVariant.primary ? KurdbookGradients.linear(p.gradient) : null,
              borderRadius: radius,
              border: variant == BtnVariant.soft || variant == BtnVariant.danger
                  ? Border(
                      top: BorderSide(color: variant == BtnVariant.danger ? p.danger.withValues(alpha: 0.28) : p.border),
                      bottom: BorderSide(color: variant == BtnVariant.danger ? p.danger.withValues(alpha: 0.28) : p.border),
                      left: BorderSide(color: variant == BtnVariant.danger ? p.danger.withValues(alpha: 0.28) : p.border),
                      right: BorderSide(color: variant == BtnVariant.danger ? p.danger.withValues(alpha: 0.28) : p.border),
                    )
                  : null,
            ),
            child: Center(child: content),
          ),
        ),
      ),
    );
  }
}

class IconBtn extends StatelessWidget {
  const IconBtn({super.key, required this.child, this.onPressed, this.size = 40});

  final Widget child;
  final VoidCallback? onPressed;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        customBorder: const CircleBorder(),
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.transparent,
          ),
          child: Center(
            child: IconTheme.merge(
              data: IconThemeData(color: p.muted, size: size * 0.5),
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}

class KbInput extends StatelessWidget {
  const KbInput({super.key, required this.controller, required this.hint, this.obscure = false, this.keyboardType, this.maxLines = 1});

  final TextEditingController controller;
  final String hint;
  final bool obscure;
  final TextInputType? keyboardType;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return TextField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      maxLines: maxLines,
      textAlign: TextAlign.right,
      style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 14, color: p.text),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: p.muted2, fontFamily: 'Noto Kufi Arabic'),
        filled: true,
        fillColor: const Color(0xFF0F1F35).withValues(alpha: 0.82),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: const Color(0x2614B8DC))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: const Color(0x2614B8DC))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Color(0xFF39E0B2).withValues(alpha: 0.55))),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      ),
    );
  }
}

class KbTextArea extends StatelessWidget {
  const KbTextArea({super.key, required this.controller, required this.hint, this.minLines = 3});

  final TextEditingController controller;
  final String hint;
  final int minLines;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return TextField(
      controller: controller,
      minLines: minLines,
      textAlign: TextAlign.right,
      style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 14, color: p.text),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: p.muted2, fontFamily: 'Noto Kufi Arabic'),
        filled: true,
        fillColor: const Color(0xFF0F1F35).withValues(alpha: 0.82),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: const Color(0x2614B8DC))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: const Color(0x2614B8DC))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Color(0xFF39E0B2).withValues(alpha: 0.55))),
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      ),
    );
  }
}

class KbLabel extends StatelessWidget {
  const KbLabel({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return Text(
      text,
      textAlign: TextAlign.right,
      style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, fontWeight: FontWeight.w700, color: p.muted, height: 1.45),
    );
  }
}

class KbChip extends StatelessWidget {
  const KbChip({super.key, required this.label, this.active = false, this.onTap});

  final String label;
  final bool active;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border(
              top: BorderSide(color: active ? p.primary.withValues(alpha: 0.35) : p.border),
              bottom: BorderSide(color: active ? p.primary.withValues(alpha: 0.35) : p.border),
              left: BorderSide(color: active ? p.primary.withValues(alpha: 0.35) : p.border),
              right: BorderSide(color: active ? p.primary.withValues(alpha: 0.35) : p.border),
            ),
            color: active ? p.primary.withValues(alpha: 0.1) : p.surface2,
          ),
          child: Text(
            label,
            style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 11, fontWeight: FontWeight.w700, color: active ? p.primary : p.muted),
          ),
        ),
      ),
    );
  }
}

class KbTabRow extends StatelessWidget {
  const KbTabRow({super.key, required this.tabs, this.activeIndex = 0, this.onChange});

  final List<String> tabs;
  final int activeIndex;
  final ValueChanged<int>? onChange;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: p.bgElev.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(16),
        border: Border(
          top: BorderSide(color: p.border),
          bottom: BorderSide(color: p.border),
          left: BorderSide(color: p.border),
          right: BorderSide(color: p.border),
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: List.generate(tabs.length, (i) {
            final active = i == activeIndex;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onChange == null ? null : () => onChange!(i),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: active ? p.surface2 : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: active ? <BoxShadow>[BoxShadow(color: const Color(0x66000000))] : null,
                    ),
                    child: Text(
                      tabs[i],
                      style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, fontWeight: FontWeight.w700, color: active ? p.text : p.muted),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

class KbDivider extends StatelessWidget {
  const KbDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return Container(height: 1, color: p.border);
  }
}

class KbSkeleton extends StatelessWidget {
  const KbSkeleton({super.key, this.height = 14, this.width = 140});

  final double height;
  final double width;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.all(Radius.circular(12)),
        gradient: SweepGradient(
          colors: [
            Color(0xFF0F1F35),
            Color(0xFF142741),
            Color(0xFF0F1F35),
          ],
        ),
      ),
    );
  }
}

class StoryRing extends StatelessWidget {
  const StoryRing({super.key, required this.child, this.viewed = false, this.size = 56});

  final Widget child;
  final bool viewed;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return Container(
      width: size + 5,
      height: size + 5,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: KurdbookGradients.linear(p.gradient),
        boxShadow: [BoxShadow(color: p.glow, blurRadius: 18)],
      ),
      padding: const EdgeInsets.all(2.5),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: p.surface2,
          border: Border(
          top: BorderSide(color: viewed ? p.surface3 : p.borderStrong, width: 1),
          bottom: BorderSide(color: viewed ? p.surface3 : p.borderStrong, width: 1),
          left: BorderSide(color: viewed ? p.surface3 : p.borderStrong, width: 1),
          right: BorderSide(color: viewed ? p.surface3 : p.borderStrong, width: 1),
        ),
        ),
        child: Center(child: child),
      ),
    );
  }
}

class ProPill extends StatelessWidget {
  const ProPill({super.key});

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        gradient: KurdbookGradients.linear(p.gradientSoft),
        border: Border(
          top: BorderSide(color: const Color(0x33E8C56B)),
          bottom: BorderSide(color: const Color(0x33E8C56B)),
          left: BorderSide(color: const Color(0x33E8C56B)),
          right: BorderSide(color: const Color(0x33E8C56B)),
        ),
      ),
      child: Text(
        'PRO',
        style: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFFF4D786)),
      ),
    );
  }
}

class VerifiedCrown extends StatelessWidget {
  const VerifiedCrown({super.key});

  @override
  Widget build(BuildContext context) {
    return const Icon(Icons.verified, size: 12, color: Color(0xFFEFC65D));
  }
}

class KurdbookAvatar extends StatelessWidget {
  const KurdbookAvatar({super.key, this.url, required this.name, this.size = 44, this.showOnline = false});

  final String? url;
  final String name;
  final double size;
  final bool showOnline;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    final initial = name.trim().isEmpty ? 'ک' : name.trim().characters.take(2).toString();
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: p.surface2,
        border: Border(
          top: BorderSide(color: showOnline ? p.primary.withValues(alpha: 0.5) : p.border),
          bottom: BorderSide(color: showOnline ? p.primary.withValues(alpha: 0.5) : p.border),
          left: BorderSide(color: showOnline ? p.primary.withValues(alpha: 0.5) : p.border),
          right: BorderSide(color: showOnline ? p.primary.withValues(alpha: 0.5) : p.border),
        ),
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: size * 0.36, fontWeight: FontWeight.w700, color: p.text),
        ),
      ),
    );
  }
}

class AuroraText extends StatelessWidget {
  const AuroraText({super.key, required this.data, required this.style});

  final String data;
  final TextStyle style;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return ShaderMask(
      shaderCallback: (_) => KurdbookGradients.linear(p.gradient).createShader(const Rect.fromLTWH(0, 0, 1000, 1000)),
      child: Text(data, style: style),
    );
  }
}

class ScreenLoader extends StatelessWidget {
  const ScreenLoader({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: KurdbookGradients.linear(p.gradient),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            message ?? 'دۆخی چوونەژوورەوە دەپشکنرێت…',
            textAlign: TextAlign.center,
            style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 13, color: p.muted),
          ),
        ],
      ),
    );
  }
}

class CountBadge extends StatelessWidget {
  const CountBadge({super.key, this.count = 0});

  final int count;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) {
      return const SizedBox.shrink();
    }
    return Container(
      constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFFFF6B83)),
      alignment: Alignment.center,
      child: Text(
        '$count',
        style: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFFFFFFFF)),
      ),
    );
  }
}
