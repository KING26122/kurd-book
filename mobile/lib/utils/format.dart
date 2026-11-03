// Date & text formatting helpers ported from `apps/web/src/lib/format.ts`.

class KurdbookFormat {
  static const List<String> kurdishMonths = <String>[
    'کانونی دووەم',
    'شوبات',
    'ئازار',
    'نیسان',
    'ئایار',
    'حوزەیران',
    'تەممووز',
    'ئاب',
    'ئەیلوول',
    'تشرینی یەکەم',
    'تشرینی دووەم',
    'کانونی یەکەم',
  ];

  static DateTime _toDate(String input) => DateTime.tryParse(input) ?? DateTime.now();

  static String timeAgo(String input) {
    final date = _toDate(input);
    var diff = DateTime.now().difference(date).inMilliseconds;
    if (diff < 0) diff = 0;
    final minutes = (diff / 60000).floor();
    if (minutes < 1) return 'ئێستا';
    if (minutes < 60) return '$minutes خولەک لەمەوپێش';
    final hours = (minutes / 60).floor();
    if (hours < 24) return '$hours کاتژمێر لەمەوپێش';
    final days = (hours / 24).floor();
    if (days < 7) return '$days ڕۆژ لەمەوپێش';
    final weeks = (days / 7).floor();
    if (weeks < 5) return '$weeks هەفتە لەمەوپێش';
    return formatDate(input);
  }

  static String formatTime(String input) {
    final date = _toDate(input);
    final hours = date.hour.toString().padLeft(2, '0');
    final minutes = date.minute.toString().padLeft(2, '0');
    return '$hours:$minutes';
  }

  static String formatDate(String input) {
    final date = _toDate(input);
    return '${date.day} ${kurdishMonths[date.month - 1]} ${date.year}';
  }

  static String formatDateTime(String input) => '${formatDate(input)} — ${formatTime(input)}';

  static String formatChatDay(String input) {
    final date = _toDate(input);
    final today = DateTime.now();
    final yesterday = DateTime(today.year, today.month, today.day - 1);
    final dateOnly = DateTime(date.year, date.month, date.day);
    if (dateOnly.year == today.year && dateOnly.month == today.month && dateOnly.day == today.day) return 'ئەمڕۆ';
    if (dateOnly.year == yesterday.year && dateOnly.month == yesterday.month && dateOnly.day == yesterday.day) return 'دوێنێ';
    return formatDate(input);
  }

  static String formatNumber(int value) => value.toString();

  static String formatIQD(int value) => '$value د.ع';

  static String formatDuration(int seconds) {
    if (seconds < 0) return '0:00';
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '${mins.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}';
  }

  static String initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'ک';
    if (parts.length == 1) return parts[0].length >= 2 ? parts[0].substring(0, 2) : parts[0];
    return '${parts[0].substring(0, 1)}${parts[1].substring(0, 1)}';
  }

  static String greeting() {
    final hour = DateTime.now().hour;
    if (hour < 5) return 'شەو باش';
    if (hour < 12) return 'بەیانی باش';
    if (hour < 17) return 'ئێوارە باش';
    return 'شەو باش';
  }

  static bool isOnlyEmoji(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return false;
    final withoutEmoji = trimmed.replaceAll(RegExp(r'[\p{Extended_Pictographic}\uFE0F\u200D\u20E3\s]', multiLine: true), '');
    return withoutEmoji.isEmpty && trimmed.length <= 24;
  }

  static bool isImageUrl(String url) => RegExp(r'\.(jpe?g|png|webp|gif|avif|heic)(\?|$)', caseSensitive: false).hasMatch(url);

  static String clampText(String text, int length) {
    if (text.length > length) {
      return '${text.substring(0, length)}…';
    }
    return text;
  }

  static String relativeDayKey(DateTime date) => '${date.year}-${date.month}-${date.day}';
}
