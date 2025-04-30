const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { v4: uuidv4 } = require('uuid');

// In a production app, you would use actual AI services
// like OpenAI Whisper for transcription or a dedicated service
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // In production, specify your actual domains
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Configure middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Storage for recordings and transcriptions
const recordingsDir = path.join(__dirname, '../recordings');
const transcriptionsDir = path.join(__dirname, '../transcriptions');
const summariesDir = path.join(__dirname, '../summaries');

// Create directories if they don't exist
[recordingsDir, transcriptionsDir, summariesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Active recordings
const activeRecordings = new Map();

// Routes
app.get('/', (req, res) => {
  res.send('Unified Collaboration Platform - AI Services');
});

// API endpoint to start recording
app.post('/api/recording/start', (req, res) => {
  const { roomId, userId } = req.body;
  
  if (!roomId || !userId) {
    return res.status(400).json({ error: 'Missing roomId or userId' });
  }
  
  const recordingId = uuidv4();
  const recordingPath = path.join(recordingsDir, `${recordingId}.webm`);
  
  activeRecordings.set(recordingId, {
    roomId,
    userId,
    startTime: new Date(),
    filePath: recordingPath,
    chunks: []
  });
  
  res.json({ recordingId });
});

// API endpoint to add audio chunk to recording
app.post('/api/recording/:recordingId/chunk', (req, res) => {
  const { recordingId } = req.params;
  const { audioChunk } = req.body;
  
  if (!activeRecordings.has(recordingId)) {
    return res.status(404).json({ error: 'Recording not found' });
  }
  
  const recording = activeRecordings.get(recordingId);
  
  // Convert base64 to buffer and save
  if (audioChunk && audioChunk.startsWith('data:audio/')) {
    const base64Data = audioChunk.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    recording.chunks.push(buffer);
  }
  
  res.json({ success: true });
});

// API endpoint to stop recording and begin transcription
app.post('/api/recording/:recordingId/stop', async (req, res) => {
  const { recordingId } = req.params;
  
  if (!activeRecordings.has(recordingId)) {
    return res.status(404).json({ error: 'Recording not found' });
  }
  
  const recording = activeRecordings.get(recordingId);
  const { filePath, roomId, userId } = recording;
  
  // Save the recording
  try {
    const fileStream = fs.createWriteStream(filePath);
    for (const chunk of recording.chunks) {
      fileStream.write(chunk);
    }
    fileStream.end();
    
    // Start transcription
    const transcriptionId = await startTranscription(recordingId, filePath);
    
    // Cleanup
    activeRecordings.delete(recordingId);
    
    res.json({ 
      recordingId,
      transcriptionId,
      duration: (new Date() - recording.startTime) / 1000 // duration in seconds
    });
  } catch (error) {
    console.error('Error saving recording:', error);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// API endpoint to get transcription status
app.get('/api/transcription/:transcriptionId', (req, res) => {
  const { transcriptionId } = req.params;
  const transcriptionPath = path.join(transcriptionsDir, `${transcriptionId}.json`);
  
  if (fs.existsSync(transcriptionPath)) {
    try {
      const transcription = JSON.parse(fs.readFileSync(transcriptionPath, 'utf-8'));
      res.json(transcription);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read transcription' });
    }
  } else {
    res.json({ status: 'processing' });
  }
});

// API endpoint to get meeting summary
app.get('/api/summary/:transcriptionId', (req, res) => {
  const { transcriptionId } = req.params;
  const summaryPath = path.join(summariesDir, `${transcriptionId}.json`);
  
  if (fs.existsSync(summaryPath)) {
    try {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read summary' });
    }
  } else {
    res.status(404).json({ error: 'Summary not found' });
  }
});

// API endpoint to generate summary from transcription
app.post('/api/summary/generate', async (req, res) => {
  const { transcriptionId } = req.body;
  
  if (!transcriptionId) {
    return res.status(400).json({ error: 'Missing transcriptionId' });
  }
  
  const transcriptionPath = path.join(transcriptionsDir, `${transcriptionId}.json`);
  
  if (!fs.existsSync(transcriptionPath)) {
    return res.status(404).json({ error: 'Transcription not found' });
  }
  
  try {
    const summaryId = await generateSummary(transcriptionId, transcriptionPath);
    res.json({ summaryId });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log(`New AI service connection: ${socket.id}`);
  
  // Join a room for transcription/summary updates
  socket.on('join-room', ({ roomId }) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId} for AI updates`);
  });
  
  socket.on('disconnect', () => {
    console.log(`AI service connection disconnected: ${socket.id}`);
  });
});

// Helper function for transcription (in a real app, would use OpenAI Whisper or similar)
async function startTranscription(recordingId, filePath) {
  const transcriptionId = uuidv4();
  const transcriptionPath = path.join(transcriptionsDir, `${transcriptionId}.json`);
  
  // For demonstration purposes, we'll create a mock transcription after a delay
  // In a real app, this would call a speech-to-text API
  setTimeout(() => {
    const mockTranscription = {
      id: transcriptionId,
      recordingId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      segments: [
        {
          id: 0,
          start: 0,
          end: 5.2,
          text: "Hi everyone, let's begin our meeting about the new project."
        },
        {
          id: 1,
          start: 5.5,
          end: 10.8,
          text: "I've prepared some updates on the progress we've made so far."
        },
        {
          id: 2,
          start: 11.2,
          end: 18.5,
          text: "The development team has completed the initial prototype, and we're ready for the first round of testing."
        }
      ],
      text: "Hi everyone, let's begin our meeting about the new project. I've prepared some updates on the progress we've made so far. The development team has completed the initial prototype, and we're ready for the first round of testing."
    };
    
    fs.writeFileSync(transcriptionPath, JSON.stringify(mockTranscription, null, 2));
    
    // Notify clients that transcription is ready
    io.to(mockTranscription.recordingId).emit('transcription-completed', {
      transcriptionId,
      recordingId
    });
    
    // Auto-generate summary
    generateSummary(transcriptionId, transcriptionPath);
    
  }, 5000); // Simulate processing time
  
  return transcriptionId;
}

// Helper function for summary generation (in a real app, would use OpenAI GPT or similar)
async function generateSummary(transcriptionId, transcriptionPath) {
  const summaryId = uuidv4();
  const summaryPath = path.join(summariesDir, `${summaryId}.json`);
  
  try {
    const transcriptionData = JSON.parse(fs.readFileSync(transcriptionPath, 'utf-8'));
    
    // For demonstration purposes, we'll create a mock summary after a delay
    // In a real app, this would call an AI API for summarization
    setTimeout(() => {
      const mockSummary = {
        id: summaryId,
        transcriptionId,
        timestamp: new Date().toISOString(),
        summary: "Meeting about the new project. The team discussed progress updates, including the completion of the initial prototype. The development team is ready to proceed with the first round of testing.",
        keyPoints: [
          "New project kickoff",
          "Initial prototype completed",
          "Ready for first round of testing"
        ],
        actionItems: [
          "Schedule testing sessions",
          "Prepare feedback collection mechanism",
          "Plan for the next iteration based on test results"
        ]
      };
      
      fs.writeFileSync(summaryPath, JSON.stringify(mockSummary, null, 2));
      
      // Notify clients that summary is ready
      io.to(transcriptionData.recordingId).emit('summary-completed', {
        summaryId,
        transcriptionId
      });
      
    }, 3000); // Simulate processing time
    
    return summaryId;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`AI services running on port ${PORT}`);
});