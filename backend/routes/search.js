const express = require('express');
const router = express.Router();
const controller = require('../controllers/searchController');

// Search items
router.get('/', controller.searchItems);

module.exports = router;