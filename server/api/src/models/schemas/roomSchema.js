const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    default: 'Untitled Room'
  },
  createdBy: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    maxParticipants: {
      type: Number,
      default: 10
    },
    features: {
      videoEnabled: {
        type: Boolean,
        default: true
      },
      screenShareEnabled: {
        type: Boolean,
        default: true
      },
      whiteboardEnabled: {
        type: Boolean,
        default: true
      },
      codeEditorEnabled: {
        type: Boolean,
        default: true
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  participants: [{
    userId: String,
    userName: String,
    role: {
      type: String,
      enum: ['host', 'participant'],
      default: 'participant'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  recordings: [{
    fileId: String,
    fileName: String,
    duration: Number,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  whiteboard: {
    canvasData: String,
    lastUpdated: Date
  },
  codeEditor: {
    content: String,
    language: {
      type: String,
      default: 'javascript'
    },
    lastUpdated: Date
  }
});

module.exports = RoomSchema;