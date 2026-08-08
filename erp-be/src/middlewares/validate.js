import { validationResult } from 'express-validator';
import { error } from '../utils/apiResponse.js';

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

export default validate;
