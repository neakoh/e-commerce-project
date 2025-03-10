const express = require('express');
const router = express.Router();

const { 
    getAll, 
} = require('../controllers/brandsController');

router.get('/', getAll);

module.exports = router;