// Data models ported from `apps/web/src/types.ts` for the native client.

class User {
  User({
    required this.id,
    required this.username,
    required this.name,
    this.email,
    this.phone,
    this.avatarUrl,
    this.coverUrl,
    this.bio,
    this.city,
    this.gender,
    this.birthDate,
    this.verificationStatus = 'NONE',
    this.verifiedAt,
    this.isPro = false,
    this.proExpiresAt,
    this.theme,
    this.voiceEffect,
    this.role = 'USER',
    this.twoFactorEnabled = false,
    this.emailVerifiedAt,
    this.phoneVerifiedAt,
    this.publicKey,
    this.disabled = false,
    required this.createdAt,
    required this.lastActiveAt,
    this.online,
    this.unreadNotifications = 0,
    this.pendingFriendRequests = 0,
    this.unreadConversations = 0,
    this.friendCount,
    this.friendshipId,
    this.friendsSince,
    this.mutualFriends,
  });

  final String id;
  final String username;
  final String name;
  final String? email;
  final String? phone;
  final String? avatarUrl;
  final String? coverUrl;
  final String? bio;
  final String? city;
  final String? gender;
  final String? birthDate;
  final String? verificationStatus;
  final String? verifiedAt;
  final bool isPro;
  final String? proExpiresAt;
  final String? theme;
  final String? voiceEffect;
  final String role;
  final bool twoFactorEnabled;
  final String? emailVerifiedAt;
  final String? phoneVerifiedAt;
  final String? publicKey;
  final bool disabled;
  final String createdAt;
  final String lastActiveAt;
  final bool? online;
  final int unreadNotifications;
  final int pendingFriendRequests;
  final int unreadConversations;
  final int? friendCount;
  final String? friendshipId;
  final String? friendsSince;
  final int? mutualFriends;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'id': id,
        'username': username,
        'name': name,
        'email': email,
        'phone': phone,
        'avatarUrl': avatarUrl,
        'coverUrl': coverUrl,
        'bio': bio,
        'city': city,
        'gender': gender,
        'birthDate': birthDate,
        'verificationStatus': verificationStatus,
        'verifiedAt': verifiedAt,
        'isPro': isPro,
        'proExpiresAt': proExpiresAt,
        'theme': theme,
        'voiceEffect': voiceEffect,
        'role': role,
        'twoFactorEnabled': twoFactorEnabled,
        'emailVerifiedAt': emailVerifiedAt,
        'phoneVerifiedAt': phoneVerifiedAt,
        'publicKey': publicKey,
        'disabled': disabled,
        'createdAt': createdAt,
        'lastActiveAt': lastActiveAt,
        'online': online,
        'unreadNotifications': unreadNotifications,
        'pendingFriendRequests': pendingFriendRequests,
        'unreadConversations': unreadConversations,
        'friendCount': friendCount,
        'friendshipId': friendshipId,
        'friendsSince': friendsSince,
        'mutualFriends': mutualFriends,
      };

  static User fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String? ?? '',
      username: json['username'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      coverUrl: json['coverUrl'] as String?,
      bio: json['bio'] as String?,
      city: json['city'] as String?,
      gender: json['gender'] as String?,
      birthDate: json['birthDate'] as String?,
      verificationStatus: json['verificationStatus'] as String? ?? 'NONE',
      verifiedAt: json['verifiedAt'] as String?,
      isPro: (json['isPro'] as bool?) ?? false,
      proExpiresAt: json['proExpiresAt'] as String?,
      theme: json['theme'] as String?,
      voiceEffect: json['voiceEffect'] as String?,
      role: json['role'] as String? ?? 'USER',
      twoFactorEnabled: (json['twoFactorEnabled'] as bool?) ?? false,
      emailVerifiedAt: json['emailVerifiedAt'] as String?,
      phoneVerifiedAt: json['phoneVerifiedAt'] as String?,
      publicKey: json['publicKey'] as String?,
      disabled: (json['disabled'] as bool?) ?? false,
      createdAt: json['createdAt'] as String? ?? '',
      lastActiveAt: json['lastActiveAt'] as String? ?? '',
      online: (json['online'] as bool?) ?? false,
      unreadNotifications: (json['unreadNotifications'] as int?) ?? 0,
      pendingFriendRequests: (json['pendingFriendRequests'] as int?) ?? 0,
      unreadConversations: (json['unreadConversations'] as int?) ?? 0,
      friendCount: (json['friendCount'] as int?) ?? 0,
      friendshipId: json['friendshipId'] as String?,
      friendsSince: json['friendsSince'] as String?,
      mutualFriends: (json['mutualFriends'] as int?) ?? 0,
    );
  }
}

