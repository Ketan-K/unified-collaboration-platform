const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

// Helper function to generate room IDs in the "123-456" format
const generateFormattedRoomId = () => {
  // Generate 6 random digits
  const digits = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  // Format as "123-456"
  return `${digits.substring(0, 3)}-${digits.substring(3, 6)}`;
};

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Public
exports.createRoom = async (req, res) => {
  try {
    const { userId, name = 'Untitled Room', settings = {} } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Use the formatted room ID generator instead of raw UUID
    const roomId = generateFormattedRoomId();
    
    const room = await Room.create({
      roomId,
      name,
      createdBy: userId,
      settings,
      participants: [{
        userId,
        userName: req.body.userName || 'Anonymous',
        role: 'host'
      }]
    });
    
    res.status(201).json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get a room by roomId
// @route   GET /api/rooms/:roomId
// @access  Public
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update a room
// @route   PUT /api/rooms/:roomId
// @access  Public (should be restricted in production)
exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findOneAndUpdate(
      { roomId: req.params.roomId },
      { $set: req.body },
      { new: true }
    );
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Join a room
// @route   POST /api/rooms/:roomId/join
// @access  Public
exports.joinRoom = async (req, res) => {
  try {
    const { userId, userName } = req.body;
    
    if (!userId || !userName) {
      return res.status(400).json({
        success: false,
        message: 'User ID and username are required'
      });
    }
    
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if user is already in the room
    const existingParticipant = room.participants.find(p => p.userId === userId);
    
    if (existingParticipant) {
      // Update existing participant
      existingParticipant.userName = userName;
      existingParticipant.joinedAt = Date.now();
    } else {
      // Check if room is at capacity
      if (room.settings.maxParticipants && 
          room.participants.length >= room.settings.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: 'Room is at maximum capacity'
        });
      }
      
      // Add new participant
      room.participants.push({
        userId,
        userName,
        role: 'participant',
        joinedAt: Date.now()
      });
    }
    
    // Update lastActive timestamp
    room.lastActive = Date.now();
    
    await room.save();
    
    res.json({
      success: true,
      room
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Leave a room
// @route   POST /api/rooms/:roomId/leave
// @access  Public
exports.leaveRoom = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Remove participant
    room.participants = room.participants.filter(p => p.userId !== userId);
    
    // If no participants left, mark room as inactive
    if (room.participants.length === 0) {
      room.isActive = false;
    }
    
    // Update lastActive timestamp
    room.lastActive = Date.now();
    
    await room.save();
    
    res.json({
      success: true,
      message: 'Successfully left the room'
    });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave room',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Save whiteboard data
// @route   PUT /api/rooms/:roomId/whiteboard
// @access  Public (should be restricted in production)
exports.saveWhiteboard = async (req, res) => {
  try {
    const { canvasData } = req.body;
    
    if (!canvasData) {
      return res.status(400).json({
        success: false,
        message: 'Canvas data is required'
      });
    }
    
    const room = await Room.findOneAndUpdate(
      { roomId: req.params.roomId },
      { 
        $set: { 
          'whiteboard.canvasData': canvasData,
          'whiteboard.lastUpdated': Date.now(),
          'lastActive': Date.now()
        } 
      },
      { new: true }
    );
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    res.json({
      success: true,
      whiteboard: room.whiteboard
    });
  } catch (error) {
    console.error('Error saving whiteboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save whiteboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Save code editor data
// @route   PUT /api/rooms/:roomId/code
// @access  Public (should be restricted in production)
exports.saveCodeEditor = async (req, res) => {
  try {
    const { content, language } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Code content is required'
      });
    }
    
    const updateData = {
      'codeEditor.content': content,
      'codeEditor.lastUpdated': Date.now(),
      'lastActive': Date.now()
    };
    
    if (language) {
      updateData['codeEditor.language'] = language;
    }
    
    const room = await Room.findOneAndUpdate(
      { roomId: req.params.roomId },
      { $set: updateData },
      { new: true }
    );
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    res.json({
      success: true,
      codeEditor: room.codeEditor
    });
  } catch (error) {
    console.error('Error saving code editor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save code editor data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    List active rooms
// @route   GET /api/rooms
// @access  Public
exports.listRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true })
      .select('roomId name createdBy participants.length createdAt lastActive')
      .sort({ lastActive: -1 });
    
    res.json({
      success: true,
      count: rooms.length,
      rooms
    });
  } catch (error) {
    console.error('Error listing rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list rooms',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};