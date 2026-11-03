import 'package:flutter/material.dart';

import '../widgets/kurdbook_widgets.dart';

class ToastItem {
  ToastItem({required this.id, required this.kind, required this.message});

  final int id;
  final String kind;
  final String message;
}

class ToastStore extends ChangeNotifier {
  List<ToastItem> toasts = <ToastItem>[];
  int counter = 0;

  void push(String message, {String kind = 'info'}) {
    final id = ++counter;
    toasts = <ToastItem>[...toasts, ToastItem(id: id, kind: kind, message: message)];
    notifyListeners();
    Future.delayed(Duration(milliseconds: kind == 'error' ? 6500 : 4200), () {
      final index = toasts.indexWhere((t) => t.id == id);
      if (index >= 0) {
        toasts = toasts.where((t) => t.id != id).toList();
        notifyListeners();
      }
    });
  }

  void dismiss(int id) {
    toasts = toasts.where((t) => t.id != id).toList();
    notifyListeners();
  }

  void success(String message) => push(message, kind: 'success');
  void error(String message) => push(message, kind: 'error');
  void info(String message) => push(message, kind: 'info');
}

final ToastStore toastStore = ToastStore();

class ToastHost extends StatelessWidget {
  const ToastHost({super.key});

  @override
  Widget build(BuildContext context) {
    return ScaffoldMessenger(
      child: _ToastStack(),
    );
  }
}

class _ToastStack extends StatelessWidget {
  const _ToastStack();

  @override
  Widget build(BuildContext context) {
    final store = toastStore;
    return _buildToasts(store);
  }

  Widget _buildToasts(ToastStore store) {
    return _toastList(store: store);
  }

  Widget _toastList({required ToastStore store}) {
    if (store.toasts.isEmpty) {
      return const SizedBox.shrink();
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: store.toasts.map((t) => _buildToast(t, store)).toList(),
    );
  }

  Widget _buildToast(ToastItem t, ToastStore store) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Material(
        color: KurdbookThemeState.current.surface3,
        child: InkWell(
          onTap: () => store.dismiss(t.id),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border(
                top: BorderSide(color: KurdbookThemeState.current.border),
                bottom: BorderSide(color: KurdbookThemeState.current.border),
                left: BorderSide(color: KurdbookThemeState.current.border),
                right: BorderSide(color: KurdbookThemeState.current.border),
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.info, size: 16, color: t.kind == 'error' ? KurdbookThemeState.current.danger : KurdbookThemeState.current.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    t.message,
                    style: TextStyle(fontFamily: 'Noto Kufi Arabic', fontSize: 13, color: KurdbookThemeState.current.text, height: 1.5),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
