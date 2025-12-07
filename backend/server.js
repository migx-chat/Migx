require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { connectRedis } = require('./redis');
const { initDatabase } = require('./db/db');

const authRoutes = require('./api/auth.route');
const userRoutes = require('./api/user.route');
const roomRoutes = require('./api/room.route');
const messageRoutes = require('./api/message.route');
const creditRoutes = require('./api/credit.route');
const merchantRoutes = require('./api/merchant.route');
const notificationRoutes = require('./api/notification.route');

const roomEvents = require('./events/roomEvents');
const chatEvents = require('./events/chatEvents');
const pmEvents = require('./events/pmEvents');
const systemEvents = require('./events/systemEvents');
const creditEvents = require('./events/creditEvents');
const merchantEvents = require('./events/merchantEvents');
const gameEvents = require('./events/gameEvents');
const notificationEvents = require('./events/notificationEvents');
const chatListEvents = require('./events/chatListEvents');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'application/json');
  next();
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MigX Community API</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #8FE9FF 0%, #00936A 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #fff;
          text-align: center;
        }
        .container {
          padding: 40px;
          max-width: 600px;
        }
        h1 {
          font-size: 3rem;
          margin-bottom: 10px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        .tagline {
          font-size: 1.2rem;
          margin-bottom: 30px;
          opacity: 0.9;
        }
        .status {
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 20px 30px;
          margin-top: 20px;
        }
        .status-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 10px 0;
        }
        .dot {
          width: 12px;
          height: 12px;
          background: #4ade80;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .endpoints {
          margin-top: 20px;
          font-size: 0.9rem;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Welcome to MigX</h1>
        <p class="tagline">The World Chat Community</p>
        <div class="status">
          <div class="status-item">
            <span class="dot"></span>
            <span>API Server Online</span>
          </div>
          <div class="status-item">
            <span class="dot"></span>
            <span>WebSocket Ready</span>
          </div>
          <div class="status-item">
            <span class="dot"></span>
            <span>Database Connected</span>
          </div>
        </div>
        <div class="endpoints">
          API Endpoints: /api/auth | /api/users | /api/rooms | /api/credits
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'MigX Backend',
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check with visual HTML response
app.get('/status', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>MigX Server Status</title>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #8FE9FF 0%, #00936A 100%);
        }
        .status-card {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          text-align: center;
        }
        .status-ok {
          color: #00936A;
          font-size: 2em;
          margin-bottom: 20px;
        }
        .info {
          color: #666;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="status-card">
        <div class="status-ok">✅ Server Online</div>
        <div class="info"><strong>Server:</strong> MigX Backend</div>
        <div class="info"><strong>Port:</strong> ${PORT}</div>
        <div class="info"><strong>Time:</strong> ${new Date().toISOString()}</div>
        <div class="info"><strong>Status:</strong> Running</div>
      </div>
    </body>
    </html>
  `);
});

app.get('/api', (req, res) => {
  res.json({
    name: 'MIG33 Clone API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      rooms: '/api/rooms',
      messages: '/api/messages',
      credits: '/api/credits',
      merchants: '/api/merchants'
    }
  });
});

const chatRoutes = require('./api/chat.route');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// 404 handler - must be after all routes
app.use((req, res, next) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.url
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  console.error('Stack:', err.stack);

  // Ensure we always send JSON
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
});

const chatNamespace = io.of('/chat');

chatNamespace.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  roomEvents(io.of('/chat'), socket);
  chatEvents(io.of('/chat'), socket);
  pmEvents(io.of('/chat'), socket);
  systemEvents(io.of('/chat'), socket);
  creditEvents(io.of('/chat'), socket);
  merchantEvents(io.of('/chat'), socket);
  gameEvents(io.of('/chat'), socket);
  notificationEvents(io.of('/chat'), socket);
  chatListEvents(io.of('/chat'), socket);

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

io.on('connection', (socket) => {
  console.log(`Main namespace client connected: ${socket.id}`);

  roomEvents(io, socket);
  chatEvents(io, socket);
  pmEvents(io, socket);
  systemEvents(io, socket);
  creditEvents(io, socket);
  merchantEvents(io, socket);
  gameEvents(io, socket);
  chatListEvents(io, socket);
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

const startServer = async () => {
  try {
    console.log('Initializing MIG33 Clone Backend...');

    console.log('Connecting to Redis Cloud...');
    await connectRedis();
    console.log('Redis Cloud connected successfully');

    console.log('Initializing database...');
    await initDatabase();
    console.log('Database initialized successfully');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on 0.0.0.0:${PORT}`);
      console.log(`
╔═══════════════════════════════════════════════════════╗
║           MIG33 Clone Backend Server                  ║
╠═══════════════════════════════════════════════════════╣
║  HTTP Server:  http://0.0.0.0:5000                    ║
║  Socket.IO:    ws://0.0.0.0:5000                      ║
║  Namespace:    /chat                                  ║
╠═══════════════════════════════════════════════════════╣
║  API Endpoints:                                       ║
║    - POST /api/auth/login                             ║
║    - GET  /api/users/:id                              ║
║    - GET  /api/rooms                                  ║
║    - GET  /api/messages/:roomId                       ║
║    - POST /api/credits/transfer                       ║
║    - POST /api/merchants/create                       ║
╠═══════════════════════════════════════════════════════╣
║  Socket Events:                                       ║
║    - join_room, leave_room                            ║
║    - chat:message, pm:send                            ║
║    - credit:transfer                                  ║
║    - game:play, game:result                           ║
║    - merchant:create, merchant:spend                  ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

startServer();

module.exports = { app, server, io };