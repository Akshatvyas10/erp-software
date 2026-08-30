import db from '../models/index.js';
const { CalendarEvent } = db;
import { error } from '../utils/apiResponse.js';

/**
 * checkEventOwnership
 * Ensures that if the user is a teacher (and not an admin),
 * they can only modify/delete events they created.
 */
export const checkEventOwnership = async (req, res, next) => {
    try {
        const { id } = req.params;
        const roles = req.userRoles || [];
        const userId = req.user?.id;

        if (!userId) {
            return error(res, 'Authentication required', 401);
        }

        const isAdmin = roles.includes('admin') || roles.includes('super_admin');
        const isTeacher = roles.includes('teacher');

        // If user is admin, they bypass ownership check
        if (isAdmin) {
            return next();
        }

        // If user is not admin, but they are a teacher, verify ownership
        if (isTeacher) {
            const event = await CalendarEvent.findByPk(id);
            if (!event) {
                return error(res, 'Event not found', 404);
            }

            if (event.created_by !== userId) {
                return error(res, 'Forbidden — you can only modify events you created', 403);
            }
        }

        next();
    } catch (err) {
        next(err);
    }
};
