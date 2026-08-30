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
    getDay
} from 'date-fns';

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

        // 1. Delete existing auto-generated events for this time range (to allow re-running)
        // We delete from the start of the year of sessionStartDate to end of the year of sessionEndDate
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

        // 2. Create Summer Vacation (from end date to the start of next session)
        const summerVacationStart = addDays(end, 1);
        const summerVacationEnd = subDays(addYears(start, 1), 1);
        
        eventsToCreate.push({
            title: 'Summer Vacation',
            description: 'Auto-generated summer vacation',
            type: 'HOLIDAY',
            start_date: summerVacationStart,
            end_date: summerVacationEnd,
            is_full_day: true,
            status: 'PUBLISHED',
            target_audience: 'ALL',
            created_by: creatorId,
            is_auto_generated: true
        });

        // 3. Iterate through session days to find weekends
        const days = eachDayOfInterval({ start, end });

        for (const day of days) {
            if (isSunday(day) && sundayRule === 'ALL') {
                eventsToCreate.push({
                    title: 'Sunday Holiday',
                    type: 'HOLIDAY',
                    start_date: startOfDay(day),
                    end_date: endOfDay(day),
                    is_full_day: true,
                    status: 'PUBLISHED',
                    target_audience: 'ALL',
                    created_by: creatorId,
                    is_auto_generated: true
                });
            } else if (isSaturday(day)) {
                // Calculate which Saturday of the month this is
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
                        // If it's a half day, we might set end date differently, but currently our model 
                        // just uses is_full_day to represent half days.
                        end_date: endOfDay(day), 
                        is_full_day: isFullDay,
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