class AuthPayload {
  AuthPayload({required this.accessToken, this.refreshToken, required this.user});

  final String accessToken;
  final String? refreshToken;
  final User user;
}

class MediaItem {
  MediaItem({required this.url, required this.type, this.width, this.height, this.name, this.duration});

  final String url;
  final String type;
  final int? width;
  final int? height;
  final String? name;
  final int? duration;
}

class Post {
  Post({
    required this.id,
    required this.authorId,
    required this.author,
    required this.content,
    required this.media,
    required this.visibility,
    required this.likeCount,
    required this.commentCount,
    required this.createdAt,
    required this.updatedAt,
    required this.likedByMe,
    this.comments,
  });

  final String id;
  final String authorId;
  final User author;
  final String content;
  final List<MediaItem> media;
  final String visibility;
  final int likeCount;
  final int commentCount;
  final String createdAt;
  final String updatedAt;
  final bool likedByMe;
  final List<Comment>? comments;
}

class Comment {
  Comment({required this.id, required this.postId, required this.userId, required this.content, required this.createdAt, required this.user});

  final String id;
  final String postId;
  final String userId;
  final String content;
  final String createdAt;
  final User user;
}

class Story {
  Story({required this.id, required this.mediaUrl, required this.mediaType, this.caption, required this.createdAt, required this.expiresAt, required this.viewed, required this.viewCount, required this.isMine});

  final String id;
  final String mediaUrl;
  final String mediaType;
  final String? caption;
  final String createdAt;
  final String expiresAt;
  final bool viewed;
  final int viewCount;
  final bool isMine;
}

class StoryGroup {
  StoryGroup({required this.user, required this.stories, required this.allViewed});

  final User user;
  final List<Story> stories;
  final bool allViewed;
}

class FriendRequest {
  FriendRequest({required this.id, required this.user, required this.createdAt});

  final String id;
  final User user;
  final String createdAt;
}

class ChatPeer {
  ChatPeer({required this.id, required this.username, required this.name, this.avatarUrl, required this.verificationStatus, required this.isPro, this.publicKey});

  final String id;
  final String username;
  final String name;
  final String? avatarUrl;
  final String? verificationStatus;
  final bool isPro;
  final String? publicKey;
}

class ConversationMemberInfo extends ChatPeer {
  ConversationMemberInfo({required super.id, required super.username, required super.name, super.avatarUrl, required super.verificationStatus, required super.isPro, super.publicKey, required this.lastReadAt, required this.muted});

  final String lastReadAt;
  final bool muted;
}

class EncryptedMessage {
  EncryptedMessage({required this.id, required this.conversationId, required this.senderId, required this.type, required this.ciphertext, required this.nonce, required this.salt, required this.protocol, this.clientId, required this.createdAt, this.deletedAt, this.sender});

  final String id;
  final String conversationId;
  final String senderId;
  final String type;
  final String ciphertext;
  final String nonce;
  final String salt;
  final int protocol;
  final String? clientId;
  final String createdAt;
  final String? deletedAt;
  final ChatPeer? sender;
}

class Conversation {
  Conversation({required this.id, required this.isGroup, this.title, this.avatarUrl, required this.peer, required this.members, required this.lastMessage, required this.unreadCount, required this.lastReadAt, required this.peerLastReadAt, required this.lastMessageAt, required this.createdAt});

  final String id;
  final bool isGroup;
  final String? title;
  final String? avatarUrl;
  final ChatPeer? peer;
  final List<ConversationMemberInfo> members;
  final EncryptedMessage? lastMessage;
  final int unreadCount;
  final String? lastReadAt;
  final String? peerLastReadAt;
  final String lastMessageAt;
  final String createdAt;
}

class DecodedMedia {
  DecodedMedia({required this.url, required this.key, required this.nonce, required this.mime, required this.name, required this.duration, required this.kind});

  final String url;
  final String key;
  final String nonce;
  final String mime;
  final String name;
  final int? duration;
  final String kind;
}

