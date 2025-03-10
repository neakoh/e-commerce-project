const categoriesService = require('../services/categoriesService');

exports.getAll = async (req, res, next) => {
    try {
        const categories = await categoriesService.getAll();
        res.json(categories);
    } catch (error) {
        next(error);
    }
};
