import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { IUserPayload } from '../types';

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};
  const list: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookieStr) => {
    const parts = cookieStr.split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      list[name] = decodeURIComponent(val);
    }
  });
  return list;
};

let ioInstance: SocketIOServer | null = null;

export interface AuthenticatedSocket extends Socket {
  user?: IUserPayload;
}

export const initSocket = (io: SocketIOServer): void => {
  ioInstance = io;

  // Socket authentication middleware supporting Cookies and Auth token
  io.use((socket: AuthenticatedSocket, next) => {
    let token = socket.handshake.auth?.token;

    // Parse cookie from handshake header
    if (!token && socket.handshake.headers.cookie) {
      try {
        const parsedCookies = parseCookies(socket.handshake.headers.cookie);
        token = parsedCookies.token;
      } catch (e) {
        // Continue
      }
    }

    if (!token && socket.handshake.headers?.authorization?.startsWith('Bearer ')) {
      token = socket.handshake.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new Error('Authentication error: Session token required'));
    }

    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as IUserPayload;
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid session token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.id;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('join:project', (projectId: string) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on('leave:project', (projectId: string) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    socket.on('join:org', (orgId: string) => {
      if (orgId) {
        socket.join(`org:${orgId}`);
      }
    });

    socket.on('leave:org', (orgId: string) => {
      if (orgId) {
        socket.leave(`org:${orgId}`);
      }
    });

    socket.on('disconnect', () => {
      // Disconnected
    });
  });
};

export const getIO = (): SocketIOServer => {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized');
  }
  return ioInstance;
};

export const emitToProject = (projectId: string, event: string, data: any): void => {
  if (ioInstance) {
    ioInstance.to(`project:${projectId}`).emit(event, data);
  }
};

export const emitToOrg = (orgId: string, event: string, data: any): void => {
  if (ioInstance) {
    ioInstance.to(`org:${orgId}`).emit(event, data);
  }
};

export const emitToUser = (userId: string, event: string, data: any): void => {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
};
