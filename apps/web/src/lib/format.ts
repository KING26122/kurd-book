const KURDISH_MONTHS = [
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

export function timeAgo(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ئێستا';
  if (minutes < 60) return `${minutes} خولەک لەمەوپێش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} کاتژمێر لەمەوپێش`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ڕۆژ لەمەوپێش`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} هەفتە لەمەوپێش`;
  return formatDate(date);
}

export function formatTime(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDate(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  return `${date.getDate()} ${KURDISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTime(input: string | Date): string {
  return `${formatDate(input)} — ${formatTime(input)}`;
}

export function formatChatDay(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'ئەمڕۆ';
  if (date.toDateString() === yesterday.toDateString()) return 'دوێنێ';
  return formatDate(date);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatIQD(value: number): string {
  return `${formatNumber(value)} د.ع`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ک';
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0] || ''}${parts[1]![0] || ''}`;
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'شەو باش';
  if (hour < 12) return 'بەیانی باش';
  if (hour < 17) return 'ئێوارە باش';
  return 'شەو باش';
}

export function isOnlyEmoji(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const withoutEmoji = trimmed.replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3\s]/gu, '');
  return withoutEmoji.length === 0 && trimmed.length <= 24;
}

export function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif|avif|heic)(\?|$)/i.test(url);
}

export function clampText(text: string, length = 80): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export function relativeDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
