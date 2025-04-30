const express = require('express');
const {
  uploadFileMetadata,
  uploadFile,
  getFile,
  downloadFile,
  getRoomFiles,
  deleteFile,
  saveRecording
} = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Base route /api/files
router.route('/')
  .post(uploadFileMetadata);

router.route('/upload/:fileId')
  .put(uploadFile);

router.route('/recording')
  .post(saveRecording);

router.route('/download/:fileId')
  .get(downloadFile);

router.route('/room/:roomId')
  .get(getRoomFiles);

router.route('/:fileId')
  .get(getFile)
  .delete(deleteFile);

module.exports = router;