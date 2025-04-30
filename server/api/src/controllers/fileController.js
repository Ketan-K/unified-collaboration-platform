const File = require('../models/File');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// @desc    Upload file metadata
// @route   POST /api/files
// @access  Public (should be protected in production)
exports.uploadFileMetadata = async (req, res) => {
  try {
    const {
      fileName,
      fileType,
      fileSize,
      roomId,
      uploadedBy,
      uploadedByName
    } = req.body;
    
    if (!fileName || !fileType || !fileSize || !roomId || !uploadedBy) {
      return res.status(400).json({
        success: false,
        message: 'Missing required file information'
      });
    }
    
    const fileId = uuidv4();
    const uploadDirectory = path.join(__dirname, '../../../uploads');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadDirectory)) {
      fs.mkdirSync(uploadDirectory, { recursive: true });
    }
    
    const storageLocation = `/uploads/${fileId}-${fileName}`;
    
    const file = await File.create({
      fileId,
      fileName,
      fileType,
      fileSize,
      roomId,
      uploadedBy,
      uploadedByName: uploadedByName || 'Anonymous',
      storageLocation
    });
    
    res.status(201).json({
      success: true,
      file,
      uploadUrl: `/api/files/upload/${fileId}`
    });
  } catch (error) {
    console.error('Error creating file metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create file metadata',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Upload file binary data
// @route   PUT /api/files/upload/:fileId
// @access  Public (should be protected in production)
exports.uploadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const file = await File.findOne({ fileId });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File metadata not found'
      });
    }
    
    // In a real implementation, we'd use middleware like multer
    // For simplicity, we're assuming the file data is in req.body.fileData
    const uploadPath = path.join(__dirname, '../..', file.storageLocation);
    
    // Write binary data to file
    // Note: In a real app, use streams or file upload middleware
    fs.writeFileSync(uploadPath, req.body.fileData);
    
    res.json({
      success: true,
      message: 'File uploaded successfully',
      file
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get file metadata
// @route   GET /api/files/:fileId
// @access  Public (should be restricted in production)
exports.getFile = async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.fileId });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.json({
      success: true,
      file
    });
  } catch (error) {
    console.error('Error fetching file metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch file metadata',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Download file
// @route   GET /api/files/download/:fileId
// @access  Public (should be restricted in production)
exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.fileId });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const filePath = path.join(__dirname, '../..', file.storageLocation);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }
    
    res.download(filePath, file.fileName);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    List files for a room
// @route   GET /api/files/room/:roomId
// @access  Public (should be restricted in production)
exports.getRoomFiles = async (req, res) => {
  try {
    const files = await File.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: files.length,
      files
    });
  } catch (error) {
    console.error('Error listing room files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list room files',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete file
// @route   DELETE /api/files/:fileId
// @access  Public (should be restricted in production)
exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.fileId });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Delete file from storage
    const filePath = path.join(__dirname, '../..', file.storageLocation);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete file metadata
    await file.remove();
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Save recording metadata
// @route   POST /api/files/recording
// @access  Public (should be restricted in production)
exports.saveRecording = async (req, res) => {
  try {
    const {
      fileName,
      fileSize,
      roomId,
      uploadedBy,
      uploadedByName,
      duration,
      resolution
    } = req.body;
    
    if (!fileName || !fileSize || !roomId || !uploadedBy) {
      return res.status(400).json({
        success: false,
        message: 'Missing required recording information'
      });
    }
    
    const fileId = uuidv4();
    const uploadDirectory = path.join(__dirname, '../../../uploads/recordings');
    
    // Ensure recordings directory exists
    if (!fs.existsSync(uploadDirectory)) {
      fs.mkdirSync(uploadDirectory, { recursive: true });
    }
    
    const storageLocation = `/uploads/recordings/${fileId}-${fileName}`;
    
    const file = await File.create({
      fileId,
      fileName,
      fileType: 'video/webm',
      fileSize,
      roomId,
      uploadedBy,
      uploadedByName: uploadedByName || 'Anonymous',
      storageLocation,
      isRecording: true,
      metadata: {
        duration,
        resolution
      }
    });
    
    res.status(201).json({
      success: true,
      file,
      uploadUrl: `/api/files/upload/${fileId}`
    });
  } catch (error) {
    console.error('Error saving recording metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save recording metadata',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};