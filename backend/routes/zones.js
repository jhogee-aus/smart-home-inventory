const express = require('express');
const router = express.Router();

const controller = require('../controllers/zonesController');

// Create zone under a room
router.post('/:roomId', controller.createZone);

// Get all zones for a room
router.get('/room/:roomId', controller.getZonesByRoom);

router.put('/:zoneId/position', controller.updateZonePosition);

module.exports = router;