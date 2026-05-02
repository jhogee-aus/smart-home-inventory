const express = require('express');
const router = express.Router();
const controller = require('../controllers/homesController');

router.post('/', controller.createHome);
router.get('/', controller.getHomes);

module.exports = router; 