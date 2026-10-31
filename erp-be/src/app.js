import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { apiLimiter } from './middlewares/rateLimiter.js';
import errorHandler from './middlewares/errorHandler.js';
import logger from './utils/logger.js';
import xssSanitizer from './middlewares/xssSanitizer.js';
import { getSessionStorageMode } from './services/session.service.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import roleRoutes from './routes/role.routes.js';
import permissionRoutes from './routes/permission.routes.js';
import studentRoutes from './routes/student.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import salaryRoutes from './routes/salary.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import studentAttendanceRoutes from './routes/studentAttendance.routes.js';
import departmentRoutes from './routes/department.routes.js';
import academicClassRoutes from './routes/academicClass.routes.js';
import classroomRoutes from './routes/classroom.routes.js';
import subjectRoutes from './routes/subject.routes.js';
import homeworkRoutes from './routes/homework.routes.js';
import eventRoutes from './routes/event.routes.js';
import examRoutes from './routes/exam.routes.js';
import admissionRoutes from './routes/admission.routes.js';
import schoolConfigRoutes from './routes/schoolConfig.routes.js';
import classroomConfigRoutes from './routes/classroomConfig.routes.js';
import academicYearRoutes from './routes/academicYear.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import portalRoutes from './routes/portal.routes.js';

const app = express();

// ─── Trust Proxy & Security headers ──────────────────────────────────────────
// Crucial for running behind reverse proxies (Nginx, AWS ALB, Cloudflare, Docker).
// Allows req.ip to read X-Forwarded-For instead of reverse proxy's internal IP.
// MUST be set before any rate-limiter, auth, or IP-based middlewares.
app.set('trust proxy', 1);

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            cb(new Error(`CORS: origin ${origin} not allowed`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());
app.use(compression());
app.use(xssSanitizer);

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// ─── Global rate limiter ──────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Static assets — serve uploaded student photos ───────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

import { getQueueHealth } from './queues/email.queue.js';
import db from './models/index.js';

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
    let dbStatus = 'healthy';
    try {
        await db.sequelize.authenticate();
    } catch (err) {
        dbStatus = `unhealthy: ${err.message}`;
    }

    const sessionHealth = getSessionStorageMode();
    const queueHealth = await getQueueHealth();

    const isHealthy = dbStatus === 'healthy' && (process.env.NODE_ENV !== 'production' || sessionHealth.isDistributed);

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'degraded',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        database: {
            status: dbStatus,
        },
        redis: {
            connected: sessionHealth.isDistributed,
            mode: sessionHealth.mode,
            inMemoryFallbackActive: !sessionHealth.isDistributed,
        },
        queue: queueHealth,
    });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/attendance', attendanceRoutes); // Teacher attendance
app.use('/api/student-attendance', studentAttendanceRoutes); // Student attendance
app.use('/api/departments', departmentRoutes);
app.use('/api/classes', academicClassRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/homeworks', homeworkRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/school-config/classroom', classroomConfigRoutes);
app.use('/api/school-config', schoolConfigRoutes);
import studentLeaveRoutes from './routes/studentLeave.routes.js';

app.use('/api/academic-years', academicYearRoutes);
app.use('/api/teacher-leaves', leaveRoutes);
app.use('/api/student-leaves', studentLeaveRoutes);
app.use('/api/portal', portalRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
