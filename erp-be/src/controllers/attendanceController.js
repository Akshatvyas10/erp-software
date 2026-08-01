'use strict';

const { Op } = require('sequelize');
const { TeacherAttendance, Teacher, User } = require('../models');
const { success, error } = require('../utils/apiResponse');

// ─── GET /api/attendance/teacher/:teacherId?month=&year= ─────────────────────
const getTeacherAttendance = async (req, res, next) => {
    try {
        const { teacherId } = req.params;
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const end = new Date(year, month, 0).toISOString().split('T')[0];

        const records = await TeacherAttendance.findAll({
            where: { teacherId, date: { [Op.between]: [start, end] } },
            order: [['date', 'ASC']],
        });

        const summary = {
            present: records.filter(r => r.status === 'present').length,
            absent: records.filter(r => r.status === 'absent').length,
            halfDay: records.filter(r => r.status === 'half_day').length,
            onLeave: records.filter(r => r.status === 'on_leave').length,
            late: records.filter(r => r.status === 'late').length,
            totalHours: records.reduce((s, r) => s + parseFloat(r.hoursWorked || 0), 0).toFixed(2),
        };

        return success(res, { records, summary, month, year });
    } catch (err) { next(err); }
};

// ─── POST /api/attendance/teacher — manual entry ─────────────────────────────
const markAttendance = async (req, res, next) => {
    try {
        const {
            teacherId, date, checkIn, checkOut,
            status = 'present', leaveType = 'none', remarks = '', hoursWorked,
        } = req.body;

        if (!teacherId || !date) return error(res, 'teacherId and date are required', 422);

        // Auto-compute hours if checkIn + checkOut provided
        let hours = hoursWorked;
        if (!hours && checkIn && checkOut) {
            const [ih, im] = checkIn.split(':').map(Number);
            const [oh, om] = checkOut.split(':').map(Number);
            hours = ((oh * 60 + om) - (ih * 60 + im)) / 60;
            if (hours < 0) hours = 0;
        }

        const [record, created] = await TeacherAttendance.upsert({
            teacherId, date, checkIn, checkOut,
            hoursWorked: hours ? parseFloat(hours).toFixed(2) : null,
            status, leaveType, source: 'manual', remarks,
        }, { returning: true });

        return success(res, { record }, created ? 'Attendance marked' : 'Attendance updated', 201);
    } catch (err) { next(err); }
};

// ─── POST /api/attendance/biometric — biometric device hook (future) ─────────
/**
 * Endpoint for biometric device to push entry/exit times.
 * Device sends: { deviceId, employeeCode, timestamp, type: 'in'|'out' }
 */
const biometricEntry = async (req, res, next) => {
    try {
        const { employeeCode, timestamp, type } = req.body;

        const teacher = await Teacher.findOne({
            where: { employeeNumber: employeeCode },
            attributes: ['id', 'dailyWorkingHours'],
        });
        if (!teacher) return error(res, `No teacher found with employee code: ${employeeCode}`, 404);

        const dt = new Date(timestamp);
        const date = dt.toISOString().split('T')[0];
        const time = dt.toTimeString().split(' ')[0]; // HH:MM:SS

        const existing = await TeacherAttendance.findOne({ where: { teacherId: teacher.id, date } });

        if (type === 'in') {
            const [record] = await TeacherAttendance.upsert({
                teacherId: teacher.id,
                date,
                checkIn: existing?.checkIn ?? time,
                status: 'present',
                source: 'biometric',
                leaveType: 'none',
            }, { returning: true });
            return success(res, { record }, 'Check-in recorded');
        }

        if (type === 'out') {
            if (!existing) return error(res, 'No check-in found for this date', 422);

            let hoursWorked = null;
            if (existing.checkIn) {
                const [ih, im] = existing.checkIn.split(':').map(Number);
                const [oh, om] = time.split(':').map(Number);
                const h = ((oh * 60 + om) - (ih * 60 + im)) / 60;
                hoursWorked = Math.max(0, h).toFixed(2);
            }

            await existing.update({ checkOut: time, hoursWorked, source: 'biometric' });
            return success(res, { record: existing }, 'Check-out recorded');
        }

        return error(res, 'type must be "in" or "out"', 422);
    } catch (err) { next(err); }
};

// ─── GET /api/attendance/teacher/:teacherId/today ─────────────────────────────
const getTodayAttendance = async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const record = await TeacherAttendance.findOne({
            where: { teacherId: req.params.teacherId, date: today },
        });
        return success(res, { record, date: today });
    } catch (err) { next(err); }
};

module.exports = { getTeacherAttendance, markAttendance, biometricEntry, getTodayAttendance };
