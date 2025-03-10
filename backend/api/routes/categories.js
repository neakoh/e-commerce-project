const express = require('express');
const router = express.Router();

const { 
    getAll, 
} = require('../controllers/categoriesController');

router.get('/', getAll);

module.exports = router;