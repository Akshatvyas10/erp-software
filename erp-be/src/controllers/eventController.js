import db from '../models/index.js';
const { CalendarEvent, User, Classroom, EventType, Student, ClassroomStudent } = db;
import { success, error } from '../utils/apiResponse.js';
import { Op } from 'sequelize';
import {
    parseISO,
    addDays,
    subDays,
    addYears,
    eachDayOfInterval,
    isSunday,
    isSaturday,
    startOfDay,
    endOfDay,
    getDate,
} from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isAdmin = (roles) => roles.includes('admin') || roles.includes('super_admin');
const isTeacher = (roles) => roles.includes('teacher');
const isStudent = (roles) => roles.includes('student');

// ─── Controller Methods ───────────────────────────────────────────────────────

export const getEvents = async (req, res, next) => {
    try {
        const roles = req.userRoles;
        const userId = req.user.id;

        // Build where clause based on RBAC
        let where = {};

        if (isAdmin(roles)) {
            // Admins see everything
            where = {};
        } else if (isTeacher(roles)) {
            // Teachers see all published events and draft events they created
            where = {
                [Op.or]: [
                    { status: 'PUBLISHED' },
                    { created_by: userId }
                ]
            };
        } else if (isStudent(roles)) {
            // Find student profile and their enrolled classrooms
            let studentClassroomIds = [];
            const studentProfile = await Student.findOne({
                where: { userId },
                include: [{
                    model: ClassroomStudent,
                    as: 'classroomEnrollments',
                    attributes: ['classroomId']
                }]
            });

            if (studentProfile && studentProfile.classroomEnrollments) {
                studentClassroomIds = studentProfile.classroomEnrollments.map(e => e.classroomId);
            }

            // Students see events targeted to ALL, STUDENTS, or specifically their enrolled CLASS
            const audienceConditions = [
                { target_audience: 'ALL' },
                { target_audience: 'STUDENTS' }
            ];

            if (studentClassroomIds.length > 0) {
                audienceConditions.push({
                    [Op.and]: [
                        { target_audience: 'CLASS' },
                        { target_class_id: { [Op.in]: studentClassroomIds } }
                    ]
                });
            }

            where = {
                status: 'PUBLISHED',
                [Op.or]: audienceConditions
            };
        }

        const events = await CalendarEvent.findAll({
            where,
            include: [
                { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
                { model: Classroom, as: 'targetClass', attributes: ['id', 'name', 'section', 'academicYear'] }
            ],
            order: [['start_date', 'ASC']]
        });

        return success(res, events, 'Events retrieved successfully');
    } catch (err) {
        next(err);
    }
};

export const getEventTypes = async (req, res, next) => {
    try {
        const types = await EventType.findAll({
            order: [['name', 'ASC']]
        });
        return success(res, types, 'Event types retrieved successfully');
    } catch (err) {
        next(err);
    }
};

export const createEvent = async (req, res, next) => {
    try {
        const roles = req.userRoles;
        const data = req.body;

        // Teacher constraints
        if (!isAdmin(roles) && isTeacher(roles)) {
            data.status = 'DRAFT';
            data.targetAudience = 'CLASS';
            if (!data.targetClassId) {
                return error(res, 'Teachers must specify a target class for events', 400);
            }
        }

        const event = await CalendarEvent.create({
            title: data.title,
            description: data.description,
            type: data.type,
            start_date: data.startDate,
            end_date: data.endDate,
            day_type: data.dayType,
            location: data.location,
            status: data.status,
            target_audience: data.targetAudience,
            target_class_id: data.targetClassId,
            created_by: req.user.id
        });

        return success(res, event, 'Event created successfully', 201);
    } catch (err) {
        next(err);
    }
};

export const updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const roles = req.userRoles;
        const data = req.body;

        const event = await CalendarEvent.findByPk(id);
        if (!event) return error(res, 'Event not found', 404);

        // Teacher constraints: ensure they don't bypass restrictions on update
        if (!isAdmin(roles) && isTeacher(roles)) {
            data.status = 'DRAFT'; 
            data.targetAudience = 'CLASS';
        }

        await event.update({
            title: data.title !== undefined ? data.title : event.title,
            description: data.description !== undefined ? data.description : event.description,
            type: data.type !== undefined ? data.type : event.type,
            start_date: data.startDate !== undefined ? data.startDate : event.start_date,
            end_date: data.endDate !== undefined ? data.endDate : event.end_date,
            day_type: data.dayType !== undefined ? data.dayType : event.day_type,
            location: data.location !== undefined ? data.location : event.location,
            status: data.status !== undefined ? data.status : event.status,
            target_audience: data.targetAudience !== undefined ? data.targetAudience : event.target_audience,
            target_class_id: data.targetClassId !== undefined ? data.targetClassId : event.target_class_id,
        });

        return success(res, event, 'Event updated successfully');
    } catch (err) {
        next(err);
    }
};

