const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('./config');
const logger = require('./utils/logger');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: config.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());

app.get('/', (req, res) => {
  res.send('Unified Collaboration Platform - Signaling Server');
});

// Initialize socket handlers
socketHandler.initialize(io);

// Start the server
const PORT = process.env.PORT || config.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`Signaling server running on port ${PORT}`);
});