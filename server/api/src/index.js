const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const dbManager = require('./db/dbManager');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Unified Collaboration Platform API Server' });
});

// Import and use route modules
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'An error occurred on the server',
    error: config.nodeEnv === 'development' ? err.message : undefined
  });
});

// Start the server
const startServer = async () => {
  try {
    // Determine which database adapter to use
    const adapterType = config.db.useLocalDb ? 'local' : 'mongo';
    
    // Database options
    const dbOptions = {};
    if (adapterType === 'mongo') {
      dbOptions.uri = config.db.mongoUri;
    }
    
    // Initialize database
    await dbManager.init(adapterType, dbOptions);
    console.log(`Connected to database using ${adapterType} adapter`);
    
    // Start the server
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`API Server running in ${config.nodeEnv} mode on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Server shutting down...');
  await dbManager.disconnect();
  process.exit(0);
});