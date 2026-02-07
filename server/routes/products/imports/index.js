const express = require('express');
const router = express.Router();

// Aggregator for import-related product routes
router.use('/', require('../../importProducts'));
router.use('/', require('../../importProductsAction'));
router.use('/', require('../../importProductsAdd'));
router.use('/', require('../../importProductsFull'));
router.use('/', require('../../importRow'));

module.exports = router;
