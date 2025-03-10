const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { schema, changePasswordSchema } = require('../config/joischemas')
const { JWT_SECRET } = require('../config/jwt');

class AccountService {
    async register(firstname, lastname, email, password) {
        const { error } = schema.validate({ firstname, lastname, email, password });
        if (error) {
            throw new Error(error.details[0].message);
        }

        // Check if email already exists
        const checkEmailQuery = 'SELECT id FROM users WHERE email = $1';
        const emailCheck = await db.query(checkEmailQuery, [email]);
        if (emailCheck.rows.length > 0) {
            throw new Error('Email already exists. Please use a different email address.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const query = 'INSERT INTO users (firstname, lastname, email, password) VALUES ($1, $2, $3, $4) RETURNING *';
        const result = await db.query(query, [firstname, lastname, email, hashedPassword]);
        
        const user = { 
            firstname, 
            userID: result.rows[0].id,
            role: result.rows[0].role 
        };
        
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
        
        return { 
            token, 
            user, 
            message: 'User registered successfully' 
        };
    }

    async login(email, password) {
        const query = 'SELECT id, firstname, password FROM users WHERE email = $1';
        const result = await db.query(query, [email]);

        if (result.rows.length === 0) {
            throw new Error('Invalid username or password');
        }

        const retrieved_hash = result.rows[0].password;
        const isPasswordValid = await bcrypt.compare(password, retrieved_hash);

        if (!isPasswordValid) {
            throw new Error('Invalid username or password');
        }

        const user = { 
            userID: result.rows[0].id,
            firstname: result.rows[0].firstname,
        };
        
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });

        return { token, user };
    }

    async get(id) {
        const query = `
            SELECT 
                a.firstname,
                a.lastname,
                a.email,
                o.order_id,
                o.order_status,
                o.order_date,
                o.delivery_option,
                o.total_price AS order_total_price,
                i.id AS item_id,
                i.name AS item_name,
                i.quantity AS item_stock_quantity,
                oi.quantity AS item_ordered_quantity,
                i.price AS item_price,
                oi.total_price AS item_total_price,
                b.name AS brand_name,
                c.name AS category_name,
                da.first_name AS shipping_first_name,
                da.last_name AS shipping_last_name,
                da.address_line1 AS shipping_address_line1,
                da.address_line2 AS shipping_address_line2,
                da.city AS shipping_city,
                da.county AS shipping_county,
                da.postal_code AS shipping_postal_code,
                da.phone_number AS shipping_phone_number
            FROM 
                users a
            LEFT JOIN 
                orders o ON a.id = o.user_id
            LEFT JOIN 
                order_items oi ON o.order_id = oi.order_id
            LEFT JOIN 
                items i ON oi.item_id = i.id
            LEFT JOIN 
                brands b ON i.brandID = b.id
            LEFT JOIN 
                category c ON i.categoryID = c.id
            LEFT JOIN 
                delivery_addresses da ON o.order_id = da.order_id
            WHERE 
                a.id = $1
            ORDER BY 
                o.order_date DESC;
        `;
    
        const result = await db.query(query, [id]);
    
        if (result.rows.length === 0) {
            throw new Error('User not found or no orders available');
        }
    
        const processedRows = result.rows.map(row => {
            const processedRow = { ...row };
            
            if (row.shipping_first_name) {
                processedRow.shipping_address = {
                    first_name: row.shipping_first_name,
                    last_name: row.shipping_last_name,
                    address_line1: row.shipping_address_line1,
                    address_line2: row.shipping_address_line2,
                    city: row.shipping_city,
                    county: row.shipping_county,
                    postal_code: row.shipping_postal_code,
                    phone_number: row.shipping_phone_number,
                    email: row.shipping_email
                };
            }
            
            delete processedRow.shipping_first_name;
            delete processedRow.shipping_last_name;
            delete processedRow.shipping_address_line1;
            delete processedRow.shipping_address_line2;
            delete processedRow.shipping_city;
            delete processedRow.shipping_county;
            delete processedRow.shipping_postal_code;
            delete processedRow.shipping_phone_number;
            delete processedRow.shipping_email;
            
            return processedRow;
        });
    
        return processedRows;
    }

    async updatePassword(id, currentPassword, newPassword ) {
        const { error } = changePasswordSchema.validate({ currentPassword, newPassword });
        if (error) {
            throw new Error(error.details[0].message);
        }

        const query = 'SELECT password FROM users WHERE id = $1';
        const result = await db.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }

        const currentHashedPassword = result.rows[0].password;

        const isMatch = await bcrypt.compare(currentPassword, currentHashedPassword);
        if (!isMatch) {
            throw new Error('Current password is incorrect');
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        const updateQuery = 'UPDATE users SET password = $1 WHERE id = $2';
        await db.query(updateQuery, [hashedNewPassword, id]);

        return { message: 'Password changed successfully' };
    }

    async delete(id, password) {

        const query = 'SELECT password FROM users WHERE id = $1';
        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            throw new Error('Wrong Password');
        }

        const retrieved_hash = result.rows[0].password;
        const isPasswordValid = await bcrypt.compare(password, retrieved_hash);

        if (!isPasswordValid) {
            throw new Error('Wrong Password');
        }

        if (isPasswordValid){
            const query = 'DELETE FROM users WHERE id = $1';
            const result = await db.query(query, [id]);
            if(result){
                return { message: 'Account deleted successfully' };
            }
        }
    }
    async validate(id, isAdmin) {
        const query = "SELECT firstname FROM users WHERE id = $1";
        const result = await db.query(query, [id]);
    
        if (result.rows.length === 0) {
            return { error: "User not found" }
        }
    
        return { 
            firstname: result.rows[0].firstname,
            isAdmin: isAdmin
        }
    }

    async updateUserInfo(id, deliveryInfo, phone) {

        const deliveryQuery = `UPDATE users set 
            address_line1 = $1,
            address_line2 = $2,
            city = $3,
            county = $4,
            postcode = $5,
            phone_number = $6
            WHERE id = $7`;

        const phoneQuery = `UPDATE users set phone_number = $1 WHERE id = $2`;

        if(deliveryInfo){
            const result = await db.query(deliveryQuery, [deliveryInfo.address_line1, deliveryInfo.address_line2, deliveryInfo.city, deliveryInfo.county, deliveryInfo.postal_code, phone, id]);

            if (result.rows.length === 0) {
                return { error: "User not found" }
            }
        
            return { firstname: result.rows[0].firstname }
        }
        const result = await db.query(phoneQuery, [phone, id]);

        if (result.rows.length === 0) {
            return { error: "User not found" }
        }
    
        return 
    }

}

module.exports = new AccountService();