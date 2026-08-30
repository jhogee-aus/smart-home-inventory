const express = require('express');
const router = express.Router();
const controller = require('../controllers/roomsController');

router.post('/:homeId', controller.createRoom);

router.get('/home/:homeId', controller.getRoomsByHome);

router.get('/layout/:homeId', controller.getRoomsWithZones);

router.put('/:roomId/position', controller.updateRoomPosition);

router.put('/:roomId/size', controller.updateRoomSize);

router.delete('/:roomId', controller.deleteRoom);

module.exports = router;