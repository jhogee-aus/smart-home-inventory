const express = require('express');
const router = express.Router();
const controller = require('../controllers/movesController');

router.post('/', controller.createBox);

router.get('/', controller.getBoxes);

router.put('/:boxId/complete', controller.completeBox);

router.delete('/:boxId', controller.deleteBox);

module.exports = router;
