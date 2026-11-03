export type AdminRole = 'USER' | 'ADMIN';
export type VerificationStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  verificationStatus: VerificationStatus;
  verifiedAt?: string | null;
  isPro: boolean;
  proExpiresAt?: string | null;
  role?: AdminRole;
  disabled?: boolean;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  createdAt: string;
  lastActiveAt: string;
  friendCount?: number;
  _count?: {
    posts: number;
    sentFriendRequests: number;
    receivedFriendRequests: number;
  };
}

export interface AuthPayload {
  accessToken: string;
  user: AdminUser;
}

export interface DailyPoint {
  day: string;
  active: number;
  newUsers: number;
  messages: number;
}

export interface AdminQueueVerification {
  id: string;
  userId: string;
  frontUrl: string;
  backUrl: string;
  selfieUrl: string;
  status: ReviewStatus;
  note?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  user: AdminUser;
  reviewedBy?: { id: string; name: string; username: string } | null;
}

export interface AdminQueuePro {
  id: string;
  userId: string;
  plan: 'MONTHLY' | 'YEARLY';
  provider: string;
  amount: number;
  currency: string;
  receiptUrl?: string | null;
  reference?: string | null;
  note?: string | null;
  status: ReviewStatus;
  createdAt: string;
  reviewedAt?: string | null;
  user: AdminUser;
  reviewedBy?: { id: string; name: string; username: string } | null;
  payment?: {
    id: string;
    status: string;
    provider: string;
    paidAt?: string | null;
    providerRef?: string;
  } | null;
}

export interface ReportEvidence {
  sender: string;
  sentAt: string;
  text: string;
}

export interface AdminReport {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string | null;
  evidence: ReportEvidence[];
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  note?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: { id: string; name: string; username: string } | null;
  reporter: AdminUser;
  targetUser?: AdminUser | null;
}

export interface AdminStats {
  totals: {
    totalUsers: number;
    activeToday: number;
    newToday: number;
    verifiedUsers: number;
    proUsers: number;
    disabledUsers: number;
    totalPosts: number;
    totalMessages: number;
    activeStories: number;
    pendingVerifications: number;
    pendingPro: number;
    openReports: number;
  };
  daily: DailyPoint[];
  recentUsers: AdminUser[];
  queues: {
    verifications: AdminQueueVerification[];
    proRequests: AdminQueuePro[];
    reports: AdminReport[];
  };
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
}

export interface AdminNotificationPayload {
  notifications: AdminNotification[];
  counts: {
    verifications: number;
    pro: number;
    reports: number;
    total: number;
  };
}

export interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface VerificationsResponse {
  requests: AdminQueueVerification[];
  total: number;
  page: number;
  pages: number;
}

export interface ProRequestsResponse {
  requests: AdminQueuePro[];
  total: number;
  page: number;
  pages: number;
}

export interface ReportsResponse {
  reports: AdminReport[];
  total: number;
  page: number;
  pages: number;
}

export interface UserDetail {
  user: AdminUser & {
    activity: Array<{ day: string; count: number }>;
    stats: {
      posts: number;
      comments: number;
      likesReceived: number;
      stories: number;
      messages: number;
      friends: number;
      reportsMade: number;
      reportsReceived: number;
    };
  };
}
