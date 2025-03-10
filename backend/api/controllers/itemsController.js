const itemsService = require('../services/itemsService');
const { sanitizeInput } = require('../utils/sanitizer');

exports.getAllItems = async (req, res, next) => {
    let { limit = 15, offset = 0, brand = null, category = null, sort = null } = req.query;
    // Parse limit and offset as integers
    limit = parseInt(limit);
    offset = parseInt(offset);
    if (category) {
        category = parseInt(category);
    }
    
    try {
        const items = await itemsService.getAll(limit, offset, brand, category, sort);
        res.json(items);
    } catch (error) {
        next(error);
    }
};

exports.getAllBrands = async (res, next) => {
    try {
        const brands = await itemsService.getAllBrands();
        res.json(brands);
    } catch (error) {
        next(error);
    }
};

exports.getAllCategories = async (res, next) => {
    try {
        const categories = await itemsService.getAll();
        res.json(categories);
    } catch (error) {
        next(error);
    }
};

exports.getItemByID = async (req, res, next) => {
    const { id } = req.params;
    try { 
        const items = await itemsService.getByID(id);
        res.json(items);
    } catch (error) {
        next(error);
    }
};

exports.getItemsByBrandID = async (req, res, next) => {
    const { brandID } = req.params;
    const { limit = 15, offset = 0 } = req.query
    try { 
        const items = await itemsService.getByBrandID(brandID, limit, offset);
        res.json(items);
    } catch (error) {
        next(error);
    }
};

exports.getItemsByCategoryID = async (req, res, next) => {
    const { categoryID } = req.params;
    const { limit = 15, offset = 0 } = req.query;
    try { 
        const items = await itemsService.getByCategoryID(categoryID, limit, offset);
        res.json(items);
    } catch (error) {
        next(error);
    }
};

exports.modifyItem = async (req, res, next) => {
    const { id } = req.params
    const quantity = req.body.quantity

    try {
        const item = await itemsService.getByID(id);

        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }
        else if (quantity > item[0].quantity) {
            return res.status(400).json({ message: `Invalid quantity: cannot reduce by more than ${item[0].quantity}` });
        }
        else if (item[0].quantity == 1 && quantity == 1) {
            await itemsService.delete(id);
            return res.status(200).json({ message: "Item deleted" });
        }
        else {
            const updatedItem = await itemsService.update((item[0].quantity - quantity), id);
            return res.status(200).json({ message: "Quantity updated", item: updatedItem });
        }
    } catch (error) {
        next(error);
    }
};
