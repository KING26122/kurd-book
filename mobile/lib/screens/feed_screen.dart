import 'package:flutter/material.dart';

import '../../state/toast_store.dart';
import '../../utils/format.dart';
import '../../widgets/kurdbook_widgets.dart';

class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  final TextEditingController _composerController = TextEditingController();

  @override
  void dispose() {
    _composerController.dispose();
    super.dispose();
  }

  void _send() {
    final text = _composerController.text.trim();
    if (text.isEmpty) {
      return;
    }
    _composerController.clear();
    toastStore.info('پۆستەکەت نرخدراوە — بۆ نموونە لە خەڵوەی کۆمەڵایەتییەوە لەکاردا بەکاردەهێنرێت.');
  }

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return Column(
      children: [
        // Story rail
        SizedBox(
          height: 96,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: 6,
            itemBuilder: (context, index) {
              final viewed = index % 3 == 2;
              return Padding(
                padding: const EdgeInsets.only(left: 10),
                child: StoryRing(
                  viewed: viewed,
                  size: 62,
                  child: CircleAvatar(
                    backgroundColor: p.surface2,
                    child: Icon(Icons.person, color: p.muted, size: 24),
                  ),
                ),
              );
            },
          ),
        ),
        // Composer
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: p.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border(
                top: BorderSide(color: p.border),
                bottom: BorderSide(color: p.border),
                left: BorderSide(color: p.border),
                right: BorderSide(color: p.border),
              ),
              boxShadow: [BoxShadow(color: p.shadow, blurRadius: 70, offset: const Offset(0, 24))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const CircleAvatar(backgroundColor: Color(0xFF142741), child: Icon(Icons.person, color: Color(0xFF8EA2BD), size: 20)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _composerController,
                        minLines: 2,
                        style: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 14, color: Color(0xFFEFF6FF)),
                        decoration: InputDecoration(
                          hintText: 'چێوە بکە…',
                          hintStyle: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 14, color: Color(0xFF617692)),
                          filled: true,
                          fillColor: const Color(0xFF0F1F35).withValues(alpha: 0.82),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: const Color(0x2614B8DC))),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: const Color(0x2614B8DC))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: const Color(0xFF39E0B2).withValues(alpha: 0.55))),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () => toastStore.info('ئایکس پارەدان لە نموونەی کۆدەوە.'),
                        child: const Icon(Icons.image, size: 20, color: Color(0xFF39E0B2)),
                      ),
                    ),
                    Expanded(
                      child: TextButton(
                        onPressed: () => toastStore.info('ئیموجی نموونەی کۆدەوە.'),
                        child: const Text('😀', style: TextStyle(fontSize: 20)),
                      ),
                    ),
                    Expanded(
                      child: TextButton(
                        onPressed: () => toastStore.info('واڵەکاری نموونەی کۆدەوە.'),
                        child: const Icon(Icons.mic, size: 20, color: Color(0xFF39E0B2)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: _send,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF39E0B2),
                        foregroundColor: const Color(0xFF032018),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      ),
                      child: const Text('نێردن', style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF032018))),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Posts
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
            itemCount: 3,
            itemBuilder: (context, index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: p.surface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border(
                      top: BorderSide(color: p.border),
                      bottom: BorderSide(color: p.border),
                      left: BorderSide(color: p.border),
                      right: BorderSide(color: p.border),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const CircleAvatar(backgroundColor: Color(0xFF142741), child: Icon(Icons.person, color: Color(0xFF8EA2BD), size: 18)),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text('کورد بووک', style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFFFFFFFF))),
                          ),
                          Text(KurdbookFormat.timeAgo(DateTime.now().subtract(const Duration(hours: 2)).toIso8601String()), style: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 10, color: Color(0xFF617692))),
                        ],
                      ),
                      const SizedBox(height: 8),
                      const Text('گەڵام بە ئێستا بە ڕەنگ و کەمێک ئەرکی بۆ نزیکەران.', textAlign: TextAlign.right, style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 14, color: Color(0xFFEFF6FF), height: 1.8)),
                      const SizedBox(height: 10),
                      Container(
                        height: 140,
                        decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(18)),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          const Icon(Icons.favorite_border, size: 16, color: Color(0xFF39E0B2)),
                          const SizedBox(width: 6),
                          Text('12', style: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF8EA2BD))),
                          const SizedBox(width: 18),
                          const Icon(Icons.chat_bubble_outline, size: 16, color: Color(0xFF39E0B2)),
                          const SizedBox(width: 6),
                          Text('3', style: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF8EA2BD))),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
