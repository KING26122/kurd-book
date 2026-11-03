import 'package:flutter/widgets.dart';

class AppRoute {
  const AppRoute({required this.pattern, required this.builder});

  final String pattern;
  final Widget Function(BuildContext context, Map<String, String> params) builder;
}

final List<AppRoute> appRoutes = <AppRoute>[];

final AppRouter appRouter = AppRouter();

class AppRouter {
  final ValueNotifier<String> path = ValueNotifier<String>('/');
  final List<String> _stack = <String>['/'];

  String get current => path.value;
  bool get canGoBack => _stack.length > 1;

  Future<void> push(String next) async {
    if (next == current) {
      return;
    }
    _stack.add(current);
    path.value = next;
  }

  void replace(String next) {
    final index = _stack.length - 1;
    if (index >= 0) {
      _stack[index] = next;
    }
    path.value = next;
  }

  void back() {
    if (_stack.length <= 1) {
      return;
    }
    path.value = _stack.removeLast();
  }

  void reset(String next) {
    _stack
      ..clear()
      ..add(next);
    path.value = next;
  }
}

/// Resolves a concrete path (optionally containing `:param`) to a widget.
class AppRouterHelper {
  static Widget? resolve(BuildContext context, String path, WidgetBuilder fallback) {
    final patternSegments = <String>[];
    for (final segment in path.split('/')) {
      if (segment.isEmpty) continue;
      patternSegments.add(segment);
    }

    for (final route in appRoutes) {
      final routeSegments = <String>[];
      for (final segment in route.pattern.split('/')) {
        if (segment.isEmpty) continue;
        routeSegments.add(segment);
      }
      if (routeSegments.length != patternSegments.length) {
        continue;
      }
      final params = <String, String>{};
      var matched = true;
      for (var i = 0; i < routeSegments.length; i++) {
        final routeSegment = routeSegments[i];
        final pathSegment = patternSegments[i];
        if (routeSegment.startsWith(':')) {
          params[routeSegment.substring(1)] = pathSegment;
        } else if (routeSegment != pathSegment) {
          matched = false;
          break;
        }
      }
      if (matched) {
        return route.builder(context, params);
      }
    }

    return fallback(context);
  }
}
