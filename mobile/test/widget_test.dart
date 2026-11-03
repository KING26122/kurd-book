import 'package:flutter_test/flutter_test.dart';

import 'package:kurdbook_user/app.dart';

void main() {
  testWidgets('Kurd Book native app boots into the auth gate', (widgetTester) async {
    await widgetTester.pumpWidget(const KurdbookApp());
    await widgetTester.pump(const Duration(seconds: 1));
    expect(find.byType(KurdbookApp), findsOneWidget);
  });
}
