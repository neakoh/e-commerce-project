const brandsService = require('../services/brandsService');

exports.getAll = async (req, res, next) => {
    try {
        const brands = await brandsService.getAll();
        res.json(brands);
    } catch (error) {
        next(error);
    }
};
