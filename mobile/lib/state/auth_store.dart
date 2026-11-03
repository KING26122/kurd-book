import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../data/models.dart';

/// Global auth store instance shared across the native client.
final AuthStore authStore = AuthStore();
/// Holds the native (Flutter) user session. Mirrors `apps/web/src/stores/auth.ts`.
class AuthStore extends ChangeNotifier {
  User? user;
  String? accessToken;
  String? refreshToken;
  bool ready = false;
  bool twoFactorRequired = false;
  String? twoFactorChallenge;

  static const String _accessKey = 'kurdbook_access_token';
  static const String _refreshKey = 'kurdbook_refresh_token';

  Future<void> bootstrap({Future<AuthPayload?> Function()? refresh}) async {
    final storedAccess = await _read(_accessKey);
    final storedRefresh = await _read(_refreshKey);
    accessToken = storedAccess;
    refreshToken = storedRefresh;
    if (storedAccess == null || storedRefresh == null) {
      ready = true;
      return;
    }
    final payload = await refresh?.call();
    if (payload != null) {
      await setSession(payload);
    } else {
      await clear();
    }
  }

  Future<void> setSession(AuthPayload payload) async {
    accessToken = payload.accessToken;
    refreshToken = payload.refreshToken ?? refreshToken;
    user = payload.user;
    ready = true;
    notifyListeners();
    await _write(_accessKey, payload.accessToken);
    if (payload.refreshToken != null) {
      await _write(_refreshKey, payload.refreshToken!);
    }
  }

  void setUser(User value) {
    user = value;
    notifyListeners();
  }

  void patchUser(Map<String, dynamic> patch) {
    final current = user;
    if (current == null) {
      return;
    }
    user = User(
      id: current.id,
      username: patch['username'] as String? ?? current.username,
      name: patch['name'] as String? ?? current.name,
      email: patch['email'] as String? ?? current.email,
      phone: patch['phone'] as String? ?? current.phone,
      avatarUrl: patch['avatarUrl'] as String? ?? current.avatarUrl,
      coverUrl: patch['coverUrl'] as String? ?? current.coverUrl,
      bio: patch['bio'] as String? ?? current.bio,
      city: patch['city'] as String? ?? current.city,
      gender: patch['gender'] as String? ?? current.gender,
      birthDate: patch['birthDate'] as String? ?? current.birthDate,
      verificationStatus: patch['verificationStatus'] as String? ?? current.verificationStatus,
      verifiedAt: patch['verifiedAt'] as String? ?? current.verifiedAt,
      isPro: (patch['isPro'] as bool?) ?? current.isPro,
      proExpiresAt: patch['proExpiresAt'] as String? ?? current.proExpiresAt,
      theme: patch['theme'] as String? ?? current.theme,
      voiceEffect: patch['voiceEffect'] as String? ?? current.voiceEffect,
      role: patch['role'] as String? ?? current.role,
      twoFactorEnabled: (patch['twoFactorEnabled'] as bool?) ?? current.twoFactorEnabled,
      emailVerifiedAt: patch['emailVerifiedAt'] as String? ?? current.emailVerifiedAt,
      phoneVerifiedAt: patch['phoneVerifiedAt'] as String? ?? current.phoneVerifiedAt,
      publicKey: patch['publicKey'] as String? ?? current.publicKey,
      disabled: (patch['disabled'] as bool?) ?? current.disabled,
      createdAt: current.createdAt,
      lastActiveAt: current.lastActiveAt,
      online: (patch['online'] as bool?) ?? current.online,
      unreadNotifications: (patch['unreadNotifications'] as int?) ?? current.unreadNotifications,
      pendingFriendRequests: (patch['pendingFriendRequests'] as int?) ?? current.pendingFriendRequests,
      unreadConversations: (patch['unreadConversations'] as int?) ?? current.unreadConversations,
      friendCount: (patch['friendCount'] as int?) ?? current.friendCount,
      friendshipId: patch['friendshipId'] as String? ?? current.friendshipId,
      friendsSince: patch['friendsSince'] as String? ?? current.friendsSince,
      mutualFriends: (patch['mutualFriends'] as int?) ?? current.mutualFriends,
    );
    notifyListeners();
  }

  Future<void> clear() async {
    user = null;
    accessToken = null;
    refreshToken = null;
    ready = true;
    notifyListeners();
    await _delete(_accessKey);
    await _delete(_refreshKey);
  }

  Future<void> setTwoFactorRequired(bool required, String? challenge) async {
    twoFactorRequired = required;
    twoFactorChallenge = challenge;
    notifyListeners();
  }

  Future<void> resetTwoFactor() async {
    twoFactorRequired = false;
    twoFactorChallenge = null;
    notifyListeners();
  }

  final FlutterSecureStorage _storage = FlutterSecureStorage();

  Future<String?> _read(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (_) {
      return null;
    }
  }

  Future<void> _write(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (_) {
      // storage unavailable — keep in-memory only
    }
  }

  Future<void> _delete(String key) async {
    try {
      await _storage.delete(key: key);
    } catch (_) {
      // ignore
    }
  }
}
