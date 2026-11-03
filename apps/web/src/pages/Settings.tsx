import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ban,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Crown,
  Download,
  Fingerprint,
  ImagePlus,
  KeyRound,
  Laptop,
  LogOut,
  Mail,
  Mic,
  MonitorSmartphone,
  Moon,
  Palette,
  Phone,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { api, setSession } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/format';
import { uploadFile } from '@/lib/upload';
import {
  deleteIdentity,
  ensureIdentity,
  exportIdentity,
  generateIdentity,
  publishIdentity,
  validateIdentityBackup,
  type Identity,
} from '@/lib/crypto';
import { processVoiceNote, VOICE_EFFECTS } from '@/lib/voice';
import { applyTheme, THEMES, useThemeStore } from '@/stores/theme';
import { errorMessage, toast } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import { Alert, Avatar, Modal, ProgressBar, SectionTitle, Spinner } from '@/components/ui';
import { UserBadges } from '@/components/Badges';
import { UserCard } from '@/components/UserCard';
import type { AuthPayload, ThemeId, User, VoiceEffect } from '@/types';

type SettingsTab = 'profile' | 'appearance' | 'voice' | 'security' | 'keys' | 'blocks';

const TABS: Array<{ id: SettingsTab; label: string; icon: typeof UserRound }> = [
  { id: 'profile', label: 'پرۆفایل', icon: UserRound },
  { id: 'appearance', label: 'ڕووکار', icon: Palette },
  { id: 'voice', label: 'دەنگ', icon: Volume2 },
  { id: 'security', label: 'ئاسایش', icon: ShieldCheck },
  { id: 'keys', label: 'کلیلی پاراستن', icon: KeyRound },
  { id: 'blocks', label: 'بلۆکەکان', icon: Ban },
];

