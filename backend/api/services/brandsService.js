const db = require('../config/db');

class brandsService {
    async getAll() {
        const result = await db.query('SELECT * FROM brands ORDER BY name ASC;');
        return result.rows;
    }
}

module.exports = new brandsService();