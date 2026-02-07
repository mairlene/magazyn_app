const express = require('express');
const router = express.Router();

// Groups product-related routers under /api/products
router.use('/', require('../products'));
router.use('/', require('../editProduct'));
// Import-related sub-routers
router.use('/', require('./imports'));
// Delete endpoints
router.use('/delete', require('../deleteProduct'));
router.use('/delete-from-warehouse', require('../deleteFromWarehouse'));
// Support RESTful DELETE /api/products/:id
router.use('/', require('./deleteById'));

module.exports = router;
