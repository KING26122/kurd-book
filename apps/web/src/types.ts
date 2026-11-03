export type ThemeId = 'dark' | 'moredark' | 'rush' | 'gold';
export type VoiceEffect = 'natural' | 'warm' | 'radio' | 'echo' | 'deep' | 'bright';

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  verificationStatus: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: string | null;
  isPro: boolean;
  proExpiresAt?: string | null;
  theme?: ThemeId;
  voiceEffect?: VoiceEffect;
  role?: 'USER' | 'ADMIN';
  twoFactorEnabled?: boolean;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  publicKey?: string | null;
  disabled?: boolean;
  createdAt: string;
  lastActiveAt: string;
  online?: boolean;
  unreadNotifications?: number;
  pendingFriendRequests?: number;
  unreadConversations?: number;
  friendCount?: number;
  friendshipId?: string;
  friendsSince?: string;
  mutualFriends?: number;
}

export interface AuthPayload {
  accessToken: string;
  user: User;
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  name?: string;
  duration?: number;
}

export interface Post {
  id: string;
  authorId: string;
  author: User;
  content: string;
  media: MediaItem[];
  visibility: 'PUBLIC' | 'FRIENDS';
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  likedByMe: boolean;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: User;
}

export interface Story {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string | null;
  createdAt: string;
  expiresAt: string;
  viewed: boolean;
  viewCount: number;
  isMine: boolean;
}

export interface StoryGroup {
  user: User;
  stories: Story[];
  allViewed: boolean;
}

export interface FriendRequest {
  id: string;
  user: User;
  createdAt: string;
}

export interface ChatPeer {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  verificationStatus: string;
  isPro: boolean;
  publicKey?: string | null;
}

export interface ConversationMemberInfo extends ChatPeer {
  lastReadAt: string;
  muted: boolean;
}

export interface EncryptedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'MEDIA' | 'VOICE' | 'STICKER' | 'EMOJI';
  ciphertext: string;
  nonce: string;
  salt: string;
  protocol: number;
  clientId?: string | null;
  createdAt: string;
  deletedAt?: string | null;
  sender?: ChatPeer;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  title: string;
  avatarUrl?: string | null;
  peer: ChatPeer | null;
  members: ConversationMemberInfo[];
  lastMessage: EncryptedMessage | null;
  unreadCount: number;
  lastReadAt?: string | null;
  peerLastReadAt?: string | null;
  lastMessageAt: string;
  createdAt: string;
}

export interface DecodedMedia {
  url: string;
  key: string;
  nonce: string;
  mime: string;
  name?: string;
  duration?: number;
  kind: 'image' | 'video' | 'audio' | 'file';
}

export interface DecodedMessagePayload {
  v: 1;
  text: string;
  media?: DecodedMedia;
  sticker?: string;
  emoji?: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
}

export interface LiveRoom {
  id: string;
  hostId: string;
  host: User;
  roomName: string;
  title: string;
  isLive: boolean;
  startedAt: string;
  endedAt?: string | null;
  participantCount?: number;
  isHost?: boolean;
}

export interface ProPlan {
  id: 'MONTHLY' | 'YEARLY';
  label: string;
  amount: number;
  days: number;
  badge?: string;
  description: string;
}

export interface ProProvider {
  id: 'FIB' | 'FASTPAY' | 'QICARD';
  name: string;
  subtitle: string;
  mode: 'sandbox' | 'live' | 'manual' | 'unconfigured';
}

export interface ProRequest {
  id: string;
  plan: 'MONTHLY' | 'YEARLY';
  provider: string;
  amount: number;
  currency: string;
  status: string;
  note?: string | null;
  receiptUrl?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  payment?: {
    id: string;
    status: string;
    provider: string;
    paidAt?: string | null;
  } | null;
}

export interface FibPaymentInfo {
  paymentId: string;
  readableCode?: string;
  qrCode?: string;
  validUntil?: string;
  personalAppLink?: string;
  businessAppLink?: string;
  corporateAppLink?: string;
}

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Relationship {
  isMe: boolean;
  isFriend: boolean;
  incomingRequest: boolean;
  outgoingRequest: boolean;
  blocked: boolean;
  friendshipId?: string | null;
}

export interface ProfilePayload {
  user: User & {
    _count?: { posts: number; stories: number };
  };
  relationship: Relationship;
}

export interface VerificationRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  frontUrl: string;
  backUrl: string;
  selfieUrl: string;
}

export interface VerificationState {
  status: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: string | null;
  requests: VerificationRequest[];
}

export interface LiveTokenPayload {
  token: string;
  serverUrl: string;
  roomName: string;
  identity: string;
  isHost: boolean;
  isPro: boolean;
  maxHeight: number;
  title: string;
  host: User;
}

export interface CheckoutResult {
  mode: 'sandbox' | 'live' | 'manual';
  proRequest: ProRequest;
  payment?: { id: string; provider?: string; amount?: number; status: string };
  fib?: FibPaymentInfo;
  message: string;
}

export interface FaceSticker {
  id: string;
  glyph: string;
  label: string;
}
