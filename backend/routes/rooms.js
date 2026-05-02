const express = require('express');
const router = express.Router();
const controller = require('../controllers/roomsController');

// Create room under a home
router.post('/:homeId', controller.createRoom);

// Get all rooms for a home
router.get('/home/:homeId', controller.getRoomsByHome);

module.exports = router;