class DecodedMessagePayload {
  DecodedMessagePayload({required this.v, required this.text, this.media, this.sticker, this.emoji});

  final int v;
  final String text;
  final DecodedMedia? media;
  final String? sticker;
  final String? emoji;
}

class AppNotification {
  AppNotification({required this.id, required this.type, required this.title, required this.body, required this.data, required this.createdAt, this.readAt});

  final String id;
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic> data;
  final String? readAt;
  final String createdAt;
}

class LiveRoom {
  LiveRoom({required this.id, required this.hostId, required this.host, required this.roomName, required this.title, required this.isLive, required this.startedAt, this.endedAt, this.participantCount, this.isHost});

  final String id;
  final String hostId;
  final User host;
  final String roomName;
  final String title;
  final bool isLive;
  final String startedAt;
  final String? endedAt;
  final int? participantCount;
  final bool? isHost;
}

class ProPlan {
  ProPlan({required this.id, required this.label, required this.amount, required this.days, this.badge, this.description});

  final String id;
  final String label;
  final int amount;
  final int days;
  final String? badge;
  final String? description;
}

class ProProvider {
  ProProvider({required this.id, required this.name, required this.subtitle, required this.mode});

  final String id;
  final String name;
  final String subtitle;
  final String mode;
}

class ProRequest {
  ProRequest({required this.id, required this.plan, required this.provider, required this.amount, required this.currency, required this.status, this.note, this.receiptUrl, required this.createdAt, this.reviewedAt, this.payment});

  final String id;
  final String plan;
  final String provider;
  final int amount;
  final String currency;
  final String status;
  final String? note;
  final String? receiptUrl;
  final String createdAt;
  final String? reviewedAt;
  final ProPayment? payment;
}

class ProPayment {
  ProPayment({required this.id, required this.status, this.provider, this.paidAt});

  final String id;
  final String status;
  final String? provider;
  final String? paidAt;
}

class FibPaymentInfo {
  FibPaymentInfo({required this.paymentId, this.readableCode, this.qrCode, this.validUntil, this.personalAppLink, this.businessAppLink, this.corporateAppLink});

  final String paymentId;
  final String? readableCode;
  final String? qrCode;
  final String? validUntil;
  final String? personalAppLink;
  final String? businessAppLink;
  final String? corporateAppLink;
}

class ApiErrorShape {
  ApiErrorShape({required this.code, required this.message, this.details});

  final String code;
  final String message;
  final dynamic details;
}

class Paginated<T> {
  Paginated({required this.items, required this.nextCursor});

  final List<T> items;
  final String? nextCursor;
}

class Relationship {
  Relationship({required this.isMe, required this.isFriend, required this.incomingRequest, required this.outgoingRequest, required this.blocked, this.friendshipId});

  final bool isMe;
  final bool isFriend;
  final bool incomingRequest;
  final bool outgoingRequest;
  final bool blocked;
  final String? friendshipId;
}

class ProfilePayload {
  ProfilePayload({required this.user, required this.relationship});

  final User user;
  final Relationship relationship;
}

class VerificationRequest {
  VerificationRequest({required this.id, required this.status, required this.frontUrl, required this.backUrl, required this.selfieUrl, this.note, required this.createdAt, this.reviewedAt});

  final String id;
  final String status;
  final String frontUrl;
  final String backUrl;
  final String selfieUrl;
  final String? note;
  final String createdAt;
  final String? reviewedAt;
}

class VerificationState {
  VerificationState({required this.status, required this.requests, this.verifiedAt});

  final String status;
  final List<VerificationRequest> requests;
  final String? verifiedAt;
}

class LiveTokenPayload {
  LiveTokenPayload({required this.token, required this.serverUrl, required this.roomName, required this.identity, required this.isHost, required this.isPro, required this.maxHeight, required this.title, required this.host});

  final String token;
  final String serverUrl;
  final String roomName;
  final String identity;
  final bool isHost;
  final bool isPro;
  final int maxHeight;
  final String title;
  final User host;
}

class CheckoutResult {
  CheckoutResult({required this.mode, required this.proRequest, this.payment, this.fib, required this.message});

  final String mode;
  final ProRequest proRequest;
  final ProPayment? payment;
  final FibPaymentInfo? fib;
  final String message;
}
