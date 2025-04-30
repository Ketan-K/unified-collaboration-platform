const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true,
    unique: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  roomId: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadedByName: {
    type: String,
    required: true
  },
  storageLocation: {
    type: String,
    required: true
  },
  isRecording: {
    type: Boolean,
    default: false
  },
  metadata: {
    duration: Number,
    resolution: String,
    transcription: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = FileSchema;