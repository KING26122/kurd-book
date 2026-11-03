import 'package:flutter/material.dart';

import '../../widgets/kurdbook_widgets.dart';

class AuthShell extends StatelessWidget {
  const AuthShell({super.key, required this.title, required this.subtitle, required this.child, this.footer});

  final String title;
  final String subtitle;
  final Widget child;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    return AuroraBackground(
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
            child: Container(
              width: double.infinity,
              constraints: const BoxConstraints(maxWidth: 460),
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: Color(0xFF0F1F35).withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(24),
                border: Border(
                  top: BorderSide(color: const Color(0x2614B8DC)),
                  bottom: BorderSide(color: const Color(0x2614B8DC)),
                  left: BorderSide(color: const Color(0x2614B8DC)),
                  right: BorderSide(color: const Color(0x2614B8DC)),
                ),
                boxShadow: [BoxShadow(color: const Color(0xE6000000), blurRadius: 70, offset: const Offset(0, 24))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 52,
                      height: 52,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF39E0B2), Color(0xFFF3CC6D), Color(0xFFF0835D)]),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'کورد بووک',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 26, fontWeight: FontWeight.w900, color: Color(0xFFFFFFFF)),
                  ),
                  const SizedBox(height: 2),
                  const Text('KURD BOOK', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 9, letterSpacing: 4, color: Color(0xFF8EA2BD))),
                  const SizedBox(height: 18),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFFFFFFFF), height: 1.5),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, color: Color(0xFF8EA2BD), height: 1.7),
                  ),
                  const SizedBox(height: 20),
                  child,
                  if (footer != null) ...[
                    const SizedBox(height: 18),
                    Divider(color: const Color(0x2614B8DC)),
                    const SizedBox(height: 14),
                    footer!,
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
