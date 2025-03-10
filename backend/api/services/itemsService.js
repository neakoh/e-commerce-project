const db = require('../config/db');

class itemsService {
    async getAll(limit, offset, brand = null, category = null, sort = null) {
        const params = [limit, offset];
        let query = `
            SELECT 
                items.id AS id,
                items.name AS name,
                items.quantity AS quantity,
                items.price AS price,
                items.options AS options,
                items.categoryID AS category_id,
                items.brandID AS brand_id,
                brands.name AS brand_name,
                category.name AS category_name
            FROM 
                items
            LEFT JOIN 
                brands ON items.brandID = brands.id
            LEFT JOIN 
                category ON items.categoryID = category.id
            WHERE 1=1
        `;

        if (brand) {
            params.push(brand);
            query += ` AND brands.name = $${params.length}`;
        }

        if (category) {
            params.push(category);
            query += ` AND category.id = $${params.length}`;
        }

        // Add sorting logic
        if (sort === 'price_asc') {
            query += ` ORDER BY items.price ASC`;
        } else if (sort === 'price_desc') {
            query += ` ORDER BY items.price DESC`;
        } else {
            query += ` ORDER BY items.name ASC`;
        }

        query += ` LIMIT $1 OFFSET $2;`;

        const result = await db.query(query, params);
        return result.rows;
    }
    async getAllBrands() {
        const result = await db.query(
            'SELECT * FROM brands;'
        );
        return result.rows;
    }
    async getAllCategories() {
        const result = await db.query(
            'SELECT * FROM category;'
        );
        return result.rows;
    }
    
    async getByID(id) {
        const result = await db.query(
            'SELECT * FROM items WHERE id = $1',
            [id]
        );
        return result.rows
    }
    async getByBrandID(id, limit, offset) {
        const result = await db.query(
            'SELECT * FROM items WHERE brandID = $1 LIMIT $2 OFFSET $3',
            [id, limit, offset]
        );
        return result.rows
    }
    async getByCategoryID(id, limit, offset) {
        const result = await db.query(
            'SELECT * FROM items WHERE categoryID = $1 LIMIT $2 OFFSET $3',
            [id, limit, offset]
        );
        return result.rows
    }

    async update(quantity, id) {
        const result = await db.query(
            'UPDATE items SET quantity = $1 WHERE id = $2 RETURNING *',
            [quantity, id]
        );
        return result.rows
    }

    async delete(id) {
        const result = await db.query(
            'DELETE FROM items WHERE id = $1 RETURNING *',
            [id]
        );
        return result.rows
    }
}

module.exports = new itemsService();