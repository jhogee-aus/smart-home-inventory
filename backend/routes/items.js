const express = require('express');
const router = express.Router();
const controller = require('../controllers/itemsController');

// Create item under a zone
router.post('/:zoneId', controller.createItem);

// Get items in a zone
router.get('/:zoneId', controller.getItemsByZone);

router.put('/:itemId', controller.updateItem);

router.put('/:itemId/pack', controller.packItem);

router.put('/:itemId/unpack', controller.unpackItem);

router.delete('/:itemId', controller.deleteItem);

module.exports = router;