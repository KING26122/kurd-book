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

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

export function formatIQD(value: number): string {
  return `${formatNumber(value)} د.ع`;
}

export function formatDate(input?: string | Date | null): string {
  if (!input) return '—';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${KURDISH_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTime(input?: string | Date | null): string {
  if (!input) return '—';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '—';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDateTime(input?: string | Date | null): string {
  if (!input) return '—';
  return `${formatDate(input)} · ${formatTime(input)}`;
}

export function timeAgo(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ئێستا';
  if (minutes < 60) return `${minutes} خولەک لەمەوپێش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} کاتژمێر لەمەوپێش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ڕۆژ لەمەوپێش`;
  return formatDate(date);
}

export function formatDayShort(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return `${date.getUTCDate()}/${date.getUTCMonth() + 1}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'ک';
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0] || ''}${parts[1]![0] || ''}`;
}

export function truncate(text: string, length = 90): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
