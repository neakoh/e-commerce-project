const db = require('../config/db');

class categoriesService {
    async getAll() {
        const result = await db.query('SELECT * FROM category ORDER BY name ASC;');
        return result.rows;
    }
}

module.exports = new categoriesService();