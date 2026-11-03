import 'package:socket_io_client/socket_io_client.dart';

/// Socket.IO singleton for the native client — mirrors `apps/web/src/lib/socket.ts`.
class KurdBookSocket {
  static Socket? _socket;

  static Socket? get instance => _socket;

  static Socket connect(String token) {
    disconnect();
    final socket = io(
      'https://kurdbook.app',
      <String, dynamic>{
        'path': '/socket.io',
        'transports': ['websocket', 'polling'],
        'auth': <String, dynamic>{'token': token},
      },
    );
    socket.on('connect', (dynamic _) {});
    socket.on('disconnect', (dynamic _) {});
    socket.on('connect_error', (dynamic _) {});
    _socket = socket;
    return socket;
  }

  static void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }
}
