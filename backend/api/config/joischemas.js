const Joi = require('joi');
const PasswordComplexity = require('joi-password-complexity');

const passwordComplexityOptions = {
    min: 8,
    max: 30,
    lowerCase: 1,
    upperCase: 1,
    numeric: 1,
    requirementCount: 3 // Requires all 4 conditions to be met
};

const schema = Joi.object({
    firstname: Joi.string().max(50).required(),
    lastname: Joi.string().max(50).required(),
    email: Joi.string().email().required(),
    password: PasswordComplexity(passwordComplexityOptions).required()
});

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required()
        .messages({
            'any.required': 'Current password is required'
        }),
    newPassword: Joi.string()
        .min(8)
        .max(30)
        .pattern(new RegExp('(?=.*[a-z])')) // At least one lowercase letter
        .pattern(new RegExp('(?=.*[A-Z])')) // At least one uppercase letter
        .pattern(new RegExp('(?=.*[0-9])')) // At least one digit
        .pattern(new RegExp('^[^\\s]+$')) // No whitespace
        .required()
        .messages({
            'string.min': 'New password must be at least 8 characters long',
            'string.pattern.base': 'New password must include at least one uppercase letter, one lowercase letter, one number, and one special character, and must not contain spaces',
            'any.required': 'New password is required'
        })
});

module.exports = {
    schema,
    changePasswordSchema
};