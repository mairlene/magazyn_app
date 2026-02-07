const express = require('express');
const router = express.Router();

// Upload endpoints: main upload and image-specific routes
router.use('/', require('../upload'));

module.exports = router;
