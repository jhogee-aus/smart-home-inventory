const express = require('express');
const router = express.Router();
const controller = require('../controllers/homesController');

router.post('/', controller.createHome);
router.get('/', controller.getHomes);
router.delete('/:homeId', controller.deleteHome);

module.exports = router; 