export const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const roles = req.userRoles;

        const event = await CalendarEvent.findByPk(id);
        if (!event) return error(res, 'Event not found', 404);

        // RBAC and ownership handled by middlewares

        await event.destroy();
        return success(res, null, 'Event deleted successfully');
    } catch (err) {
        next(err);
    }
};

export const updateEventStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const roles = req.userRoles;

        if (!isAdmin(roles)) {
            return error(res, 'Only administrators can update event status', 403);
        }

        const event = await CalendarEvent.findByPk(id);
        if (!event) return error(res, 'Event not found', 404);

        await event.update({ status });
        return success(res, event, 'Event status updated successfully');
    } catch (err) {
        next(err);
    }
};

export const bulkGenerateHolidays = async (req, res, next) => {
    try {
        const roles = req.userRoles;
        if (!isAdmin(roles)) {
            return error(res, 'Only administrators can bulk generate holidays', 403);
        }

        const { sessionStartDate, sessionEndDate, saturdayRule, sundayRule } = req.body;
        const start = parseISO(sessionStartDate);
        const end = parseISO(sessionEndDate);
        
        if (start >= end) {
            return error(res, 'Session start date must be before end date', 400);
        }

        // 1. Delete existing auto-generated events for this time range
        const deleteStart = new Date(start.getFullYear(), 0, 1);
        const deleteEnd = new Date(end.getFullYear(), 11, 31, 23, 59, 59);

        await CalendarEvent.destroy({
            where: {
                is_auto_generated: true,
                start_date: {
                    [Op.gte]: deleteStart
                },
                end_date: {
                    [Op.lte]: deleteEnd
                }
            }
        });

        const eventsToCreate = [];
        const creatorId = req.user.id;

        // 2. Create Summer Vacation
        const summerVacationStart = addDays(end, 1);
        const summerVacationEnd = subDays(addYears(start, 1), 1);
        
        eventsToCreate.push({
            title: 'Summer Vacation',
            description: 'Auto-generated summer vacation',
            type: 'HOLIDAY',
            start_date: summerVacationStart,
            end_date: summerVacationEnd,
            day_type: 'HOLIDAY',
            status: 'PUBLISHED',
            target_audience: 'ALL',
            created_by: creatorId,
            is_auto_generated: true
        });

        // 3. Iterate through session days
        const days = eachDayOfInterval({ start, end });

        for (const day of days) {
            if (isSunday(day) && sundayRule === 'ALL') {
                eventsToCreate.push({
                    title: 'Sunday Holiday',
                    type: 'HOLIDAY',
                    start_date: startOfDay(day),
                    end_date: endOfDay(day),
                    day_type: 'HOLIDAY',
                    status: 'PUBLISHED',
                    target_audience: 'ALL',
                    created_by: creatorId,
                    is_auto_generated: true
                });
            } else if (isSaturday(day)) {
                const date = getDate(day);
                const weekOfMonth = Math.ceil(date / 7);

                let isHoliday = false;
                let isFullDay = true;

                if (saturdayRule === 'ALL') {
                    isHoliday = true;
                } else if (saturdayRule === 'SECOND_FOURTH' && (weekOfMonth === 2 || weekOfMonth === 4)) {
                    isHoliday = true;
                } else if (saturdayRule === 'HALF_DAY') {
                    isHoliday = true;
                    isFullDay = false;
                }

                if (isHoliday) {
                    eventsToCreate.push({
                        title: isFullDay ? 'Saturday Holiday' : 'Half-Day Saturday',
                        type: 'HOLIDAY',
                        start_date: startOfDay(day),
                        end_date: endOfDay(day),
                        day_type: saturdayRule === 'HALF_DAY' ? 'HALF_DAY' : 'HOLIDAY',
                        status: 'PUBLISHED',
                        target_audience: 'ALL',
                        created_by: creatorId,
                        is_auto_generated: true
                    });
                }
            }
        }

        // 4. Bulk insert
        await CalendarEvent.bulkCreate(eventsToCreate);

        return success(res, { generatedCount: eventsToCreate.length }, 'Holidays generated successfully', 201);
    } catch (err) {
        next(err);
    }
};
