const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const supportEmail = "youremail@mail.com"
const logoURL = "https://yourlogourl.com"

class EmailService {
    constructor() {
        // Initialize SES client with just the region
        this.sesClient = new SESClient({ 
            region: 'eu-west-2'
        });
    }

    async sendOrderConfirmation(order, userEmail) {
        const template = order.delivery_type === 'collection' 
            ? this._generateCollectionConfirmationHTML(order)
            : this._generateDeliveryConfirmationHTML(order);
        
        const params = {
            Source: process.env.SES_FROM_EMAIL,
            Destination: {
                ToAddresses: [userEmail]
            },
            Message: {
                Subject: {
                    Data: `Order Confirmation.`
                },
                Body: {
                    Html: {
                        Data: template
                    }
                }
            }
        };

        try {
            const command = new SendEmailCommand(params);
            await this.sesClient.send(command);
        } catch (error) {
            console.error('Error sending order confirmation email:', error);
            throw error;
        }
    }

    async sendOrderReady(order, userEmail) {
        const isCollection = order.delivery_option === 'collection';
        
        const template = isCollection 
            ? this._generateOrderReadyForCollectionHTML(order)
            : this._generateOrderReadyForDeliveryHTML(order);
        const subject = isCollection 
            ? `Your Order is Ready for Collection!`
            : `Your Order is Ready for Delivery!`;

        const params = {
            Source: process.env.SES_FROM_EMAIL,
            Destination: {
                ToAddresses: [userEmail]
            },
            Message: {
                Subject: {
                    Data: subject
                },
                Body: {
                    Html: {
                        Data: template
                    }
                }
            }
        };

        try {
            const command = new SendEmailCommand(params);
            await this.sesClient.send(command);
        } catch (error) {
            console.error('Error sending order ready email:', error);
            throw error;
        }
    }
    _generateDeliveryConfirmationHTML(order) {
        const itemsHTML = order.item_info.map(item => `
            <div class="item">
                <div class="item-details">
                    <div class="item-image">
                        <img src="${item.image_url}" alt="${item.display_name}">
                    </div>
                    <div class="item-info">
                        <h3>${item.display_name}</h3>
                        <p>${item.brand_name}</p>
                        <p>Quantity: ${item.quantity}</p>
                        ${item.option ? `<p>Option: ${item.option}</p>` : ''}
                    </div>
                </div>
                <div class="item-price">£${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Order Confirmation</title>
                <style>
                    body, p, h1, h2, h3, div {
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                    }
                    
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 16px;
                        background-color: #000000;
                        color: #ffffff;
                    }
                    
                    .logo-container {
                        text-align: center;
                        margin: 40px 0;
                    }

                    .logo-container img {
                        max-width: 100%;
                        height: auto;
                        object-fit: contain;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    
                    .header h1 {
                        font-size: 24px;
                        font-weight: 600;
                        margin-bottom: 40px;
                    }
                    
                    .main-content {
                        background-color: #18181b;
                        border-radius: 8px;
                        padding: 24px;
                        margin-bottom: 32px;
                    }
                    
                    .thank-you {
                        font-size: 30px;
                        font-weight: bold;
                        margin-bottom: 16px;
                    }
                    
                    .order-message {
                        color: #d1d5db;
                        margin-bottom: 16px;
                    }
                    
                    .recap-title {
                        font-size: 24px;
                        font-weight: 600;
                        margin-bottom: 24px;
                    }
                    
                    .item {
                        display: table;
                        width: 100%;
                        margin-bottom: 24px;
                    }

                    .item-details {
                        display: table-cell;
                        vertical-align: top;
                        padding-right: 16px;
                        width: 100%; /* Ensure this takes up available space */
                    }

                    .item-price {
                        display: table-cell;
                        vertical-align: top;
                        text-align: right;
                        white-space: nowrap;
                    }

                    .item img {
                        max-width: 55px;
                        max-height: 55px;
                        float: left;
                        border-radius: 4px;
                        height: 55px;
                        width: 55px;
                        margin-right: 10px;
                        object-fit: cover;
                    }

                    .item-info {
                        overflow: hidden; /* Creates a new block formatting context */
                        display: block;
                    }

                    .item-info h3 {
                        font-weight: 600;
                        margin-bottom: 4px;
                        display: -webkit-box;
                        -webkit-line-clamp: 2; /* Limits text to 2 lines */
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        word-wrap: break-word;
                    }

                    .item-info p {
                        font-size: 14px;
                        color: #9ca3af;
                        word-wrap: break-word;
                    }
                    
                    .price-summary {
                        border-top: 1px solid #374151;
                        padding-top: 16px;
                        margin-top: 16px;
                    }
                    
                    .price-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 8px;
                    }
                    
                    .price-row span:first-child {
                        display: table-cell;
                        text-align: left;
                    }
                    
                    .price-row span:last-child {
                        display: table-cell;
                        text-align: right;
                    }
                    
                    .price-label {
                        color: #9ca3af;
                    }
                    
                    .total-row {
                        font-weight: 600;
                    }
                    
                    .contact-grid {
                        display: table;
                        width: 100%;
                        margin-top: 32px;
                        padding-top: 32px;
                        border-top: 1px solid #374151;
                    }
                    
                    .contact-section {
                        display: table-cell;
                        width: 50%;
                    }
                    
                    .contact-section h3 {
                        font-weight: 600;
                        margin-bottom: 8px;
                    }
                    
                    .contact-section p {
                        color: #9ca3af;
                    }
                    
                    .contact-section a {
                        color: #9ca3af;
                        text-decoration: underline;
                    }
                    
                    .questions {
                        background-color: #ffffff;
                        color: #000000;
                        padding: 24px;
                        border-radius: 8px;
                        text-align: center;
                    }
                    
                    .questions h2 {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 16px;
                    }
                    
                    .questions a {
                        color: #000000;
                        text-decoration: underline;
                    }
                    .promotions {
                        display: block;
                        width: 100%;
                    }

                    .promotion-item {
                        display: block;
                        margin-bottom: 8px;
                    }

                    .price-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 8px;
                    }

                    .price-row span:first-child {
                        display: table-cell;
                        text-align: left;
                        vertical-align: top;
                    }

                    .price-row span:last-child {
                        display: table-cell;
                        text-align: right;
                        vertical-align: top;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo-container">
                        <img src="${logoURL}">
                    </div>
                    
                    <div class="main-content">
                        <h2 style="padding-bottom: 16px;">Order Confirmed!</h2>
                        <p class="order-message">Your order was placed successfully and will be processed in the coming days.</p>
                        <p class="order-message">We'll be in touch soon with another email containing details regarding delivery.</p>
                        
                        <h2 style="padding-bottom: 16px;">Order Summary:</h2>
                        
                        ${itemsHTML}
                        
                        <div class="price-summary">
                            <div class="price-row">
                                <span>Subtotal</span>
                                <span>£${order.original_total}</span>
                            </div>
                            <div class="price-row">
                                <span>Delivery</span>
                                <span>£3.50</span>
                            </div>
                            ${order.free_magnet || order.free_mug || parseFloat(order.discount_value) > 0 ? `
                                <div class="price-row" style="color: #22c55e;">
                                    <div class="promotions">
                                        <span class="promotion-item" style="margin-bottom: 4px;">Promotions</span>
                                        ${order.free_magnet ? '<span class="promotion-item">+ Free Magnet</span>' : ''}
                                        ${order.free_mug ? '<span class="promotion-item">+ Free Mug</span>' : ''}
                                    </div>
                                    ${parseFloat(order.discount_value) > 0 ? 
                                        `<span>-£${parseFloat(order.discount_value).toFixed(2)}</span>` 
                                        : ''
                                    }
                                </div>
                            ` : ''}
                            <div class="price-row total-row">
                                <span>Total Amount</span>
                                <span>£${(parseFloat(order.final_total)).toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <div class="contact-grid">
                            <div class="contact-section">
                                <h3>Delivery Details</h3>
                                <p>${order.shipping.first_name} ${order.shipping.last_name}</p>
                                <p>${order.shipping.address_line1}</p>
                                ${order.shipping.address_line2 ? `<p>${order.shipping.address_line2}</p>` : ''}
                                <p>${order.shipping.city}</p>
                                <p>${order.shipping.postal_code}<p>
                            </div>
                            <div class="contact-section">
                                <h3>Contact Details</h3>
                                <p>${order.name}</p>
                                <p>${order.email}</p>
                                <p>${order.phone ? `<a href="tel:${order.phone}">${order.phone}</a>` : ''}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="questions">
                        <h2>Any Questions About Your Order?</h2>
                        <p>Feel free to email us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    _generateCollectionConfirmationHTML(order) {
        const itemsHTML = order.item_info.map(item => `
            <div class="item">
                <div class="item-details">
                    <div class="item-image">
                        <img src="${item.image_url}" alt="${item.display_name}">
                    </div>
                    <div class="item-info">
                        <h3>${item.display_name}</h3>
                        <p>${item.brand_name}</p>
                        <p>Quantity: ${item.quantity}</p>
                        ${item.option ? `<p>Option: ${item.option}</p>` : ''}
                    </div>
                </div>
                <div class="item-price">£${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Order Confirmation</title>
                <style>
                    body, p, h1, h2, h3, div {
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                    }
                    
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 16px;
                        background-color: #000000;
                        color: #ffffff;
                    }
                    
                    .thank-you {
                        font-size: 30px;
                        font-weight: bold;
                        margin-bottom: 16px;
                    }

                    .logo-container {
                        text-align: center;
                        margin: 40px 0;
                    }

                    .logo-container img {
                        max-width: 100%;
                        height: auto;
                        object-fit: contain;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    
                    .header h1 {
                        font-size: 24px;
                        font-weight: 600;
                        margin-bottom: 40px;
                    }
                    
                    .main-content {
                        background-color: #18181b;
                        border-radius: 8px;
                        padding: 24px;
                        margin-bottom: 32px;
                    }
                    
                    .thank-you {
                        font-size: 30px;
                        font-weight: bold;
                        margin-bottom: 16px;
                    }
                    
                    .order-message {
                        color: #d1d5db;
                        margin-bottom: 16px;
                    }
                    
                    .recap-title {
                        font-size: 24px;
                        font-weight: 600;
                        margin-bottom: 24px;
                    }
                    
                    .item {
                        display: table;
                        width: 100%;
                        margin-bottom: 24px;
                    }

                    .item-details {
                        display: table-cell;
                        vertical-align: top;
                        padding-right: 16px;
                        width: 100%; /* Ensure this takes up available space */
                    }

                    .item-price {
                        display: table-cell;
                        vertical-align: top;
                        text-align: right;
                        white-space: nowrap;
                    }

                    .item img {
                        max-width: 55px;
                        max-height: 55px;
                        float: left;
                        border-radius: 4px;
                        height: 55px;
                        width: 55px;
                        margin-right: 10px;
                        object-fit: cover;
                    }

                    .item-info {
                        overflow: hidden; /* Creates a new block formatting context */
                        display: block;
                    }

                    .item-info h3 {
                        font-weight: 600;
                        margin-bottom: 4px;
                        display: -webkit-box;
                        -webkit-line-clamp: 2; /* Limits text to 2 lines */
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        word-wrap: break-word;
                    }

                    .item-info p {
                        font-size: 14px;
                        color: #9ca3af;
                        word-wrap: break-word;
                    }
                    
                    .price-summary {
                        border-top: 1px solid #374151;
                        padding-top: 16px;
                        margin-top: 16px;
                    }
                    
                    .price-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 8px;
                    }
                    
                    .price-row span:first-child {
                        display: table-cell;
                        text-align: left;
                    }
                    
                    .price-row span:last-child {
                        display: table-cell;
                        text-align: right;
                    }
                    
                    .price-label {
                        color: #9ca3af;
                    }
                    
                    .total-row {
                        font-weight: 600;
                    }
                    
                    .contact-grid {
                        display: table;
                        width: 100%;
                        margin-top: 32px;
                        padding-top: 32px;
                        border-top: 1px solid #374151;
                    }
                    
                    .contact-section {
                        display: table-cell;
                        width: 50%;
                    }
                    
                    .contact-section h3 {
                        font-weight: 600;
                        margin-bottom: 8px;
                    }
                    
                    .contact-section p {
                        color: #9ca3af;
                    }
                    
                    .contact-section a {
                        color: #9ca3af;
                        text-decoration: underline;
                    }
                    
                    .questions {
                        background-color: #ffffff;
                        color: #000000;
                        padding: 24px;
                        border-radius: 8px;
                        text-align: center;
                    }
                    
                    .questions h2 {
                        font-size: 24px;
                        font-weight: bold;
                        margin-bottom: 16px;
                    }
                    
                    .questions a {
                        color: #000000;
                        text-decoration: underline;
                    }
                    .promotions {
                        display: block;
                        width: 100%;
                    }

                    .promotion-item {
                        display: block;
                        margin-bottom: 8px;
                    }

                    .price-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 8px;
                    }

                    .price-row span:first-child {
                        display: table-cell;
                        text-align: left;
                        vertical-align: top;
                    }

                    .price-row span:last-child {
                        display: table-cell;
                        text-align: right;
                        vertical-align: top;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo-container">
                        <img src="${logoURL}">
                    </div>
                    
                    <div class="main-content">
                        <h2 style="padding-bottom: 16px;">Order Confirmed!</h2>
                        <p class="order-message">Your order was placed succesfully and will be processed in the coming days.</p>
                        <p class="order-message"> We'll be in touch soon with another email containing details regarding collection.</p>
                        
                        <h2 style="padding-bottom: 16px;">Order Summary:</h2>
                        
                        ${itemsHTML}
                        
                        <div class="price-summary">
                            <div class="price-row">
                                <span>Subtotal</span>
                                <span>£${order.original_total}</span>
                            </div>
                            <div class="price-row">
                                <span>Delivery</span>
                                <span>£0.00</span>
                            </div>
                            ${order.free_magnet || order.free_mug || parseFloat(order.discount_value) > 0 ? `
                                <div class="price-row" style="color: #22c55e;">
                                    <div class="promotions">
                                        <span class="promotion-item" style="margin-bottom: 4px;">Promotions</span>
                                        ${order.free_magnet ? '<span class="promotion-item">+ Free Magnet</span>' : ''}
                                        ${order.free_mug ? '<span class="promotion-item">+ Free Mug</span>' : ''}
                                    </div>
                                    ${parseFloat(order.discount_value) > 0 ? 
                                        `<span>-£${parseFloat(order.discount_value).toFixed(2)}</span>` 
                                        : ''
                                    }
                                </div>
                            ` : ''}
                            <div class="price-row total-row">
                                <span>Total Amount</span>
                                <span>£${parseFloat(order.final_total).toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <div class="contact-grid">
                            <div class="contact-section">
                                <h3>Delivery Details</h3>
                                <p>In-store collection<p>
                            </div>
                            <div class="contact-section">
                                <h3>Contact Details</h3>
                                <p>${order.name}</p>
                                <p>${order.email}</p>
                                <p>${order.phone ? `<a href="tel:${order.phone}">${order.phone}</a>` : ''}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="questions">
                        <h2>Any Questions About Your Order?</h2>
                        <p>Feel free to email us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    _generateOrderReadyForDeliveryHTML(order) {
        const itemsHTML = order.items.map(item => `
            <div class="item">
                <div class="item-details">
                    <div class="item-image">
                        <img src="${item.image_url}" alt="${item.name}">
                    </div>
                    <div class="item-info">
                        <h3>${item.name}</h3>
                        <p>${item.brand}</p>
                        <p>Quantity: ${item.quantity}</p>
                        ${item.option ? `<p>Option: ${item.option}</p>` : ''}
                    </div>
                </div>
                <div class="item-price">£${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Ready for Delivery</title>
    <style>
        body, p, h1, h2, h3, div {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 16px;
            background-color: #000000;
            color: #ffffff;
        }
        .logo-container {
            text-align: center;
            margin: 40px 0;
        }

        .logo-container img {
            max-width: 100%;
            height: auto;
            object-fit: contain;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 40px;
        }
        .main-content {
            background-color: #18181b;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 32px;
        }
        .thank-you {
            font-size: 30px;
            font-weight: bold;
            margin-bottom: 16px;
        }
        .order-message {
            color: #d1d5db;
            margin-bottom: 16px;
        }
        .recap-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 24px;
        }
        .item {
            display: table;
            width: 100%;
            margin-bottom: 24px;
        }

        .item-details {
            display: table-cell;
            vertical-align: top;
            padding-right: 16px;
            width: 100%; /* Ensure this takes up available space */
        }

        .item-price {
            display: table-cell;
            vertical-align: top;
            text-align: right;
            white-space: nowrap;
        }

        .item img {
            max-width: 55px;
            max-height: 55px;
            float: left;
            border-radius: 4px;
            height: 55px;
            width: 55px;
            margin-right: 10px;
            object-fit: cover;
        }

        .item-info {
            overflow: hidden; /* Creates a new block formatting context */
            display: block;
        }

        .item-info h3 {
            font-weight: 600;
            margin-bottom: 4px;
            display: -webkit-box;
            -webkit-line-clamp: 2; /* Limits text to 2 lines */
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-wrap: break-word;
        }

        .item-info p {
            font-size: 14px;
            color: #9ca3af;
            word-wrap: break-word;
        }
        .price-summary {
            border-top: 1px solid #374151;
            padding-top: 16px;
            margin-top: 16px;
        }
        .price-row {
            display: table;
            width: 100%;
            margin-bottom: 8px;
        }
        .price-row span:first-child {
            display: table-cell;
            text-align: left;
        }
        .price-row span:last-child {
            display: table-cell;
            text-align: right;
        }
        .price-label {
            color: #9ca3af;
        }
        .total-row {
            font-weight: 600;
        }
        .contact-grid {
            display: table;
            width: 100%;
            margin-top: 32px;
            padding-top: 32px;
            border-top: 1px solid #374151;
        }
        .contact-section {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 16px;
        }
        .contact-section h3 {
            font-weight: 600;
            margin-bottom: 8px;
        }
        .contact-section p {
            color: #9ca3af;
        }
        .contact-section a {
            color: #9ca3af;
            text-decoration: underline;
        }
        .questions {
            background-color: #ffffff;
            color: #000000;
            padding: 24px;
            border-radius: 8px;
            text-align: center;
            margin-top: 32px;
        }
        .questions h2 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 16px;
        }
        .questions a {
            color: #000000;
            text-decoration: underline;
        }
        .promotions {
            display: block;
            width: 100%;
        }

        .promotion-item {
            display: block;
            margin-bottom: 8px;
        }

        .price-row {
            display: table;
            width: 100%;
            margin-bottom: 8px;
        }

        .price-row span:first-child {
            display: table-cell;
            text-align: left;
            vertical-align: top;
        }

        .price-row span:last-child {
            display: table-cell;
            text-align: right;
            vertical-align: top;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-container">
            <img src="${logoURL}">
        </div>
        
        
        <div class="main-content">
            <h2 style="padding-bottom: 16px;">Order Processed</h2>
            <p class="order-message">Your order has been processed & is ready for delivery.</p>
            <p class="order-message">We'll aim to deliver it on <b>${order.delivery_date}</b>.</p>
            
            <h2 style="padding-bottom: 16px;">Order Summary</h2>
            
            ${itemsHTML}
            
            <div class="price-summary">
                <div class="price-row">
                    <span>Subtotal</span>
                    <span>£${order.original_total}</span>
                </div>
                <div class="price-row">
                    <span>Delivery</span>
                    <span>£3.50</span>
                </div>
                ${order.free_magnet || order.free_mug || parseFloat(order.discount_value) > 0 ? `
                    <div class="price-row" style="color: #22c55e;">
                        <div class="promotions">
                            <span class="promotion-item" style="margin-bottom: 4px;">Promotions</span>
                            ${order.free_magnet ? '<span class="promotion-item">+ Free Magnet</span>' : ''}
                            ${order.free_mug ? '<span class="promotion-item">+ Free Mug</span>' : ''}
                        </div>
                        ${parseFloat(order.discount_value) > 0 ? 
                            `<span>-£${parseFloat(order.discount_value).toFixed(2)}</span>` 
                            : ''
                        }
                    </div>
                ` : ''}
                <div class="price-row total-row">
                    <span>Total Amount</span>
                    <span>£${parseFloat(order.final_total).toFixed(2)}</span>
                </div>
            </div>
            
            <div class="contact-grid">
                <div class="contact-section">
                    <h3>Delivery Details</h3>
                    <p>${order.delivery_address.line1}</p>
                    ${order.delivery_address.line2 ? `<p>${order.delivery_address.line2}</p>` : ''}
                    <p>${order.delivery_address.city}</p>
                    <p>${order.delivery_address.postcode}</p>
                </div>
                <div class="contact-section">
                    <h3>Contact Details</h3>
                    <p>${order.contact_details.name}</p>
                    <p>${order.contact_details.email}</p>
                    <p>${order.contact_details.phone ? `<a href="tel:${order.contact_details.phone}">${order.contact_details.phone}</a>` : ''}</p>
                </div>
            </div>
        </div>

        <div class="questions">
            <h2>Any Questions About Your Order?</h2>
            <p>
                Feel free to email us at 
                <p>Feel free to email us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
            </p>
        </div>
    </div>
</body>
</html>`;
    }

    _generateOrderReadyForCollectionHTML(order) {
        const itemsHTML = order.items.map(item => `
            <div class="item">
                <div class="item-details">
                    <div class="item-image">
                        <img src="${item.image_url}" alt="${item.name}">
                    </div>
                    <div class="item-info">
                        <h3>${item.name}</h3>
                        <p>${item.brand}</p>
                        <p>Quantity: ${item.quantity}</p>
                        ${item.option ? `<p>Option: ${item.option}</p>` : ''}
                    </div>
                </div>
                <div class="item-price">£${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
            </div>
        `).join('');

        return `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Order Ready for Collection</title>
                    <style>
                        body, p, h1, h2, h3, div {
                            margin: 0;
                            padding: 0;
                            font-family: Arial, sans-serif;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 16px;
                            background-color: #000000;
                            color: #ffffff;
                        .logo-container {
                            text-align: center;
                            margin: 40px 0;
                        }

                        .logo-container img {
                            max-width: 100%;
                            height: auto;
                            object-fit: contain;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 40px;
                        }
                        .header h1 {
                            font-size: 24px;
                            font-weight: 600;
                            margin-bottom: 40px;
                        }
                        .main-content {
                            background-color: #18181b;
                            border-radius: 8px;
                            padding: 24px;
                            margin-bottom: 32px;
                        }
                        .thank-you {
                            font-size: 30px;
                            font-weight: bold;
                            margin-bottom: 16px;
                        }
                        .order-message {
                            color: #d1d5db;
                            margin-bottom: 16px;
                        }
                        .recap-title {
                            font-size: 24px;
                            font-weight: 600;
                            margin-bottom: 24px;
                        }
                        .item {
                            display: table;
                            width: 100%;
                            margin-bottom: 24px;
                        }

                        .item-details {
                            display: table-cell;
                            vertical-align: top;
                            padding-right: 16px;
                            width: 100%; /* Ensure this takes up available space */
                        }

                        .item-price {
                            display: table-cell;
                            vertical-align: top;
                            text-align: right;
                            white-space: nowrap;
                        }

                        .item img {
                            max-width: 55px;
                            max-height: 55px;
                            float: left;
                            border-radius: 4px;
                            height: 55px;
                            width: 55px;
                            margin-right: 10px;
                            object-fit: cover;
                        }
                        .item-info {
                            overflow: hidden; /* Creates a new block formatting context */
                            display: block;
                        }

                        .item-info h3 {
                            font-weight: 600;
                            margin-bottom: 4px;
                            display: -webkit-box;
                            -webkit-line-clamp: 2; /* Limits text to 2 lines */
                            -webkit-box-orient: vertical;
                            overflow: hidden;
                            word-wrap: break-word;
                        }

                        .item-info p {
                            font-size: 14px;
                            color: #9ca3af;
                            word-wrap: break-word;
                        }
                        .price-summary {
                            border-top: 1px solid #374151;
                            padding-top: 16px;
                            margin-top: 16px;
                        }
                        .price-row {
                            display: table;
                            width: 100%;
                            margin-bottom: 8px;
                        }
                        .price-row span:first-child {
                            display: table-cell;
                            text-align: left;
                        }
                        .price-row span:last-child {
                            display: table-cell;
                            text-align: right;
                        }
                        .price-label {
                            color: #9ca3af;
                        }
                        .total-row {
                            font-weight: 600;
                        }
                        .contact-grid {
                            display: table;
                            width: 100%;
                            margin-top: 32px;
                            padding-top: 32px;
                            border-top: 1px solid #374151;
                        }
                        .contact-section {
                            display: table-cell;
                            width: 50%;
                            vertical-align: top;
                            padding-right: 16px;
                        }
                        .contact-section h3 {
                            font-weight: 600;
                            margin-bottom: 8px;
                        }
                        .contact-section p {
                            color: #9ca3af;
                        }
                        .contact-section a {
                            color: #9ca3af;
                            text-decoration: underline;
                        }
                        .questions {
                            background-color: #ffffff;
                            color: #000000;
                            padding: 24px;
                            border-radius: 8px;
                            text-align: center;
                            margin-top: 32px;
                        }
                        .questions h2 {
                            font-size: 24px;
                            font-weight: bold;
                            margin-bottom: 16px;
                        }
                        .questions a {
                            color: #000000;
                            text-decoration: underline;
                        }
                        .highlight {
                            font-weight: 600;
                            text-decoration: underline;
                        }
                        .promotions {
                            display: block;
                            width: 100%;
                        }

                        .promotion-item {
                            display: block;
                            margin-bottom: 8px;
                        }

                        .price-row {
                            display: table;
                            width: 100%;
                            margin-bottom: 8px;
                        }

                        .price-row span:first-child {
                            display: table-cell;
                            text-align: left;
                            vertical-align: top;
                        }

                        .price-row span:last-child {
                            display: table-cell;
                            text-align: right;
                            vertical-align: top;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="logo-container">
                            <img src="${logoURL}">
                        </div>

                        <div class="main-content">
                            <h2 style="padding-bottom: 16px;">Order Processed</h2>
                            <p class="order-message">Your order has been processed & is ready for collection.</p>
                            <p class="order-message">Drop by the shop between <span class="highlight">2:00pm & 3:00pm, Monday to Friday.</span> See collection address below.</p>
                            <h2 style="padding-bottom: 16px;">Order Summary</h2>
                            
                            ${itemsHTML}
                            
                            <div class="price-summary">
                                <div class="price-row">
                                    <span>Subtotal</span>
                                    <span>£${order.original_total}</span>
                                </div>
                                <div class="price-row">
                                    <span>Delivery</span>
                                    <span>£0.00</span>
                                </div>
                                ${order.free_magnet || order.free_mug || parseFloat(order.discount_value) > 0 ? `
                                    <div class="price-row" style="color: #22c55e;">
                                        <div class="promotions">
                                            <span class="promotion-item" style="margin-bottom: 4px;">Promotions</span>
                                            ${order.free_magnet ? '<span class="promotion-item">+ Free Magnet</span>' : ''}
                                            ${order.free_mug ? '<span class="promotion-item">+ Free Mug</span>' : ''}
                                        </div>
                                        ${parseFloat(order.discount_value) > 0 ? 
                                            `<span>-£${parseFloat(order.discount_value).toFixed(2)}</span>` 
                                            : ''
                                        }
                                    </div>
                                ` : ''}
                                <div class="price-row total-row">
                                    <span>Total Amount</span>
                                    <span>£${parseFloat(order.final_total).toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div class="contact-grid">
                                <div class="contact-section">
                                    <h3>Shop Address</h3>
                                    <p></p>
                                    <p>9 West Port</p>
                                    <p>Dunbar</p>
                                    <p>EH42 1BT</p>
                                </div>
                                <div class="contact-section">
                                    <h3>Contact Details</h3>
                                    <p>${order.contact_details.name}</p>
                                    <p>${order.contact_details.email}</p>
                                    <p>${order.contact_details.phone ? `<a href="tel:${order.contact_details.phone}">${order.contact_details.phone}</a>` : ''}</p>
                                </div>
                            </div>
                        </div>

                        <div class="questions">
                            <h2>Any Questions About Your Order?</h2>
                            <p>
                                Feel free to email us at 
                                <p>Feel free to email us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
                            </p>
                        </div>
                    </div>
                </body>
                </html>`;
    }
}

module.exports = new EmailService();