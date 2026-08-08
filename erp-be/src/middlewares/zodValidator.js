import { error } from '../utils/apiResponse.js';

/**
 * Validates request payloads against provided Zod schemas.
 * 
 * @param {Object} schemas - An object containing Zod schemas for 'body', 'query', and/or 'params'.
 * @returns {Function} Express middleware function.
 */
const validateZod = (schemas) => {
    return (req, res, next) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.query) {
                req.query = schemas.query.parse(req.query);
            }
            if (schemas.params) {
                req.params = schemas.params.parse(req.params);
            }
            next();
        } catch (err) {
            // Check if error is from Zod
            if (err.name === 'ZodError') {
                const formattedErrors = err.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message
                }));
                return error(res, 'Validation failed', 422, formattedErrors);
            }
            next(err);
        }
    };
};

export default validateZod;
