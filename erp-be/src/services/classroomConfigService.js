'use strict';
import db from '../models/index.js';
const { BuildingBlock, ClassroomRoom, Classroom, Department, TestExamConfig, CalendarEvent } = db;
import { Op } from 'sequelize';

export class ClassroomConfigService {
    /**
     * List all building blocks with room counts
     */
    static async listBlocks() {
        return await BuildingBlock.findAll({
            include: [{
                model: ClassroomRoom,
                as: 'rooms',
                attributes: ['id', 'roomNumber', 'capacity', 'roomType', 'floor', 'status']
            }],
            order: [['name', 'ASC']]
        });
    }

    /**
     * Create building block
     */
    static async createBlock(data) {
        return await BuildingBlock.create(data);
    }

    /**
     * Update building block
     */
    static async updateBlock(id, data) {
        const block = await BuildingBlock.findByPk(id);
        if (!block) throw new Error('Building Block not found');
        return await block.update(data);
    }

    /**
     * Delete building block
     */
    static async deleteBlock(id) {
        const block = await BuildingBlock.findByPk(id);
        if (!block) throw new Error('Building Block not found');
        return await block.destroy();
    }

    /**
     * List rooms (optionally filtered by blockId)
     */
    static async listRooms(blockId = null) {
        const where = {};
        if (blockId) where.blockId = blockId;
        return await ClassroomRoom.findAll({
            where,
            include: [{
                model: BuildingBlock,
                as: 'block',
                attributes: ['id', 'name', 'code']
            }],
            order: [['roomNumber', 'ASC']]
        });
    }

    /**
     * Create room within a block
     */
    static async createRoom(data) {
        return await ClassroomRoom.create(data);
    }

    /**
     * Update room
     */
    static async updateRoom(id, data) {
        const room = await ClassroomRoom.findByPk(id);
        if (!room) throw new Error('Room not found');
        return await room.update(data);
    }

    /**
     * Delete room
     */
    static async deleteRoom(id) {
        const room = await ClassroomRoom.findByPk(id);
        if (!room) throw new Error('Room not found');
        return await room.destroy();
    }

    /**
     * Get or list Test & Exam configurations per department
     */
    static async getTestExamRules(departmentId = null, academicYear = '2026-2027') {
        const where = {};
        if (departmentId) where.departmentId = departmentId;
        if (academicYear) where.academicYear = academicYear;

        return await TestExamConfig.findAll({
            where,
            include: [{
                model: Department,
                as: 'department',
                attributes: ['id', 'name']
            }],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Save or update Test & Exam configuration for a department
     */
    static async upsertTestExamRule(data) {
        const { departmentId, academicYear = '2026-2027' } = data;
        let rule = await TestExamConfig.findOne({
            where: { departmentId, academicYear }
        });

        if (rule) {
            return await rule.update(data);
        } else {
            return await TestExamConfig.create(data);
        }
    }

    /**
     * Create classroom with full configuration:
     * - Department link
     * - Room & Block allocation
     * - Classroom record creation
     * - Class-targeted CalendarEvent generation (TEST & EXAM events)
     */
    static async createConfiguredClassroom(payload, creatorUserId) {
        const t = await db.sequelize.transaction();
        try {
            const {
                name,
                section,
                academicYear,
                departmentId,
                department, // string fallback e.g. "PRIMARY"
                blockId,
                buildingBlock, // string fallback
                roomId,
                roomNumber, // string fallback
                maxCapacity = 40,
                classTeacherId,
                status = 'ACTIVE',
                testSchedules = [],
                examSchedules = [],
            } = payload;

            // 1. Check uniqueness of classroom
            const existingClassroom = await Classroom.findOne({
                where: { name, section, academicYear },
                transaction: t
            });
            if (existingClassroom) {
                throw new Error(`Classroom ${name} - ${section} already exists for academic year ${academicYear}`);
            }

            // 2. Validate Room & Block if selected
            let assignedRoomNumber = roomNumber;
            let assignedBlockName = buildingBlock;

            if (roomId) {
                const room = await ClassroomRoom.findByPk(roomId, {
                    include: [{ model: BuildingBlock, as: 'block' }],
                    transaction: t
                });
                if (room) {
                    assignedRoomNumber = room.roomNumber;
                    if (room.block) assignedBlockName = room.block.name;
                    if (room.capacity < maxCapacity) {
                        throw new Error(`Selected Room ${room.roomNumber} has capacity of ${room.capacity}, which is less than requested classroom capacity of ${maxCapacity}`);
                    }
                }
            } else if (blockId) {
                const block = await BuildingBlock.findByPk(blockId, { transaction: t });
                if (block) assignedBlockName = block.name;
            }

            // 3. Create Classroom
            const classroom = await Classroom.create({
                name,
                section,
                academicYear,
                departmentId: departmentId || null,
                department: department || null,
                blockId: blockId || null,
                buildingBlock: assignedBlockName || null,
                roomId: roomId || null,
                roomNumber: assignedRoomNumber || null,
                maxCapacity,
                classTeacherId: classTeacherId || null,
                status,
            }, { transaction: t });

            // 4. Auto-generate class-targeted Calendar Events for tests & exams
            const calendarEventsToInsert = [];

            if (Array.isArray(testSchedules)) {
                for (const test of testSchedules) {
                    if (test.startDate) {
                        calendarEventsToInsert.push({
                            title: `${name} - ${section}: ${test.title || 'Scheduled Test'}`,
                            description: `Evaluation test for ${name} ${section}. Academic Year: ${academicYear}`,
                            type: 'TEST',
                            start_date: new Date(test.startDate),
                            end_date: new Date(test.endDate || test.startDate),
                            day_type: 'SPECIAL',
                            status: 'PUBLISHED',
                            target_audience: 'CLASS',
                            target_class_id: classroom.id,
                            created_by: creatorUserId,
                            is_auto_generated: true,
                            location: assignedRoomNumber ? `Room ${assignedRoomNumber}` : null
                        });
                    }
                }
            }

            if (Array.isArray(examSchedules)) {
                for (const exam of examSchedules) {
                    if (exam.startDate) {
                        calendarEventsToInsert.push({
                            title: `${name} - ${section}: ${exam.title || 'Exam'}`,
                            description: `Term examination for ${name} ${section}. Academic Year: ${academicYear}`,
                            type: 'EXAM',
                            start_date: new Date(exam.startDate),
                            end_date: new Date(exam.endDate || exam.startDate),
                            day_type: 'SPECIAL',
                            status: 'PUBLISHED',
                            target_audience: 'CLASS',
                            target_class_id: classroom.id,
                            created_by: creatorUserId,
                            is_auto_generated: true,
                            location: assignedRoomNumber ? `Room ${assignedRoomNumber}` : null
                        });
                    }
                }
            }

            if (calendarEventsToInsert.length > 0) {
                await CalendarEvent.bulkCreate(calendarEventsToInsert, { transaction: t });
            }

            await t.commit();

            return {
                classroom,
                eventsCreatedCount: calendarEventsToInsert.length,
            };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }
}
