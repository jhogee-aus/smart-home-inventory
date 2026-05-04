const express = require('express');
const router = express.Router();
const controller = require('../controllers/itemsController');

// Create item under a zone
router.post('/:zoneId', controller.createItem);

// Get items in a zone
router.get('/zone/:zoneId', controller.getItemsByZone);

module.exports = router;