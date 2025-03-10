const express = require('express');
const router = express.Router();

const { 
    getAllItems, 
    getItemByID,
    getItemsByCategoryID, 
    getItemsByBrandID,
    getAllCategories,
    getAllBrands
} = require('../controllers/itemsController');

router.get('/', getAllItems);
router.get('/:id', getItemByID);
router.get('/category/:categoryID', getItemsByCategoryID);
router.get('/brand/:brandID', getItemsByBrandID);
router.get('/categories', getAllCategories);
router.get('/brands', getAllBrands);

module.exports = router;