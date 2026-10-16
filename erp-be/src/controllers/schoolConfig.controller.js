'use strict';

import db from '../models/index.js';
import { success, error } from '../utils/apiResponse.js';
import { updateSchoolConfigSchema } from '../validators/schoolConfig.validator.js';

const { SchoolConfig } = db;

// =============================================================================
// GET /api/school-config
// Get the single school configuration
// =============================================================================
export const getSchoolConfig = async (req, res, next) => {
    try {
        let config = await SchoolConfig.findOne();
        
        if (!config) {
            // Return empty/default config if it doesn't exist yet
            return success(res, {}, 'No school configuration found. Please create one.');
        }

        return success(res, config, 'School configuration fetched successfully');
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// POST /api/school-config
// Create or update the single school configuration
// =============================================================================
export const updateSchoolConfig = async (req, res, next) => {
    try {
        const validated = updateSchoolConfigSchema.parse(req.body);

        let config = await SchoolConfig.findOne();

        // If files were uploaded, they will be in req.body.logoUrl or watermarkUrl from middleware
        const logoUrl = req.body.logoUrl || (config ? config.logoUrl : null);
        const watermarkUrl = req.body.watermarkUrl || (config ? config.watermarkUrl : null);

        if (config) {
            // Update existing
            config = await config.update({
                ...validated,
                logoUrl,
                watermarkUrl,
            });
            return success(res, config, 'School configuration updated successfully');
        } else {
            // Create new
            config = await SchoolConfig.create({
                ...validated,
                logoUrl,
                watermarkUrl,
            });
            return success(res, config, 'School configuration created successfully', 201);
        }
    } catch (err) {
        next(err);
    }
};