function SettingsSection({
  icon,
  title,
  description,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--surface-2)] text-[color:var(--primary)]">{icon}</span>
          <div>
            <h2 className="text-sm font-extrabold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-[10px] leading-5 text-muted">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const patchUser = useAuthStore((state) => state.patchUser);
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.city || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [birthDate, setBirthDate] = useState(user?.birthDate ? user.birthDate.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [voiceEffect, setVoiceEffect] = useState<VoiceEffect>(user?.voiceEffect || 'natural');
  const [savingVoice, setSavingVoice] = useState(false);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await api<{ user: User }>('/api/users/me', {
        method: 'PATCH',
        body: {
          name: name.trim(),
          bio: bio.trim() || null,
          city: city.trim() || null,
          gender: gender || null,
          birthDate: birthDate ? new Date(`${birthDate}T00:00:00.000Z`).toISOString() : null,
        },
      });
      patchUser(data.user);
      toast('پرۆفایلەکەت نوێکرایەوە.', 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (kind: 'avatar' | 'cover', file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('تکایە وێنەیەک هەڵبژێرە.', 'error');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast('وێنەکە زۆر گەورەیە — زۆرترین ١٢MB.', 'error');
      return;
    }
    const preview = URL.createObjectURL(file);
    if (kind === 'avatar') setAvatarPreview(preview);
    else setCoverPreview(preview);
    setUploading(kind);
    setUploadProgress(0);
    try {
      const result = await uploadFile(file, kind, setUploadProgress);
      const data = await api<{ user: User }>('/api/users/me', {
        method: 'PATCH',
        body: { [kind === 'avatar' ? 'avatarUrl' : 'coverUrl']: result.url },
      });
      patchUser(data.user);
      toast(kind === 'avatar' ? 'وێنەی پرۆفایل نوێکرایەوە.' : 'وێنەی بەرگ نوێکرایەوە.', 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setUploading(null);
      setUploadProgress(null);
      if (kind === 'avatar') setTimeout(() => setAvatarPreview(null), 800);
      else setTimeout(() => setCoverPreview(null), 800);
    }
  };

  const changeTheme = async (next: ThemeId) => {
    setTheme(next);
    applyTheme(next);
    try {
      await api('/api/users/me', { method: 'PATCH', body: { theme: next } });
      patchUser({ theme: next });
    } catch {
      // Theme is still applied locally; the server will sync next save.
    }
  };

  const saveVoice = async (next: VoiceEffect) => {
    setVoiceEffect(next);
    setSavingVoice(true);
    try {
      await api('/api/users/me', { method: 'PATCH', body: { voiceEffect: next } });
      patchUser({ voiceEffect: next });
      toast('شێوازی دەنگەکەت پاشەکەوت کرا.', 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setSavingVoice(false);
    }
  };

  if (!user) return null;

  return (
    <div className="page-enter space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-line p-5">
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: 'var(--gradient-soft)' }} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar user={user} size={60} showOnline />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="font-display text-xl font-black text-ink">{user.name}</h1>
                <UserBadges user={user} size={15} />
              </div>
              <p className="mt-0.5 text-[11px] text-muted" dir="ltr">@{user.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/u/${user.username}`} className="btn-soft !rounded-xl !px-3 !py-2 !text-[11px]"><UserRound size={14} /> بینینی پرۆفایل</Link>
            {!user.isPro && <Link to="/pro" className="pro-pill inline-flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-extrabold"><Crown size={13} /> بەدەستهێنانی Pro</Link>}
          </div>
        </div>
      </section>

      <div className="tab-row lg:hidden">
        {TABS.map((item) => (
          <button key={item.id} type="button" className={cn('tab', tab === item.id && 'tab-active')} onClick={() => setTab(item.id)}>
            <span className="inline-flex items-center gap-1.5"><item.icon size={13} /> {item.label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="panel hidden h-fit p-2 lg:block">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-xs font-bold transition-colors',
                tab === item.id ? 'bg-[color:var(--surface-2)] text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              <item.icon size={16} />
              {item.label}
              <ChevronLeft size={13} className="ms-auto opacity-40" />
            </button>
          ))}
        </aside>

        <div className="min-w-0 space-y-4">
          {tab === 'profile' && (
            <>
              <SettingsSection icon={<Camera size={18} />} title="وێنەکان" description="وێنەی پرۆفایل و بەرگەکەت بگۆڕە.">
                <div className="relative h-36 overflow-hidden rounded-2xl border border-line sm:h-44">
                  {coverPreview || user.coverUrl ? (
                    <img src={coverPreview || user.coverUrl || ''} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center" style={{ backgroundImage: 'var(--gradient-soft)' }}>
                      <ImagePlus size={30} className="text-muted-2" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => coverInput.current?.click()}
                    className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-xl bg-black/55 px-2.5 py-1.5 text-[10px] font-bold text-white backdrop-blur hover:bg-black/75"
                  >
                    {uploading === 'cover' ? <Spinner size={12} /> : <Camera size={12} />} گۆڕینی بەرگ
                  </button>
                  {uploading === 'cover' && uploadProgress !== null && (
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2"><ProgressBar value={uploadProgress} /></div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative">
                    <Avatar user={{ ...user, avatarUrl: avatarPreview || user.avatarUrl }} size={64} />
                    <button
                      type="button"
                      onClick={() => avatarInput.current?.click()}
                      className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[color:var(--bg)] bg-[color:var(--primary)] text-[color:var(--primary-fg)]"
                      aria-label="گۆڕینی وێنە"
                    >
                      {uploading === 'avatar' ? <Spinner size={12} /> : <Camera size={12} />}
                    </button>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-ink">وێنەی پرۆفایل</p>
                    <p className="text-[10px] text-muted">JPG، PNG یان WebP — زۆرترین ١٢MB</p>
                  </div>
                  <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadImage('avatar', event.target.files?.[0] || null)} />
                  <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadImage('cover', event.target.files?.[0] || null)} />
                </div>
              </SettingsSection>

              <SettingsSection icon={<UserRound size={18} />} title="زانیارییە کەسییەکان" description="ئەم زانیارییانە لە پرۆفایلی گشتییەکەتدا دەردەکەون.">
                <form onSubmit={saveProfile} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="settings-name">ناوی تەواو</label>
                      <input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} className="input" minLength={2} maxLength={60} required />
                    </div>
                    <div>
                      <label className="label" htmlFor="settings-username">ناوی بەکارهێنەر</label>
                      <input id="settings-username" value={`@${user.username}`} className="input opacity-60" disabled />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="settings-bio">دەربارە</label>
                    <textarea id="settings-bio" value={bio} onChange={(event) => setBio(event.target.value.slice(0, 280))} className="textarea !min-h-[90px]" placeholder="کەمێک دەربارەی خۆت بنووسە…" maxLength={280} />
                    <p className="mt-1 text-[9px] text-muted-2">{bio.length}/280</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="label" htmlFor="settings-city">شار</label>
                      <input id="settings-city" value={city} onChange={(event) => setCity(event.target.value)} className="input" placeholder="هەولێر" maxLength={80} />
                    </div>
                    <div>
                      <label className="label" htmlFor="settings-gender">ڕەگەز</label>
                      <select id="settings-gender" value={gender} onChange={(event) => setGender(event.target.value)} className="input">
                        <option value="">دیارینەکراو</option>
                        <option value="male">پیاو</option>
                        <option value="female">ژن</option>
                        <option value="other">تر</option>
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="settings-birth">ڕۆژی لەدایکبوون</label>
                      <input id="settings-birth" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="input" dir="ltr" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[10px] text-muted-2">ناوی بەکارهێنەر ناگۆڕدرێت بۆ پاراستنی ناسنامەکەت.</p>
                    <button type="submit" className="btn-primary !rounded-xl !px-4 !py-2 !text-[11px]" disabled={saving}>
                      {saving ? <Spinner size={14} /> : <Save size={14} />} پاشەکەوتکردن
                    </button>
                  </div>
                </form>
              </SettingsSection>
            </>
          )}

          {tab === 'appearance' && (
            <SettingsSection icon={<Palette size={18} />} title="ڕووکاری ئەپ" description="یەکێک لە چوار ڕووکارەکان هەڵبژێرە. هەڵبژاردنەکەت لەسەر هەموو ئامێرەکانت دەپارێزرێت.">
              <div className="grid gap-3 sm:grid-cols-2">
                {THEMES.map((item) => {
                  const active = theme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void changeTheme(item.id)}
                      className={cn(
                        'group overflow-hidden rounded-3xl border p-3 text-right transition-all',
                        active ? 'border-[color:var(--primary)]/55 shadow-glow' : 'border-line hover:border-[color:var(--border-strong)]',
                      )}
                    >
                      <div className="flex h-24 overflow-hidden rounded-2xl border border-white/10">
                        <div className="flex-1" style={{ background: item.swatch[0] }} />
                        <div className="w-1/3" style={{ background: item.swatch[1] }} />
                        <div className="w-1/4" style={{ background: item.swatch[2] }} />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-extrabold text-ink">{item.name}</p>
                          <p className="mt-0.5 text-[10px] text-muted">{item.subtitle}</p>
                        </div>
                        {active ? <CheckCircle2 size={18} className="text-[color:var(--primary)]" /> : <Moon size={16} className="text-muted-2" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </SettingsSection>
          )}

          {tab === 'voice' && (
            <>
              <SettingsSection icon={<Mic size={18} />} title="شێوازی دەنگی تایبەت" description="هەر نامەی دەنگییەک کە دەینێریت بەم شێوازە دەگۆڕدرێت.">
                <div className="grid gap-2 sm:grid-cols-2">
                  {VOICE_EFFECTS.map((effect) => {
                    const active = voiceEffect === effect.id;
                    return (
                      <button
                        key={effect.id}
                        type="button"
                        onClick={() => void saveVoice(effect.id)}
                        disabled={savingVoice}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl border p-3 text-right transition-all',
                          active ? 'border-[color:var(--primary)]/45 bg-[color:var(--primary)]/[0.07]' : 'border-line bg-[color:var(--surface-2)]/30 hover:border-[color:var(--border-strong)]',
                        )}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-lg">{effect.glyph}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-extrabold text-ink">{effect.label}</span>
                          <span className="mt-0.5 block text-[9px] leading-4 text-muted">{effect.description}</span>
                        </span>
                        {active && <CheckCircle2 size={16} className="shrink-0 text-[color:var(--primary)]" />}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 rounded-2xl border border-line bg-[color:var(--surface-2)]/30 px-3 py-2 text-[10px] leading-5 text-muted">
                  شێوازەکە لەسەر ئامێری تۆ جێبەجێ دەکرێت پێش شێفڕەکردن. دەنگی ڕەسەن هیچ کات ناگوازرێتەوە بۆ سێرڤەر.
                </p>
              </SettingsSection>
              <VoicePreview effect={voiceEffect} />
            </>
          )}

          {tab === 'security' && <SecurityTab />}

          {tab === 'keys' && <KeysTab />}

          {tab === 'blocks' && <BlocksTab />}
        </div>
      </div>
    </div>
  );
}

function VoicePreview({ effect }: { effect: VoiceEffect }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const start = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setProcessing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const processed = await processVoiceNote(blob, effect);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(processed));
          toast('نموونەی دەنگ ئامادەیە.', 'success');
        } catch (error) {
          toast(errorMessage(error), 'error');
        } finally {
          setProcessing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 5000);
    } catch {
      toast('دەستڕاگەیشتن بە مایک ڕەتکرایەوە.', 'error');
    }
  };

  return (
    <SettingsSection icon={<Volume2 size={18} />} title="تاقیکردنەوەی شێواز" description="تا ٥ چرکە دەنگ تۆمار بکە و گوێ بە شێوازەکە بگرە.">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void start()}
          disabled={processing}
          className={cn('btn !rounded-xl !px-4 !py-2 !text-[11px]', recording ? 'btn-danger' : 'btn-soft')}
        >
          {processing ? <Spinner size={14} /> : recording ? <span className="h-2.5 w-2.5 rounded-sm bg-current" /> : <Mic size={14} />}
          {recording ? 'وەستان' : processing ? 'پرۆسێسکردن…' : 'تۆمارکردن'}
        </button>
        {audioUrl && <audio controls src={audioUrl} className="h-9 max-w-[260px]" />}
      </div>
      {recording && (
        <div className="mt-3 flex items-center gap-2 text-[10px] text-[color:var(--danger)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-current" /> دەنگ تۆمار دەکرێت… کلیک لە وەستان بکە.
        </div>
      )}
    </SettingsSection>
  );
}

function SecurityTab() {
  const user = useAuthStore((state) => state.user);
  const patchUser = useAuthStore((state) => state.patchUser);
  const navigate = useNavigate();
  const [setup, setSetup] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [sessions, setSessions] = useState<Array<{ id: string; userAgent: string | null; ip: string | null; createdAt: string; expiresAt: string; current: boolean }>>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const data = await api<{ sessions: typeof sessions }>('/api/auth/sessions');
      setSessions(data.sessions);
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const beginSetup = async () => {
    setBusy('setup');
    try {
      const data = await api<{ secret: string; qrDataUrl: string }>('/api/auth/2fa/setup', { method: 'POST' });
      setSetup(data);
      setSetupOpen(true);
      setCode('');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const enable2fa = async () => {
    setBusy('enable');
    try {
      await api('/api/auth/2fa/enable', { method: 'POST', body: { code: code.trim() } });
      patchUser({ twoFactorEnabled: true });
      setSetupOpen(false);
      setSetup(null);
      setCode('');
      toast('پشتڕاستکردنەوەی دوو هەنگاو چالاک کرا. 🔐', 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const disable2fa = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy('disable');
    try {
      await api('/api/auth/2fa/disable', {
        method: 'POST',
        body: { password: disablePassword, code: disableCode.trim() },
      });
      patchUser({ twoFactorEnabled: false });
      setDisablePassword('');
      setDisableCode('');
      toast('2FA ناچالاک کرا.', 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast('وشەکانی نهێنی نوێ وەک یەک نین.', 'error');
      return;
    }
    setBusy('password');
    try {
      await api('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: password, newPassword },
      });
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast('وشەی نهێنی گۆڕدرا. دانیشتنەکانی تر دەرکران.', 'success');
      await loadSessions();
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (id: string) => {
    setBusy(id);
    try {
      await api(`/api/auth/sessions/${id}`, { method: 'DELETE' });
      setSessions((current) => current.filter((session) => session.id !== id));
      toast('دانیشتنەکە دەرکرا.', 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const logoutAll = async () => {
    if (!window.confirm('دڵنیایت لە هەموو ئامێرەکانی تر دەردەچیت؟')) return;
    setBusy('all');
    try {
      await api('/api/auth/logout-all', { method: 'POST' });
      await loadSessions();
      toast('هەموو دانیشتنەکانی تر دەرکران.', 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  const deactivate = async () => {
    if (!window.confirm('ئەم کارە هەژمارەکەت ناچالاک دەکات و لە هەموو ئامێرەکان دەردەچیت. دڵنیایت؟')) return;
    setBusy('deactivate');
    try {
      await api('/api/users/me/deactivate', { method: 'POST' });
      useAuthStore.getState().clear();
      navigate('/login', { replace: true });
      toast('هەژمارەکەت ناچالاک کرا.', 'info');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <SettingsSection
        icon={<ShieldCheck size={18} />}
        title="پشتڕاستکردنەوەی دوو هەنگاو (2FA)"
        description="بە ئەپی Google Authenticator یان Authy هەژمارەکەت بپارێزە."
        action={
          user?.twoFactorEnabled ? (
            <span className="chip !border-emerald-400/30 !bg-emerald-400/10 !text-emerald-200"><CheckCircle2 size={11} /> چالاک</span>
          ) : (
            <span className="chip !text-[10px]">ناچالاک</span>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-[color:var(--surface-2)]/30 p-3.5">
          <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', user?.twoFactorEnabled ? 'bg-emerald-400/10 text-emerald-300' : 'bg-[color:var(--surface-2)] text-muted')}>
            <Fingerprint size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-ink">{user?.twoFactorEnabled ? 'هەژمارەکەت پارێزراوە' : 'هەژمارەکەت بپارێزە'}</p>
            <p className="mt-0.5 text-[10px] leading-5 text-muted">
              {user?.twoFactorEnabled
                ? 'هەر جارە بچیتە ژوورەوە، کۆدی ٦ ژمارەیی لە ئەپی ئەوثەنتیکەیتەر داوا دەکرێت.'
                : 'دوای وشەی نهێنی، کۆدێکی کاتی لە ئەپی ئەوثەنتیکەیتەر دەپێویستێت.'}
            </p>
          </div>
          {!user?.twoFactorEnabled && (
            <button type="button" className="btn-primary !rounded-xl !px-3 !py-2 !text-[11px]" onClick={() => void beginSetup()} disabled={busy === 'setup'}>
              {busy === 'setup' ? <Spinner size={14} /> : <ShieldCheck size={14} />} چالاککردن
            </button>
          )}
        </div>

        {user?.twoFactorEnabled && (
          <form onSubmit={disable2fa} className="mt-3 grid gap-2 rounded-2xl border border-red-400/20 bg-red-400/5 p-3.5 sm:grid-cols-[1fr_150px_auto]">
            <input type="password" value={disablePassword} onChange={(event) => setDisablePassword(event.target.value)} className="input !py-2 !text-xs" placeholder="وشەی نهێنی ئێستا" required />
            <input value={disableCode} onChange={(event) => setDisableCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="input !py-2 !text-center !text-xs" placeholder="کۆدی 2FA" inputMode="numeric" required />
            <button type="submit" className="btn-danger !rounded-xl !px-3 !py-2 !text-[11px]" disabled={busy === 'disable'}>ناچالاککردن</button>
          </form>
        )}
      </SettingsSection>

      <SettingsSection icon={<KeyRound size={18} />} title="گۆڕینی وشەی نهێنی" description="وشەی نهێنی بەهێز بەکاربهێنە — لانیکەم ٨ پیت.">
        <form onSubmit={changePassword} className="grid gap-2 sm:grid-cols-3">
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input !py-2 !text-xs" placeholder="وشەی نهێنی ئێستا" required autoComplete="current-password" />
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="input !py-2 !text-xs" placeholder="وشەی نهێنی نوێ" required minLength={8} autoComplete="new-password" />
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="input !py-2 !text-xs" placeholder="دووپاتکردنەوە" required autoComplete="new-password" />
          <button type="submit" className="btn-primary !rounded-xl !px-3 !py-2 !text-[11px] sm:col-span-3" disabled={busy === 'password'}>
            {busy === 'password' ? <Spinner size={14} /> : <KeyRound size={14} />} گۆڕینی وشەی نهێنی
          </button>
        </form>
      </SettingsSection>

      <SettingsSection
        icon={<MonitorSmartphone size={18} />}
        title="دانیشتنەکانی چالاک"
        description="ئامێرەکانی چووەژوورەوە. ئەگەر ئامێرێکی نەناسیت، دەریکە."
        action={<button type="button" className="btn-ghost !rounded-xl !px-2 !py-1 !text-[11px]" onClick={() => void logoutAll()} disabled={busy === 'all'}><LogOut size={13} /> هەموو دەرکردن</button>}
      >
        {loadingSessions ? (
          <div className="flex justify-center py-6"><Spinner className="text-muted" /></div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const mobile = /android|iphone|ipad|mobile/i.test(session.userAgent || '');
              return (
                <div key={session.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-[color:var(--surface-2)]/30 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-muted">
                    {mobile ? <Smartphone size={16} /> : <Laptop size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-ink">{session.userAgent || 'ئامێری نەناسراو'}</p>
                    <p className="mt-0.5 text-[9px] text-muted">{session.ip || '—'} · {formatDateTime(session.createdAt)}</p>
                  </div>
                  {session.current ? (
                    <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300">ئێستا</span>
                  ) : (
                    <button type="button" onClick={() => void revoke(session.id)} disabled={busy === session.id} className="text-[10px] font-bold text-muted hover:text-danger">
                      {busy === session.id ? <Spinner size={12} /> : 'دەرکردن'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SettingsSection>

      <SettingsSection icon={<Mail size={18} />} title="ئیمەیڵ و مۆبایل" description="ناونیشانەکانی پشتڕاستکراو.">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-[color:var(--surface-2)]/30 px-3 py-2.5">
            <Mail size={15} className="text-muted" />
            <span className="min-w-0 flex-1 truncate text-[11px] text-ink" dir="ltr">{user?.email || '—'}</span>
            {user?.email && <span className="text-[9px] font-bold text-[color:var(--success)]">پشتڕاستکراوە</span>}
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-[color:var(--surface-2)]/30 px-3 py-2.5">
            <Phone size={15} className="text-muted" />
            <span className="min-w-0 flex-1 truncate text-[11px] text-ink" dir="ltr">{user?.phone || '—'}</span>
            {user?.phone && <span className="text-[9px] font-bold text-[color:var(--success)]">پشتڕاستکراوە</span>}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection icon={<Trash2 size={18} />} title="ناچالاککردنی هەژمار" description="هەژمارەکەت بۆ ماوەیەکی نادیار ناچالاک دەبێت و لە هەموو ئامێرەکان دەردەچیت.">
        <button type="button" className="btn-danger !rounded-xl !px-3 !py-2 !text-[11px]" onClick={() => void deactivate()} disabled={busy === 'deactivate'}>
          {busy === 'deactivate' ? <Spinner size={14} /> : <Ban size={14} />} ناچالاککردنی هەژمار
        </button>
      </SettingsSection>

      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title="ڕێکخستنی 2FA" subtitle="QR کۆدەکە بە ئەپی Google Authenticator یان Authy سکان بکە، پاشان کۆدی ٦ ژمارەیی بنووسە." size="sm">
        {setup && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img src={setup.qrDataUrl} alt="2FA QR" className="h-60 w-60 rounded-2xl bg-white p-2" />
            </div>
            <button type="button" onClick={() => { void navigator.clipboard.writeText(setup.secret); toast('کلیلەکە کۆپی کرا.', 'success'); }} className="flex w-full items-center justify-between rounded-2xl border border-line bg-[color:var(--surface-2)] px-3 py-2 font-mono text-[11px] text-ink">
              <span className="truncate" dir="ltr">{setup.secret}</span>
              <Copy size={13} className="shrink-0 text-muted" />
            </button>
            <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="— — — — — —" inputMode="numeric" className="input text-center font-mono text-xl tracking-[0.5em]" autoFocus maxLength={6} />
            <button type="button" className="btn-primary w-full !py-3" onClick={() => void enable2fa()} disabled={busy === 'enable' || code.length < 6}>
              {busy === 'enable' ? <Spinner size={16} /> : <ShieldCheck size={16} />} چالاککردن
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}

function KeysTab() {
  const user = useAuthStore((state) => state.user);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMatches, setImportMatches] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    ensureIdentity(user)
      .then(setIdentity)
      .catch((error) => toast(errorMessage(error), 'error'))
      .finally(() => setLoading(false));
  }, [user]);

  const download = () => {
    if (!identity || !user) return;
    const content = exportIdentity(identity, user);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `kurdbook-key-${user.username}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast('کلیلەکە دابەزێنرا. فایلەکە بە نهێنی هەڵبگرە.', 'success');
  };

  const readImport = async (file: File | null) => {
    if (!file || !user) return;
    const text = await file.text();
    setImportText(text);
    try {
      const result = validateIdentityBackup(text, user);
      setImportMatches(result.matchesUser);
    } catch (error) {
      toast(errorMessage(error), 'error');
      setImportMatches(null);
    }
  };

  const confirmImport = async () => {
    if (!user) return;
    try {
      const result = validateIdentityBackup(importText, user);
      if (!result.matchesUser) {
        toast('ئەم کلیلە بۆ بەکارهێنەرێکی ترە.', 'error');
        return;
      }
      if (!window.confirm('دوای گۆڕینی کلیل، نامەکانی کۆن لەم ئامێرەوە ناخوێنرێنەوە. دڵنیایت؟')) return;
      setBusy(true);
      await publishIdentity(user.id, result.identity);
      setIdentity(result.identity);
      setImportOpen(false);
      setImportText('');
      setImportMatches(null);
      toast('کلیلەکە گەڕێندرایەوە. 🔑', 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    if (!user) return;
    if (!window.confirm('ئاگاداری: کلیلی نوێ دروست دەکرێت و نامەکانی کۆن ناخوێنرێنەوە. پێشتر کلیلەکەت دابەزێنە! دڵنیایت؟')) return;
    setBusy(true);
    try {
      deleteIdentity(user.id);
      const fresh = generateIdentity();
      await publishIdentity(user.id, fresh);
      setIdentity(fresh);
      toast('کلیلی نوێ دروست کرا. نامەکانی کۆن ئیتر ناخوێنرێنەوە.', 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SettingsSection icon={<KeyRound size={18} />} title="کلیلی ئێندۆ-ئێندۆ" description="کلیلەکە لەسەر ئەم ئامێرە هەڵدەگیرێت و هەرگیز بۆ سێرڤەر ناگوازرێتەوە.">
        {loading ? (
          <div className="flex justify-center py-6"><Spinner className="text-muted" /></div>
        ) : identity ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-line bg-[color:var(--surface-2)]/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-muted">کلیلی گشتی</span>
                <button type="button" onClick={() => { void navigator.clipboard.writeText(identity.publicKey); toast('کلیلەکە کۆپی کرا.', 'success'); }} className="text-muted hover:text-ink"><Copy size={13} /></button>
              </div>
              <p className="mt-1 break-all font-mono text-[10px] leading-5 text-ink" dir="ltr">{identity.publicKey}</p>
              <p className="mt-2 text-[9px] text-muted-2">دروستکراوە: {formatDate(identity.createdAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary !rounded-xl !px-3 !py-2 !text-[11px]" onClick={download}>
                <Download size={14} /> دابەزاندنی کلیل
              </button>
              <button type="button" className="btn-soft !rounded-xl !px-3 !py-2 !text-[11px]" onClick={() => setImportOpen(true)}>
                <Upload size={14} /> گەڕاندنەوە لە فایل
              </button>
            </div>
          </div>
        ) : (
          <Alert kind="error">کلیلەکە نەدۆزرایەوە. دووبارە هەوڵ بدە.</Alert>
        )}
      </SettingsSection>

      <SettingsSection icon={<Sparkles size={18} />} title="کلیلی نوێ" description="تەنها ئەگەر کلیلە کۆنەکەت لەدەستداوە یان ئامێرەکەت گۆڕیوە.">
        <Alert kind="warning">
          دروستکردنی کلیلی نوێ واتە نامەکانی کۆن لەم ئامێرەوە ناخوێنرێنەوە. هەمیشە سەرەتا کلیلەکەت دابەزێنە و بە نهێنی هەڵبگرە.
        </Alert>
        <button type="button" className="btn-danger mt-3 !rounded-xl !px-3 !py-2 !text-[11px]" onClick={() => void regenerate()} disabled={busy}>
          {busy ? <Spinner size={14} /> : <KeyRound size={14} />} دروستکردنی کلیلی نوێ
        </button>
      </SettingsSection>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="گەڕاندنەوەی کلیل" subtitle="فایلی JSON کە پێشتر دابەزاندووت." size="sm">
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void readImport(event.target.files?.[0] || null)} />
          <button type="button" className="btn-soft w-full !text-xs" onClick={() => fileRef.current?.click()}><Upload size={14} /> هەڵبژاردنی فایل</button>
          {importText && (
            <>
              <textarea value={importText} onChange={(event) => setImportText(event.target.value)} className="textarea !min-h-[130px] font-mono !text-[10px]" dir="ltr" />
              {importMatches === false && <Alert kind="error">ئەم کلیلە بۆ بەکارهێنەرێکی ترە.</Alert>}
              {importMatches === true && <Alert kind="success">کلیلەکە دروستە و بۆ ئەم هەژمارەدایە.</Alert>}
            </>
          )}
          <button type="button" className="btn-primary w-full !py-2.5" onClick={() => void confirmImport()} disabled={busy || !importText || !importMatches}>
            {busy ? <Spinner size={15} /> : <KeyRound size={15} />} گەڕاندنەوە
          </button>
        </div>
      </Modal>
    </>
  );
}

function BlocksTab() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ users: User[] }>('/api/users/me/blocks');
      setUsers(data.users);
    } catch (error) {
      toast(errorMessage(error), 'error');
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unblock = async (user: User) => {
    setBusy(user.id);
    try {
      await api(`/api/users/${user.id}/block`, { method: 'DELETE' });
      setUsers((current) => current?.filter((item) => item.id !== user.id) || []);
      toast('بلۆکەکە لابرا.', 'success');
    } catch (error) {
      toast(errorMessage(error), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SettingsSection icon={<Ban size={18} />} title="بەکارهێنەرە بلۆککراوەکان" description="ئەم کەسانە ناتوانن پەیوەندیت پێوە بکەن یان پرۆفایلەکەت ببینن.">
      {users === null ? (
        <div className="flex justify-center py-6"><Spinner className="text-muted" /></div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line py-10 text-muted">
          <Users size={24} />
          <p className="text-[11px]">هیچ بەکارهێنەرێکی بلۆککراو نییە.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {users.map((blocked) => (
            <UserCard
              key={blocked.id}
              user={blocked}
              compact
              actions={
                <button type="button" className="btn-soft !rounded-xl !px-3 !py-1.5 !text-[10px]" onClick={() => void unblock(blocked)} disabled={busy === blocked.id}>
                  {busy === blocked.id ? <Spinner size={12} /> : <X size={12} />} لابردنی بلۆک
                </button>
              }
            />
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
