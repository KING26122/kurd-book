import 'package:flutter/material.dart';

import '../data/api_client.dart';
import '../state/auth_store.dart';
import '../state/toast_store.dart';
import '../theme/kurd_book_theme.dart';
import '../screens/auth/login_screen.dart';
import '../screens/shell_screen.dart';

class KurdbookApp extends StatelessWidget {
  const KurdbookApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'کورد بووک',
      debugShowCheckedModeBanner: false,
      theme: KurdbookTheme.build(KurdbookThemeId.dark),
      darkTheme: KurdbookTheme.build(KurdbookThemeId.dark),
      themeMode: ThemeMode.dark,
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _checked = false;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await authStore.bootstrap(refresh: apiClient.refreshAccessToken);
    if (mounted) {
      setState(() => _checked = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_checked) {
      return const Scaffold(
        backgroundColor: Color(0xFF07101D),
        body: Center(child: CircularProgressIndicator(color: Color(0xFF39E0B2))),
      );
    }

    if (authStore.user == null) {
      return const Scaffold(
        backgroundColor: Color(0xFF07101D),
        body: LoginScreen(),
      );
    }

    return const Scaffold(
      backgroundColor: Color(0xFF07101D),
      body: ShellScreen(),
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
    );
  }
}

class KurdbookToastHost extends StatelessWidget {
  const KurdbookToastHost({super.key});

  @override
  Widget build(BuildContext context) {
    return const ToastHost();
  }
}
