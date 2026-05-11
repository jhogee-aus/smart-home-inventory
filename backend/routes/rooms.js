const express = require('express');
const router = express.Router();
const controller = require('../controllers/roomsController');

router.post('/:homeId', controller.createRoom);

router.get('/home/:homeId', controller.getRoomsByHome);

router.get('/layout/:homeId', controller.getRoomsWithZones);

module.exports = router;