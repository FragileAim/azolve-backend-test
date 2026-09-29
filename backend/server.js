require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const notificationService = require('./services/notificationService');

const PORT = process.env.PORT || 3000;

// ---------- Create HTTP Server ----------
const server = http.createServer(app);

// ---------- Socket.IO Setup ----------
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'https://azolve.io',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:8082',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

notificationService.setIo(io);

io.use(async (socket, next) => {
  const authToken = socket.handshake.auth?.token || (socket.handshake.headers?.authorization || '').split(' ')[1];
  if (!authToken) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate('company', '_id isActive');
    if (!user || !user.isActive || !user.company || !user.company.isActive) {
      return next(new Error('Authentication error'));
    }
    socket.userId = user._id.toString();
    socket.companyId = user.company._id.toString();
    return next();
  } catch (err) {
    return next(new Error('Authentication error'));
  }
});

// Make io accessible in routes
app.set('io', io);

// ---------- Socket.IO Connection Handling ----------
const onlineUsers = new Map(); // userId -> { socketId, name, status }
const meetingRooms = new Map(); // meetingId -> { hostSocketId, hostUserId, participants, waitingRoom }

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  if (socket.userId) {
    onlineUsers.set(socket.userId, {
      socketId: socket.id,
      name: socket.handshake.auth?.name || 'Unknown',
      companyId: socket.companyId,
      status: 'online',
      lastSeen: new Date(),
    });
    socket.join(`user:${socket.userId}`);
    socket.join(`company:${socket.companyId}`);
  }

  // User comes online
  socket.on('user:online', (data) => {
    const { userId, name, companyId } = data;
    onlineUsers.set(userId, {
      socketId: socket.id,
      name,
      companyId,
      status: 'online',
      lastSeen: new Date(),
    });
    socket.userId = userId;
    socket.companyId = companyId;

    // Join company room
    if (companyId) {
      socket.join(`company:${companyId}`);
    }

    // Broadcast to company
    if (companyId) {
      io.to(`company:${companyId}`).emit('user:status', {
        userId,
        name,
        status: 'online',
      });
    }

    // Send online users list
    const companyUsers = [];
    onlineUsers.forEach((val, key) => {
      if (val.companyId === companyId) {
        companyUsers.push({ userId: key, name: val.name, status: val.status });
      }
    });
    socket.emit('users:online', companyUsers);
  });

  // Join chat room
  socket.on('chat:join', (chatId) => {
    socket.join(`chat:${chatId}`);
    console.log(`💬 ${socket.userId} joined chat: ${chatId}`);
  });

  // Leave chat room
  socket.on('chat:leave', (chatId) => {
    socket.leave(`chat:${chatId}`);
  });

  // Send message
  socket.on('chat:message', (data) => {
    const { chatId, message } = data;
    io.to(`chat:${chatId}`).emit('chat:message', message);
  });

  // Typing indicator
  socket.on('chat:typing', (data) => {
    const { chatId, userId, name } = data;
    socket.to(`chat:${chatId}`).emit('chat:typing', { userId, name });
  });

  // Stop typing
  socket.on('chat:stop_typing', (data) => {
    const { chatId, userId } = data;
    socket.to(`chat:${chatId}`).emit('chat:stop_typing', { userId });
  });

  // ─── MEETING / WebRTC SIGNALING ───────────────────────────────────────────

  // meetingRooms: meetingId -> { hostSocketId, hostUserId, participants: Map<socketId, {userId,name,socketId}>, waitingRoom: Map<socketId, {userId,name,socketId}> }
  // (defined outside connection handler so it persists across connections)

  // Request to join a meeting (goes to waiting room first, or straight in if no waiting room)
  socket.on('meeting:request_join', (data) => {
    const { meetingId, userId, name, noWaitingRoom } = data;
    const room = meetingRooms.get(meetingId);

    if (!room) {
      // No host yet — this person is the host
      meetingRooms.set(meetingId, {
        hostSocketId: socket.id,
        hostUserId: userId,
        participants: new Map([[socket.id, { userId, name, socketId: socket.id }]]),
        waitingRoom: new Map(),
      });
      socket.join(`meeting:${meetingId}`);
      socket.meetingId = meetingId;
      socket.userId = socket.userId || userId;
      socket.emit('meeting:joined', {
        role: 'host',
        participants: [],
        meetingId,
      });
      console.log(`🎥 [HOST] ${name} created meeting: ${meetingId}`);
    } else if (noWaitingRoom) {
      // Direct join (waiting room disabled)
      room.participants.set(socket.id, { userId, name, socketId: socket.id });
      socket.join(`meeting:${meetingId}`);
      socket.meetingId = meetingId;
      socket.userId = socket.userId || userId;
      // Notify existing participants
      const existingPeers = [];
      room.participants.forEach((p, sid) => {
        if (sid !== socket.id) {
          existingPeers.push({ socketId: sid, userId: p.userId, name: p.name });
          io.to(sid).emit('meeting:peer_joined', { socketId: socket.id, userId, name });
        }
      });
      socket.emit('meeting:joined', { role: 'participant', participants: existingPeers, meetingId });
      // Notify host
      io.to(room.hostSocketId).emit('meeting:participant_count', { count: room.participants.size });
    } else {
      // Put in waiting room, notify host
      room.waitingRoom.set(socket.id, { userId, name, socketId: socket.id });
      socket.meetingId = meetingId;
      socket.userId = socket.userId || userId;
      // Tell requester they're waiting
      socket.emit('meeting:waiting', { meetingId });
      // Tell host someone is waiting
      io.to(room.hostSocketId).emit('meeting:admit_request', {
        socketId: socket.id,
        userId,
        name,
      });
      console.log(`⏳ ${name} is waiting to join meeting: ${meetingId}`);
    }
  });

  // Host admits or denies a waiting participant
  socket.on('meeting:admit', (data) => {
    const { meetingId, socketId, admit } = data;
    const room = meetingRooms.get(meetingId);
    if (!room || room.hostSocketId !== socket.id) return;

    const waiter = room.waitingRoom.get(socketId);
    if (!waiter) return;
    room.waitingRoom.delete(socketId);

    if (admit) {
      room.participants.set(socketId, waiter);
      io.sockets.sockets.get(socketId)?.join(`meeting:${meetingId}`);
      // Get existing peers for the new joiner
      const existingPeers = [];
      room.participants.forEach((p, sid) => {
        if (sid !== socketId) {
          existingPeers.push({ socketId: sid, userId: p.userId, name: p.name });
          io.to(sid).emit('meeting:peer_joined', { socketId, userId: waiter.userId, name: waiter.name });
        }
      });
      io.to(socketId).emit('meeting:joined', { role: 'participant', participants: existingPeers, meetingId });
      io.to(room.hostSocketId).emit('meeting:participant_count', { count: room.participants.size });
      console.log(`✅ ${waiter.name} admitted to meeting: ${meetingId}`);
    } else {
      io.to(socketId).emit('meeting:denied', { meetingId });
      console.log(`❌ ${waiter.name} denied from meeting: ${meetingId}`);
    }
  });

  // Host removes a participant
  socket.on('meeting:remove', (data) => {
    const { meetingId, socketId } = data;
    const room = meetingRooms.get(meetingId);
    if (!room || room.hostSocketId !== socket.id) return;
    io.to(socketId).emit('meeting:removed');
    room.participants.delete(socketId);
    io.sockets.sockets.get(socketId)?.leave(`meeting:${meetingId}`);
    io.to(`meeting:${meetingId}`).emit('meeting:peer_left', { socketId });
    io.to(room.hostSocketId).emit('meeting:participant_count', { count: room.participants.size });
  });

  // WebRTC offer
  socket.on('meeting:offer', (data) => {
    const { to, offer, meetingId } = data;
    io.to(to).emit('meeting:offer', { from: socket.id, offer, meetingId });
  });

  // WebRTC answer
  socket.on('meeting:answer', (data) => {
    const { to, answer, meetingId } = data;
    io.to(to).emit('meeting:answer', { from: socket.id, answer, meetingId });
  });

  // ICE candidate
  socket.on('meeting:ice', (data) => {
    const { to, candidate, meetingId } = data;
    io.to(to).emit('meeting:ice', { from: socket.id, candidate, meetingId });
  });

  // Leave meeting
  socket.on('meeting:leave', (data) => {
    const { meetingId } = data || {};
    const mid = meetingId || socket.meetingId;
    if (!mid) return;
    const room = meetingRooms.get(mid);
    if (room) {
      room.participants.delete(socket.id);
      room.waitingRoom.delete(socket.id);
      socket.to(`meeting:${mid}`).emit('meeting:peer_left', { socketId: socket.id });
      // If host left, end meeting for everyone
      if (room.hostSocketId === socket.id) {
        io.to(`meeting:${mid}`).emit('meeting:ended');
        meetingRooms.delete(mid);
      } else if (room.hostSocketId) {
        io.to(room.hostSocketId).emit('meeting:participant_count', { count: room.participants.size });
      }
    }
    socket.leave(`meeting:${mid}`);
    socket.meetingId = null;
  });

  // Host mutes a remote participant
  socket.on('meeting:mute_participant', (data) => {
    const { meetingId, socketId } = data;
    const room = meetingRooms.get(meetingId);
    if (!room || room.hostSocketId !== socket.id) return;
    io.to(socketId).emit('meeting:force_mute');
  });

  // Chat message within meeting
  socket.on('meeting:chat', (data) => {
    const { meetingId, message, name } = data;
    socket.to(`meeting:${meetingId}`).emit('meeting:chat', { from: socket.id, name, message, ts: Date.now() });
  });

  // Reaction
  socket.on('meeting:reaction', (data) => {
    const { meetingId, reaction, name } = data;
    socket.to(`meeting:${meetingId}`).emit('meeting:reaction', { from: socket.id, name, reaction });
  });

  // Hand raise
  socket.on('meeting:hand', (data) => {
    const { meetingId, raised, name } = data;
    socket.to(`meeting:${meetingId}`).emit('meeting:hand', { from: socket.id, name, raised });
  });

  // Notification
  socket.on('notification:send', (data) => {
    const { targetUserId, notification } = data;
    const targetUser = onlineUsers.get(targetUserId);
    if (targetUser) {
      io.to(targetUser.socketId).emit('notification', notification);
    }
  });

  // User goes away/idle
  socket.on('user:away', () => {
    if (socket.userId && onlineUsers.has(socket.userId)) {
      const user = onlineUsers.get(socket.userId);
      user.status = 'away';
      onlineUsers.set(socket.userId, user);
      if (socket.companyId) {
        io.to(`company:${socket.companyId}`).emit('user:status', {
          userId: socket.userId,
          name: user.name,
          status: 'away',
        });
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    if (socket.userId) {
      const user = onlineUsers.get(socket.userId);
      onlineUsers.delete(socket.userId);
      if (socket.companyId && user) {
        io.to(`company:${socket.companyId}`).emit('user:status', {
          userId: socket.userId,
          name: user.name,
          status: 'offline',
        });
      }
    }
    // Clean up meeting rooms on disconnect
    if (socket.meetingId) {
      const room = meetingRooms.get(socket.meetingId);
      if (room) {
        room.participants.delete(socket.id);
        room.waitingRoom.delete(socket.id);
        socket.to(`meeting:${socket.meetingId}`).emit('meeting:peer_left', { socketId: socket.id });
        if (room.hostSocketId === socket.id) {
          io.to(`meeting:${socket.meetingId}`).emit('meeting:ended');
          meetingRooms.delete(socket.meetingId);
        } else if (room.hostSocketId) {
          io.to(room.hostSocketId).emit('meeting:participant_count', { count: room.participants.size });
        }
      }
    }
  });
});

