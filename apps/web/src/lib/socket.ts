import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth';
import { refreshAccessToken } from '@/lib/api';

let socket: Socket | null = null;

/** One shared Socket.IO connection for the whole app. */
export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  const token = useAuthStore.getState().accessToken;
  if (socket) {
    if (socket.connected && token && (socket.auth as { token?: string })?.token === token) {
      return socket;
    }
    socket.disconnect();
    socket = null;
  }
  socket = io({
    path: '/socket.io',
    autoConnect: true,
    transports: ['websocket', 'polling'],
    auth: { token },
  });

  socket.on('connect_error', async (error) => {
    if (!socket) return;
    if (error.message === 'unauthorized') {
      const refreshed = await refreshAccessToken();
      if (refreshed && socket) {
        (socket.auth as { token?: string }).token = refreshed.accessToken;
        socket.connect();
      } else {
        socket.disconnect();
      }
    }
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/** Keeps the auth token fresh for reconnects after a token refresh. */
export function syncSocketToken(): void {
  const token = useAuthStore.getState().accessToken;
  if (socket && token) (socket.auth as { token?: string }).token = token;
}
