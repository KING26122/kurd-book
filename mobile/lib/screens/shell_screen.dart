import 'package:flutter/material.dart';

import '../data/models.dart';
import '../navigation/app_router.dart';
import '../state/auth_store.dart';
import '../state/ui_store.dart';
import '../widgets/kurdbook_widgets.dart';
import './feed_screen.dart';

class ShellScreen extends StatelessWidget {
  const ShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    final user = authStore.user;

    return Scaffold(
      backgroundColor: p.bg,
      body: SafeArea(
        bottom: false,
        child: AuroraBackground(
          child: Column(
            children: [
              _Header(user: user),
              Expanded(child: _Body()),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const _BottomNav(),
    );
  }
}

class _Body extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final path = appRouter.current;
    switch (path) {
      case '/':
      case '':
        return const FeedScreen();
      case '/explore':
        return const FeedScreen();
      case '/friends':
        return const FeedScreen();
      case '/messages':
        return const FeedScreen();
      case '/live':
        return const FeedScreen();
      default:
        return const FeedScreen();
    }
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.user});

  final User? user;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          const CircleAvatar(backgroundColor: Color(0xFF142741), child: Icon(Icons.person, color: Color(0xFF8EA2BD), size: 22)),
          const SizedBox(width: 10),
          const Expanded(
            child: Text('کورد بووک', style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFFFFFFFF))),
          ),
          IconButton(
            onPressed: () => uiStore.openSearch(),
            icon: const Icon(Icons.search, size: 22, color: Color(0xFF8EA2BD)),
          ),
          IconButton(
            onPressed: () => uiStore.openNotifications(),
            icon: Badge(
              backgroundColor: const Color(0xFFFF6B83),
              textStyle: const TextStyle(fontSize: 9, color: Colors.white, fontFamily: 'Noto Kufi Arabic'),
              child: const Icon(Icons.notifications_outlined, size: 22, color: Color(0xFF8EA2BD)),
            ),
          ),
          const SizedBox(width: 4),
          CircleAvatar(
            backgroundColor: p.surface2,
            child: const Icon(Icons.person, color: Color(0xFF8EA2BD), size: 20),
          ),
        ],
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  const _BottomNav();

  static const Map<String, String> _items = <String, String>{
    '/': 'ماڵەوە',
    '/explore': 'دۆزینەوە',
    '/friends': 'هاوڕێیان',
    '/messages': 'چات',
    '/live': 'لایڤ',
  };

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    final current = appRouter.current;
    return Container(
      decoration: BoxDecoration(
        color: p.bgElev.withValues(alpha: 0.95),
        border: Border(
          top: BorderSide(color: p.border),
          bottom: BorderSide(color: p.border),
          left: BorderSide(color: p.border),
          right: BorderSide(color: p.border),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              for (final entry in _items.entries) _NavItem(path: entry.key, label: entry.value, active: current == entry.key),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({required this.path, required this.label, required this.active});

  final String path;
  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return InkWell(
      onTap: () => appRouter.reset(path),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(color: active ? p.primary.withValues(alpha: 0.1) : Colors.transparent, borderRadius: BorderRadius.circular(14)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.home, size: 22, color: active ? p.primary : p.muted),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 9, fontWeight: FontWeight.w700, color: active ? p.primary : p.muted)),
          ],
        ),
      ),
    );
  }
}