// ---------- Start Server ----------
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create default admin if first run
    const User = require('./models/User');
    const Company = require('./models/Company');

    const anyUser = await User.findOne({});
    if (!anyUser && process.env.ADMIN_EMAIL) {
      // Create default company
      let company = await Company.findOne({ domain: 'azolve.io' });
      if (!company) {
        company = await Company.create({
          name: 'Azolve',
          domain: 'azolve.io',
          plan: 'enterprise',
          settings: { timezone: 'Asia/Kolkata', currency: 'INR', dateFormat: 'DD/MM/YYYY' },
        });
        console.log('🏢 Default company created');
      }

      await User.create({
        name: process.env.ADMIN_NAME || 'Super Admin',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD || 'Admin@123456',
        role: 'super_admin',
        company: company._id,
        isActive: true,
        isVerified: true,
      });
      console.log('👤 Default admin created:', process.env.ADMIN_EMAIL);
    } else if (anyUser) {
      // Users exist (likely from seed). Show login hint.
      console.log('👤 Users already exist in database. Skipping default admin creation.');
      console.log('   💡 If you seeded the DB, login with: admin@azolve.com / admin123');
    }

    // Start listening
    server.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════╗');
      console.log('║       🚀 AZOLVE API SERVER               ║');
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  Environment : ${process.env.NODE_ENV || 'development'}`.padEnd(44) + '║');
      console.log(`║  Port        : ${PORT}`.padEnd(44) + '║');
      console.log(`║  Frontend    : ${process.env.FRONTEND_URL || 'N/A'}`.padEnd(44) + '║');
      console.log(`║  Socket.IO   : Enabled`.padEnd(44) + '║');
      console.log('╠══════════════════════════════════════════╣');
      console.log('║  API Health  : /api/health               ║');
      console.log('║  API Docs    : /api/health               ║');
      console.log('╚══════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// ============================================================
// KEEP-ALIVE: Prevent Render free tier cold starts
// Pings the server every 10 minutes so it stays warm
// ============================================================
const keepAlive = () => {
  const backendUrl = process.env.BACKEND_URL || `https://azolve-api.onrender.com`;
  const https = require('https');
  const http = require('http');
  const pingUrl = `${backendUrl}/api/health`;
  const client = pingUrl.startsWith('https') ? https : http;

  setInterval(() => {
    client.get(pingUrl, (res) => {
      console.log(`🏓 Keep-alive ping: ${res.statusCode}`);
    }).on('error', (err) => {
      console.warn(`⚠️  Keep-alive ping failed: ${err.message}`);
    });
  }, 10 * 60 * 1000); // every 10 minutes
};

// Only run keep-alive in production (on Render)
if (process.env.NODE_ENV === 'production') {
  keepAlive();
}

// ---------- Graceful Shutdown ----------
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️ Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
  setTimeout(() => {
    // Only force-kill in production (Render timeout safeguard)
    // In localhost dev, Ctrl+C sends multiple signals - don't force kill
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Windows: handle Ctrl+C properly (Windows sends SIGINT twice sometimes)
if (process.platform === 'win32') {
  const rl = require('readline').createInterface({ input: process.stdin });
  rl.on('SIGINT', () => process.emit('SIGINT'));
}
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});