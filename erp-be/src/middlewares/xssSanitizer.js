import xss from 'xss';

/**
 * Recursively sanitizes string values in an object to prevent XSS.
 * 
 * @param {Object|Array|String} data 
 * @returns {Object|Array|String} Sanitized data
 */
const sanitizeData = (data) => {
    if (typeof data === 'string') {
        return xss(data.trim());
    }
    
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    }
    
    if (data !== null && typeof data === 'object') {
        const sanitizedObject = {};
        for (const [key, value] of Object.entries(data)) {
            sanitizedObject[key] = sanitizeData(value);
        }
        return sanitizedObject;
    }
    
    return data;
};

/**
 * Express middleware to sanitize incoming request payload (body, query, params)
 * against Cross-Site Scripting (XSS) attacks.
 */
const xssSanitizer = (req, res, next) => {
    if (req.body) req.body = sanitizeData(req.body);
    if (req.query) req.query = sanitizeData(req.query);
    if (req.params) req.params = sanitizeData(req.params);
    
    next();
};

export default xssSanitizer;
