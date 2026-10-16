import logger from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    logger.error(err);

    // Sequelize validation errors
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        return res.status(422).json({
            success: false,
            message: 'Validation error',
            errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
        });
    }

    // Zod validation errors
    if (err.name === 'ZodError') {
        const issues = err.errors || err.issues || [];
        const errorMessages = issues.map((e) => `${e.path?.join('.') || 'field'}: ${e.message}`).join(', ');
        return res.status(400).json({
            success: false,
            message: errorMessages,
            errors: issues,
        });
    }

    // JWT errors (shouldn't reach here normally, handled in authenticate)
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const statusCode = err.statusCode || err.status || 500;
    const message =
        process.env.NODE_ENV === 'production' && statusCode === 500
            ? 'Internal Server Error'
            : err.message || 'Internal Server Error';

    return res.status(statusCode).json({ success: false, message });
};

export default errorHandler;
