import 'package:flutter/material.dart';

import '../../data/api_client.dart';
import '../../data/models.dart';
import '../../navigation/app_router.dart';
import '../../state/auth_store.dart';
import '../../state/toast_store.dart';
import '../../widgets/kurdbook_widgets.dart';
import '../auth/auth_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _identifierController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _codeController = TextEditingController();

  bool _busy = false;
  String? _error;
  bool _twoFactor = false;
  String? _twoFactorChallenge;
  bool _needsVerify = false;
  String? _verifyChannel;
  String? _verifyIdentifier;
  String? _verifyCode;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _finish(AuthPayload payload) async {
    await authStore.setSession(payload);
    toastStore.success('بەخێربێیتەوە، ${payload.user.name}! 👋');
    if (mounted) {
      appRouter.reset('/');
    }
  }

  Future<void> _login() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final data = await apiClient.request<Map<String, dynamic>>(
        path: '/api/auth/login',
        method: 'POST',
        body: <String, dynamic>{'identifier': _identifierController.text.trim(), 'password': _passwordController.text},
        noAuth: true,
      );
      if (data['twoFactorRequired'] == true) {
        setState(() {
          _twoFactor = true;
          _twoFactorChallenge = data['challenge'] as String?;
        });
        toastStore.info('کۆدی 2FA لە ئەپی ئەوثەنتیکەرەکەتەوە بنووسە.');
        return;
      }
      final payload = data;
      if (payload['accessToken'] is String) {
        await _finish(AuthPayload(accessToken: payload['accessToken'] as String, refreshToken: payload['refreshToken'] as String?, user: User.fromJson(payload['user'] as Map<String, dynamic>)));
      }
    } catch (error) {
      final message = error is ApiError ? error.message : 'هەڵەیەک ڕوویدا.';
      setState(() => _error = message);
      if (error is ApiError && error.code == 'EMAIL_NOT_VERIFIED') {
        final details = error.details;
        final channel = details is Map ? details['channel'] as String? : null;
        final identifier = details is Map ? details['identifier'] as String? : null;
        if (channel != null && identifier != null) {
          setState(() {
            _needsVerify = true;
            _verifyChannel = channel;
            _verifyIdentifier = identifier;
          });
          await _resendOtp(channel, identifier);
        }
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _resendOtp(String channel, String identifier) async {
    try {
      await apiClient.request<Map<String, dynamic>>(
        path: '/api/auth/resend-otp',
        method: 'POST',
        body: <String, dynamic>{'channel': channel, 'identifier': identifier, 'purpose': 'REGISTER'},
        noAuth: true,
      );
      toastStore.success('کۆدی نوێ نێردرا.');
    } catch (_) {
      // ignore — surfaced via UI state
    }
  }

  Future<void> _verifyAccount() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final payload = await apiClient.request<AuthPayload>(
        path: '/api/auth/verify-register',
        method: 'POST',
        body: <String, dynamic>{'channel': _verifyChannel, 'identifier': _verifyIdentifier, 'code': (_verifyCode ?? _codeController.text).trim()},
        noAuth: true,
      );
      await _finish(payload);
    } catch (error) {
      if (mounted) {
        setState(() => _error = error is ApiError ? error.message : 'هەڵەیەک ڕوویدا.');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _verifyTwoFactor() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final payload = await apiClient.request<AuthPayload>(
        path: '/api/auth/2fa/verify-login',
        method: 'POST',
        body: <String, dynamic>{'challenge': _twoFactorChallenge, 'code': _codeController.text.trim()},
        noAuth: true,
      );
      await _finish(payload);
    } catch (error) {
      if (mounted) {
        setState(() => _error = error is ApiError ? error.message : 'کۆدی 2FA هەڵەیە یان بەسەرچووە.');
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = KurdbookThemeState.current;
    return AuthShell(
      title: _twoFactor ? 'پشتڕاستکردنەوەی دوو هەنگاو' : _needsVerify ? 'پشتڕاستکردنەوەی هەژمار' : 'بەخێربێیتەوە',
      subtitle: _twoFactor
          ? 'کۆدی ٦ ژمارەیی لە ئەپی ئەوثەنتیکەرەکەتەوە (Google Authenticator / Authy) بنووسە.'
          : _needsVerify
          ? 'کۆدی ٦ ژمارەیی بۆ $_verifyIdentifier نێردرا. کۆدەکە ٥ خولەک کارا دەبێت.'
          : 'بچۆ ژوورەوە بۆ ئەوەی لەگەڵ هاوڕێکانت بمێنیت.',
      footer: _needsVerify
          ? null
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextButton(
                  onPressed: () => appRouter.push('/forgot-password'),
                  child: Text('لەبیرت چووە؟', style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, fontWeight: FontWeight.w700, color: p.primary)),
                ),
              ],
            ),
      child: _twoFactor
          ? Form(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: p.surface2,
                      borderRadius: BorderRadius.circular(24),
                      border: Border(
                        top: BorderSide(color: p.border),
                        bottom: BorderSide(color: p.border),
                        left: BorderSide(color: p.border),
                        right: BorderSide(color: p.border),
                      ),
                    ),
                    child: Icon(Icons.shield, size: 44, color: p.primary),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _codeController,
                    textAlign: TextAlign.center,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    style: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 24, letterSpacing: 8, color: Colors.white),
                    decoration: InputDecoration(
                      hintText: '— — — — — —',
                      hintStyle: const TextStyle(fontFamily: 'Noto Kufi Arabic', color: Color(0xFF617692), fontSize: 22, letterSpacing: 8),
                      filled: true,
                      fillColor: const Color(0xFF0F1F35).withValues(alpha: 0.82),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.border)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.border)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.primary.withValues(alpha: 0.55))),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _busy ? null : _verifyTwoFactor,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF39E0B2),
                        foregroundColor: const Color(0xFF032018),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _busy ? const CircularProgressIndicator(color: Color(0xFF032018), strokeWidth: 2) : const Text('پشتڕاستکردنەوە', style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF032018))),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _twoFactor = false;
                        _error = null;
                      });
                    },
                    child: Text('گەڕانەوە بۆ چوونەژوورەوە', style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, color: p.primary, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            )
          : _needsVerify
          ? Form(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: p.surface2,
                      borderRadius: BorderRadius.circular(24),
                      border: Border(
                        top: BorderSide(color: p.border),
                        bottom: BorderSide(color: p.border),
                        left: BorderSide(color: p.border),
                        right: BorderSide(color: p.border),
                      ),
                    ),
                    child: Icon(Icons.verified, size: 44, color: p.primary),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _codeController,
                    textAlign: TextAlign.center,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    style: const TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 24, letterSpacing: 8, color: Colors.white),
                    decoration: InputDecoration(
                      hintText: '— — — — — —',
                      hintStyle: const TextStyle(fontFamily: 'Noto Kufi Arabic', color: Color(0xFF617692), fontSize: 22, letterSpacing: 8),
                      filled: true,
                      fillColor: const Color(0xFF0F1F35).withValues(alpha: 0.82),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.border)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.border)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.primary.withValues(alpha: 0.55))),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _busy ? null : _verifyAccount,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF39E0B2),
                        foregroundColor: const Color(0xFF032018),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _busy ? const CircularProgressIndicator(color: Color(0xFF032018), strokeWidth: 2) : const Text('پشتڕاستکردنەوە و چوونەژوورەوە', style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF032018))),
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _needsVerify = false;
                        _codeController.clear();
                        _error = null;
                      });
                    },
                    child: Text('گەڕانەوە', style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, color: p.muted, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            )
          : Form(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: p.dangerSoft,
                        borderRadius: BorderRadius.circular(16),
                        border: Border(
                          top: BorderSide(color: p.danger.withValues(alpha: 0.28)),
                          bottom: BorderSide(color: p.danger.withValues(alpha: 0.28)),
                          left: BorderSide(color: p.danger.withValues(alpha: 0.28)),
                          right: BorderSide(color: p.danger.withValues(alpha: 0.28)),
                        ),
                      ),
                      child: Text(_error!, style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, color: p.danger, height: 1.6)),
                    ),
                    const SizedBox(height: 14),
                  ],
                  TextField(
                    controller: _identifierController,
                    textAlign: TextAlign.right,
                    keyboardType: TextInputType.emailAddress,
                    style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 14, color: p.text),
                    decoration: InputDecoration(
                      hintText: 'demo@kurdbook.app یان 0750…',
                      hintStyle: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, color: p.muted2),
                      filled: true,
                      fillColor: const Color(0xFF0F1F35).withValues(alpha: 0.82),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.border)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.border)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.primary.withValues(alpha: 0.55))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _passwordController,
                    textAlign: TextAlign.right,
                    obscureText: true,
                    style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 14, color: p.text),
                    decoration: InputDecoration(
                      hintText: '••••••••',
                      hintStyle: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, color: p.muted2),
                      filled: true,
                      fillColor: const Color(0xFF0F1F35).withValues(alpha: 0.82),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.border)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.border)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: p.primary.withValues(alpha: 0.55))),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _busy ? null : _login,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF39E0B2),
                        foregroundColor: const Color(0xFF032018),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _busy
                          ? const CircularProgressIndicator(color: Color(0xFF032018), strokeWidth: 2)
                          : const Text('چوونەژوورەوە', style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF032018))),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.center,
                    child: TextButton(
                      onPressed: () => appRouter.push('/forgot-password'),
                      child: Text('لەبیرت چووە؟', style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, fontWeight: FontWeight.w700, color: p.primary)),
                    ),
                  ),
                  TextButton(
                    onPressed: () => appRouter.push('/register'),
                    child: Text('هەژمارێک دروست بکە', style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 12, color: p.muted, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
    );
  }
}
