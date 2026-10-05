import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const initSocketClient = (): Socket => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    withCredentials: true, // Automatically sends HTTP-only session cookies
    transports: ['websocket', 'polling'],
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const joinProjectRoom = (projectId: string): void => {
  if (socket && projectId) {
    socket.emit('join:project', projectId);
  }
};

export const leaveProjectRoom = (projectId: string): void => {
  if (socket && projectId) {
    socket.emit('leave:project', projectId);
  }
};

export const joinOrgRoom = (orgId: string): void => {
  if (socket && orgId) {
    socket.emit('join:org', orgId);
  }
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
