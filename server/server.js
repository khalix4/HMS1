import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

import { connectDB, getDbStatus } from './config/db.js';
import { seedInitialData } from './store/dataStore.js';

import authRoutes from './routes/authRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import emergencyRoutes from './routes/emergencyRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import commsRoutes from './routes/commsRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with permissive CORS for development
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Provide io instance to Express request context
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging in development
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/health')) {
    console.log(`[HTTP] ${req.method} ${req.path}`);
  }
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/integration', integrationRoutes);

// Health Check & Database Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Mayo Emergency Resource Coordination Network',
    timestamp: new Date(),
    db: getDbStatus()
  });
});

// Root friendly greeting
app.get('/', (req, res) => {
  res.send('Mayo Digital Solutions - Hospital-to-Hospital Emergency Resource Coordination API Server is running.');
});

// Socket.io Real-time Event Channels
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  // Join a hospital specific room
  socket.on('join_hospital', (hospitalId) => {
    if (hospitalId) {
      socket.join(`hospital_${hospitalId}`);
      console.log(`[SOCKET] Socket ${socket.id} joined room: hospital_${hospitalId}`);
    }
  });

  // Join network broadcast channel
  socket.on('join_network', () => {
    socket.join('network_broadcast');
    console.log(`[SOCKET] Socket ${socket.id} joined network_broadcast channel`);
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

// Start Server and initialize data
const startServer = async () => {
  try {
    await connectDB();
    await seedInitialData();

    server.listen(PORT, () => {
      console.log(`\n=============================================================`);
      console.log(`  MAYO EMERGENCY RESOURCE COORDINATION SYSTEM (HERCS)`);
      console.log(`  Server running on http://localhost:${PORT}`);
      console.log(`  WebSocket Real-Time Dispatch Hub Active`);
      console.log(`  Database: ${getDbStatus().mode}`);
      console.log(`=============================================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
