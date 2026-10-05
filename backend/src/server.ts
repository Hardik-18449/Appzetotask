import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/db';
import { initSocket } from './services/socketService';
import { checkApproachingDeadlines } from './services/notificationService';
import { User } from './models/User';
import { seedDatabase } from './utils/seed';
import { ENV } from './config/env';

const startServer = async () => {
  try {
    await connectDB();

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Server] No users detected. Automatically seeding demo dataset...');
      await seedDatabase(true);
    }

    const app = createApp();
    const server = http.createServer(app);

    const io = new SocketIOServer(server, {
      cors: {
        origin: '*', // Allow frontend connection
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
      },
    });

    initSocket(io);

    // Run deadline checker every 5 minutes
    const deadlineInterval = setInterval(() => {
      checkApproachingDeadlines().catch((err) =>
        console.error('[Cron] Error running deadline check:', err)
      );
    }, 5 * 60 * 1000);

    const PORT = parseInt(ENV.PORT, 10);
    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  Multi-Tenant Collaboration Server running on port ${PORT}`);
      console.log(`  Environment: ${ENV.NODE_ENV}`);
      console.log(`  REST API: http://localhost:${PORT}/api`);
      console.log(`  WebSocket Server initialized`);
      console.log(`=======================================================`);
    });

    const shutdown = async () => {
      console.log('\n[Server] Gracefully shutting down...');
      clearInterval(deadlineInterval);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error: any) {
    console.error('[Server] Fatal bootstrap error:', error.message);
    process.exit(1);
  }
};

startServer();
