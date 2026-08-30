import express from 'express';
const router = express.Router();
import * as eventController from '../controllers/eventController.js';
const { getEvents, getEventTypes, createEvent, updateEvent, deleteEvent, updateEventStatus, bulkGenerateHolidays } = eventController;

import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import validateZod from '../middlewares/zodValidator.js';
import { createEventSchema, updateEventSchema, bulkGenerateHolidaysSchema } from '../validators/event.validator.js';
import { checkEventOwnership } from '../middlewares/event.middleware.js';
import { z } from 'zod';

// All event routes require authentication
router.use(authenticate);

// Get event types
router.get('/types', getEventTypes);

// Get events
router.get(
    '/', 
    validateZod({ 
        query: z.object({ 
            startDate: z.string().optional(), 
            endDate: z.string().optional(), 
            targetClassId: z.string().uuid().optional() 
        }) 
    }),
    requirePermission('events', 'read'), 
    getEvents
);

// Bulk generate holidays
router.post(
    '/bulk-holidays',
    validateZod({ body: bulkGenerateHolidaysSchema }),
    requirePermission('events', 'manage'),
    bulkGenerateHolidays
);

// Create event
router.post(
    '/', 
    validateZod({ body: createEventSchema }), 
    requirePermission('events', 'create'), 
    createEvent
);

// Update event
router.put(
    '/:id', 
    validateZod({ 
        params: z.object({ id: z.string().uuid() }),
        body: updateEventSchema 
    }), 
    requirePermission('events', 'update'), 
    checkEventOwnership,
    updateEvent
);

// Delete event
router.delete(
    '/:id', 
    validateZod({ params: z.object({ id: z.string().uuid() }) }), 
    requirePermission('events', 'delete'), 
    checkEventOwnership,
    deleteEvent
);

// Admin only: publish/cancel event
router.patch(
    '/:id/status', 
    validateZod({ 
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']) }) 
    }), 
    requirePermission('events', 'manage'), 
    checkEventOwnership,
    updateEventStatus
);

export default router;
