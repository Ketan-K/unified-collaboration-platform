const express = require('express');
const {
  createRoom,
  getRoom,
  updateRoom,
  joinRoom,
  leaveRoom,
  saveWhiteboard,
  saveCodeEditor,
  listRooms
} = require('../controllers/roomController');

const router = express.Router();

// Base route /api/rooms
router.route('/')
  .post(createRoom)
  .get(listRooms);

router.route('/:roomId')
  .get(getRoom)
  .put(updateRoom);

router.route('/:roomId/join')
  .post(joinRoom);

router.route('/:roomId/leave')
  .post(leaveRoom);

router.route('/:roomId/whiteboard')
  .put(saveWhiteboard);

router.route('/:roomId/code')
  .put(saveCodeEditor);

module.exports = router;