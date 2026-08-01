'use strict';

const { validationResult } = require('express-validator');
const { error } = require('../utils/apiResponse');

/**
 * Runs after express-validator chains and short-circuits on failure.
 */
const validate = (req, res, next) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        console.error("VALIDATION FAILED:", JSON.stringify(result.array(), null, 2));
        return error(res, 'Validation failed', 422, result.array());
    }
    next();
};

module.exports = validate;
