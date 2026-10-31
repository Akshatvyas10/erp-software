import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import db from '../models/index.js';

const { SchoolConfig } = db;

import { decrypt } from './encryption.service.js';

/**
 * Creates a transporter dynamically using custom database SMTP configuration.
 * All SMTP credentials are stored securely and encrypted in PostgreSQL.
 */
const createTransporter = async () => {
    const config = await SchoolConfig.findOne();
    const smtp = config?.smtpSettings;

    if (!smtp || !smtp.isConfigured || !smtp.host || !smtp.username) {
        throw new Error('Email server is not configured. Please configure SMTP in School Configuration.');
    }

    const decryptedPassword = decrypt(smtp.password);
    if (!decryptedPassword) {
        throw new Error('Failed to decrypt SMTP password. Please re-enter credentials in School Configuration.');
    }

    const isSecure = smtp.encryption === 'SSL' || Number(smtp.port) === 465;
    return {
        transporter: nodemailer.createTransport({
            host: smtp.host,
            port: Number(smtp.port),
            secure: isSecure,
            auth: {
                user: smtp.username,
                pass: decryptedPassword,
            },
            tls: {
                rejectUnauthorized: smtp.encryption !== 'NONE',
            },
        }),
        from: `"${smtp.fromName || config.schoolName || 'ERP System'}" <${smtp.fromEmail || smtp.username}>`,
        replyTo: smtp.replyTo || smtp.fromEmail || smtp.username,
    };
};

/**
 * Helper to fetch school context (name, logo, contact, etc) to populate templates.
 */
const getSchoolContext = async () => {
    let config = null;
    try {
        config = await SchoolConfig.findOne();
    } catch (err) {
        logger.error(`[Email Service] Failed to fetch SchoolConfig: ${err.message}`);
    }

    const backendUrl = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
    return {
        schoolName: config?.schoolName || 'Project Buddy School ERP',
        logoUrl: config?.logoUrl ? `${backendUrl}${config.logoUrl}` : '',
        primaryPhone: config?.primaryPhone || '',
        email: config?.email || '',
        address: [config?.addressLine1, config?.city, config?.state].filter(Boolean).join(', ') || '',
        currentYear: new Date().getFullYear(),
    };
};

/**
 * Centralized function to send emails.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body content
 */
export const sendEmail = async (to, subject, html) => {
    try {
        const { transporter, from, replyTo } = await createTransporter();

        const info = await transporter.sendMail({
            from,
            to,
            replyTo,
            subject,
            html,
        });

        logger.info(`[Email Service] Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error(`[Email Service] Error sending email to ${to}: ${error.message}`);
        throw error;
    }
};

import { enqueueEmailJob, initEmailQueue } from '../queues/email.queue.js';

// Initialize BullMQ processor mapping
const emailProcessors = {
    WELCOME_EMAIL: async (p) => sendWelcomeEmailDirect(p.email, p.name, p.userId, p.tempPassword),
    STUDENT_ENROLLMENT: async (p) => sendStudentEnrollmentWelcomeDirect(p),
    PARENT_ENROLLMENT: async (p) => sendParentEnrollmentWelcomeDirect(p),
    TEACHER_ENROLLMENT: async (p) => sendTeacherEnrollmentWelcomeDirect(p),
    ADMISSION_SUBMITTED: async (p) => sendAdmissionSubmissionDirect(p.parentEmail, p.studentName, p.applicationNumber),
    ADMISSION_APPROVED: async (p) => sendAdmissionApprovalDirect(p.parentEmail, p.studentName, p.studentId, p.temporaryPassword),
    ADMISSION_REJECTED: async (p) => sendAdmissionRejectionDirect(p.parentEmail, p.studentName, p.reason),
    SYSTEM_NOTIFICATION: async (p) => sendSystemNotificationDirect(p.email, p.userName, p.title, p.bodyText, p.actionUrl),
};

// Start queue worker listening for background tasks
initEmailQueue(emailProcessors);

// =============================================================================
// Reusable Layout Helpers (Cross-client Table Structure)
// =============================================================================

const getEmailWrapper = (schoolName, headerBg, contentHtml, footerInfo = {}) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${schoolName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F1F5F9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td align="center" style="background: ${headerBg}; padding: 32px 24px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                    ${schoolName}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="color: #E0E7FF; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; padding-top: 6px;">
                    School Management & Learning Portal
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 22px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              ${footerInfo.phone || footerInfo.email ? `
                <p style="margin: 0 0 6px 0; color: #64748B; font-size: 12px;">
                  ${footerInfo.phone ? `Phone: <strong>${footerInfo.phone}</strong> &bull; ` : ''}
                  ${footerInfo.email ? `Email: <a href="mailto:${footerInfo.email}" style="color: #4F46E5; text-decoration: none;">${footerInfo.email}</a>` : ''}
                </p>
              ` : ''}
              ${footerInfo.address ? `<p style="margin: 0 0 6px 0; color: #94A3B8; font-size: 11px;">${footerInfo.address}</p>` : ''}
              <p style="margin: 0; color: #94A3B8; font-size: 11px;">
                &copy; ${new Date().getFullYear()} ${schoolName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const getButtonHtml = (url, label, bgColor = '#4F46E5') => `
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
  <tr>
    <td align="center">
      <table border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="background-color: ${bgColor}; border-radius: 10px;">
            <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; border: 1px solid ${bgColor};">
              ${label}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;

// =============================================================================
// Specific Production Email Templates
// =============================================================================

/**
 * 1. Welcome Email (New User)
 */
export const sendWelcomeEmailDirect = async (userEmail, userName, userId, temporaryPassword) => {
    const ctx = await getSchoolContext();
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const subject = `Welcome to ${ctx.schoolName}!`;

    const contentHtml = `
      <h1 style="margin: 0 0 16px 0; color: #0F172A; font-size: 22px; font-weight: 700;">
        Welcome to your new portal, ${userName}!
      </h1>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Your account on the <strong>${ctx.schoolName} ERP Portal</strong> has been successfully created. You can now access your classes, records, and school services from one central dashboard.
      </p>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 18px 22px;">
            <p style="margin: 0 0 8px 0; color: #64748B; font-size: 12px; font-weight: 700; text-transform: uppercase;">Login Credentials</p>
            <p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>User ID:</strong> <span style="font-family: monospace; color: #4F46E5; font-size: 15px;">${userId}</span></p>
            ${temporaryPassword ? `<p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-size: 15px;">${temporaryPassword}</span></p>` : ''}
            <p style="margin: 0; color: #0F172A; font-size: 14px;"><strong>Registered Email:</strong> ${userEmail}</p>
          </td>
        </tr>
      </table>

      ${getButtonHtml(loginUrl, 'Sign In to Your Account', '#4F46E5')}

      <p style="margin: 0; color: #64748B; font-size: 13px; line-height: 1.6;">
        Please change your temporary password immediately upon your first login to keep your account secure.
      </p>
    `;

    const html = getEmailWrapper(ctx.schoolName, 'linear-gradient(135deg, #4F46E5 0%, #312E81 100%)', contentHtml, ctx);
    return sendEmail(userEmail, subject, html);
};

export const sendWelcomeEmail = async (userEmail, userName, userId, temporaryPassword) => {
    return enqueueEmailJob('WELCOME_EMAIL', { email: userEmail, name: userName, userId, tempPassword: temporaryPassword }, (p) =>
        sendWelcomeEmailDirect(p.email, p.name, p.userId, p.tempPassword)
    );
};

export const sendStudentEnrollmentWelcomeDirect = async ({
    studentEmail,
    studentName,
    admissionNumber,
    erpUserId,
    temporaryPassword,
}) => {
    const ctx = await getSchoolContext();
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const subject = `Welcome to ${ctx.schoolName} – Enrollment Confirmed (${admissionNumber})`;

    const contentHtml = `
      <h1 style="margin: 0 0 16px 0; color: #0F172A; font-size: 22px; font-weight: 700;">
        Welcome to ${ctx.schoolName}, ${studentName}!
      </h1>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Congratulations! Your student enrollment has been officially confirmed and registered in our School ERP. You can now access your timetable, assignments, attendance, and exam reports.
      </p>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 18px 22px;">
            <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; font-weight: 700; text-transform: uppercase;">Enrollment & Login Details</p>
            <p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Official Admission No:</strong> <span style="font-family: monospace; color: #059669; font-weight: 700; font-size: 15px;">${admissionNumber}</span></p>
            <p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>ERP User ID:</strong> <span style="font-family: monospace; color: #4F46E5; font-size: 15px;">${erpUserId}</span></p>
            ${temporaryPassword ? `<p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Account Password:</strong> <span style="font-family: monospace; font-size: 15px;">${temporaryPassword}</span></p>` : ''}
            <p style="margin: 0; color: #0F172A; font-size: 14px;"><strong>Student Email:</strong> ${studentEmail}</p>
          </td>
        </tr>
      </table>

      ${getButtonHtml(loginUrl, 'Access Student Portal', '#4F46E5')}

      <p style="margin: 0; color: #64748B; font-size: 13px; line-height: 1.6;">
        For any questions regarding your classes or login assistance, please reach out to the school administration office.
      </p>
    `;

    const html = getEmailWrapper(ctx.schoolName, 'linear-gradient(135deg, #4F46E5 0%, #312E81 100%)', contentHtml, ctx);
    return sendEmail(studentEmail, subject, html);
};

export const sendStudentEnrollmentWelcomeEmail = async (params) => {
    return enqueueEmailJob('STUDENT_ENROLLMENT', params, sendStudentEnrollmentWelcomeDirect);
};

/**
 * 1c. Parent / Guardian Enrollment Welcome Email
 */
export const sendParentEnrollmentWelcomeDirect = async ({
    guardianEmail,
    guardianName,
    studentName,
    admissionNumber,
    studentEmail,
}) => {
    const ctx = await getSchoolContext();
    const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const subject = `Student Enrollment Confirmation: ${studentName} (${admissionNumber}) - ${ctx.schoolName}`;

    const contentHtml = `
      <h1 style="margin: 0 0 16px 0; color: #0F172A; font-size: 22px; font-weight: 700;">
        Dear ${guardianName || 'Parent / Guardian'},
      </h1>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        We are delighted to confirm that <strong>${studentName}</strong> has been successfully enrolled at <strong>${ctx.schoolName}</strong>.
      </p>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 18px 22px;">
            <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; font-weight: 700; text-transform: uppercase;">Official Registration Record</p>
            <p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Student Name:</strong> ${studentName}</p>
            <p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Admission Number:</strong> <span style="font-family: monospace; color: #059669; font-weight: 700; font-size: 15px;">${admissionNumber}</span></p>
            ${studentEmail ? `<p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Student Account Email:</strong> ${studentEmail}</p>` : ''}
            <p style="margin: 0; color: #0F172A; font-size: 14px;"><strong>Registered Guardian:</strong> ${guardianName || 'Primary Guardian'} (${guardianEmail})</p>
          </td>
        </tr>
      </table>

      ${getButtonHtml(portalUrl, 'Visit School Portal', '#059669')}

      <p style="margin: 0; color: #64748B; font-size: 13px; line-height: 1.6;">
        You can monitor academic milestones, attendance records, school announcements, and fee payment receipts directly through the portal.
      </p>
    `;

    const html = getEmailWrapper(ctx.schoolName, 'linear-gradient(135deg, #059669 0%, #064E3B 100%)', contentHtml, ctx);
    return sendEmail(guardianEmail, subject, html);
};

export const sendParentEnrollmentWelcomeEmail = async (params) => {
    return enqueueEmailJob('PARENT_ENROLLMENT', params, sendParentEnrollmentWelcomeDirect);
};

/**
 * 1d. Teacher / Faculty Enrollment Welcome Email
 */
export const sendTeacherEnrollmentWelcomeDirect = async ({
    teacherEmail,
    teacherName,
    teacherId,
    employeeNumber,
    erpUserId,
    temporaryPassword,
    departmentName,
    designationName,
}) => {
    const ctx = await getSchoolContext();
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const subject = `Welcome to the Faculty of ${ctx.schoolName} - Account Credentials (${employeeNumber || teacherId})`;

    const contentHtml = `
      <h1 style="margin: 0 0 16px 0; color: #0F172A; font-size: 22px; font-weight: 700;">
        Welcome to the Faculty, ${teacherName}!
      </h1>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        We are thrilled to welcome you to <strong>${ctx.schoolName}</strong>. Your staff account has been set up with access to teacher attendance, timetable rosters, student gradebooks, and classroom management.
      </p>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 18px 22px;">
            <p style="margin: 0 0 10px 0; color: #64748B; font-size: 12px; font-weight: 700; text-transform: uppercase;">Faculty Credentials & Details</p>
            <p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Employee ID:</strong> <span style="font-family: monospace; color: #4F46E5; font-weight: 700; font-size: 15px;">${employeeNumber || teacherId}</span></p>
            <p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Teacher ID:</strong> <span style="font-family: monospace; font-size: 14px;">${teacherId}</span></p>
            <p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>ERP User ID:</strong> <span style="font-family: monospace; color: #4F46E5; font-size: 15px;">${erpUserId}</span></p>
            ${temporaryPassword ? `<p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-size: 15px;">${temporaryPassword}</span></p>` : ''}
            <p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Official Email:</strong> ${teacherEmail}</p>
            ${designationName ? `<p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Designation:</strong> ${designationName}</p>` : ''}
            ${departmentName ? `<p style="margin: 0; color: #0F172A; font-size: 14px;"><strong>Department:</strong> ${departmentName}</p>` : ''}
          </td>
        </tr>
      </table>

      ${getButtonHtml(loginUrl, 'Sign In to Faculty Portal', '#4F46E5')}

      <p style="margin: 0; color: #64748B; font-size: 13px; line-height: 1.6;">
        For account assistance or curriculum orientation, please connect with the Academic Administration Office.
      </p>
    `;

    const html = getEmailWrapper(ctx.schoolName, 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', contentHtml, ctx);
    return sendEmail(teacherEmail, subject, html);
};

export const sendTeacherEnrollmentWelcomeEmail = async (params) => {
    return enqueueEmailJob('TEACHER_ENROLLMENT', params, sendTeacherEnrollmentWelcomeDirect);
};

/**
 * 2. Login OTP / Verification Code
 */
export const sendLoginOtpEmail = async (email, userName, otp) => {
    const ctx = await getSchoolContext();
    const subject = `Your Verification Code: ${otp}`;

    const contentHtml = `
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 20px; font-weight: 700;">Login Verification Code</h2>
      <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Hello ${userName}, please use the 6-digit security code below to complete your login verification:
      </p>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
        <tr>
          <td align="center" style="background-color: #EEF2FF; border: 2px dashed #6366F1; border-radius: 12px; padding: 18px;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #4F46E5;">
              ${otp}
            </span>
          </td>
        </tr>
      </table>

      <p style="margin: 0 0 16px 0; color: #64748B; font-size: 13px; line-height: 1.6;">
        ⏱ This verification code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
      </p>
    `;

    const html = getEmailWrapper(ctx.schoolName, '#4F46E5', contentHtml, ctx);
    return sendEmail(email, subject, html);
};

/**
 * 3. Forgot Password Request
 */
export const sendPasswordResetEmail = async (email, resetLink) => {
    const ctx = await getSchoolContext();
    const subject = `Password Reset Request - ${ctx.schoolName}`;

    const contentHtml = `
      <h2 style="margin: 0 0 14px 0; color: #0F172A; font-size: 22px; font-weight: 700;">Password Reset Request</h2>
      <p style="margin: 0 0 18px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Hello, we received a request to reset the password associated with your account on the <strong>${ctx.schoolName}</strong> portal.
      </p>
      <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Click the secure button below to choose a new password:
      </p>

      ${getButtonHtml(resetLink, 'Reset Password', '#4F46E5')}

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
        <tr>
          <td style="color: #64748B; font-size: 12px; line-height: 1.5;">
            ⚠️ This link will expire in <strong>15 minutes</strong> for security reasons. If you did not request a password reset, you can safely ignore this email.
          </td>
        </tr>
      </table>
    `;

    const html = getEmailWrapper(ctx.schoolName, '#4F46E5', contentHtml, ctx);
    return sendEmail(email, subject, html);
};

/**
 * 4. Password Reset Successful
 */
export const sendPasswordResetSuccessEmail = async (email, userName) => {
    const ctx = await getSchoolContext();
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const subject = `Password Successfully Reset - ${ctx.schoolName}`;

    const contentHtml = `
      <div align="center" style="margin-bottom: 20px;">
        <span style="display: inline-block; background-color: #D1FAE5; color: #059669; font-size: 28px; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; text-align: center;">&#10003;</span>
      </div>
      <h2 align="center" style="margin: 0 0 12px 0; color: #0F172A; font-size: 22px; font-weight: 700;">Password Updated Successfully</h2>
      <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6; text-align: center;">
        Hello ${userName}, your account password has been updated. You can now use your new password to sign in to the portal.
      </p>

      ${getButtonHtml(loginUrl, 'Sign In to Portal', '#10B981')}

      <div style="background-color: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 8px; padding: 14px 18px;">
        <p style="margin: 0; color: #991B1B; font-size: 12px; line-height: 1.5;">
          <strong>Security Notice:</strong> If you did not perform this change yourself, please contact your school administrator immediately.
        </p>
      </div>
    `;

    const html = getEmailWrapper(ctx.schoolName, '#10B981', contentHtml, ctx);
    return sendEmail(email, subject, html);
};

/**
 * 5. Admission Form Submitted (to Parent)
 */
export const sendAdmissionSubmissionEmail = async (parentEmail, studentName, applicationNumber) => {
    const ctx = await getSchoolContext();
    const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const subject = `Admission Application Received - ${studentName}`;

    const contentHtml = `
      <h2 style="margin: 0 0 14px 0; color: #0F172A; font-size: 22px; font-weight: 700;">We have received your application!</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Dear Parent / Guardian, thank you for applying to <strong>${ctx.schoolName}</strong> for student <strong>${studentName}</strong>.
      </p>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 18px 22px;">
            <p style="margin: 0 0 6px 0; color: #64748B; font-size: 12px; font-weight: 700; text-transform: uppercase;">Application Details</p>
            ${applicationNumber ? `<p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Application Number:</strong> <span style="font-family: monospace; color: #4F46E5; font-weight: 700;">${applicationNumber}</span></p>` : ''}
            <p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Student Name:</strong> ${studentName}</p>
            <p style="margin: 0; color: #0F172A; font-size: 14px;"><strong>Submission Date:</strong> ${new Date().toLocaleDateString()}</p>
          </td>
        </tr>
      </table>

      ${getButtonHtml(portalUrl, 'View Admission Portal', '#4F46E5')}

      <p style="margin: 0; color: #64748B; font-size: 13px; line-height: 1.6;">
        Our admissions committee is currently reviewing your submission. You will receive an email update once a decision is made.
      </p>
    `;

    const html = getEmailWrapper(ctx.schoolName, '#4F46E5', contentHtml, ctx);
    return sendEmail(parentEmail, subject, html);
};

/**
 * 6. Admission Approved
 */
export const sendAdmissionApprovalEmail = async (parentEmail, studentName, studentId, temporaryPassword) => {
    const ctx = await getSchoolContext();
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const subject = `Admission Approved - Welcome ${studentName}!`;

    const contentHtml = `
      <h2 style="margin: 0 0 14px 0; color: #065F46; font-size: 22px; font-weight: 700;">Congratulations, ${studentName} has been accepted!</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Dear Parent / Guardian, we are delighted to inform you that the admission application for <strong>${studentName}</strong> has been officially approved at <strong>${ctx.schoolName}</strong>!
      </p>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 18px 22px;">
            <p style="margin: 0 0 8px 0; color: #166534; font-size: 12px; font-weight: 700; text-transform: uppercase;">Portal Login Credentials</p>
            <p style="margin: 0 0 6px 0; color: #0F172A; font-size: 14px;"><strong>Login ID:</strong> <span style="font-family: monospace; font-size: 15px; color: #059669; font-weight: 700;">${studentId}</span></p>
            <p style="margin: 0; color: #0F172A; font-size: 14px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-size: 15px;">${temporaryPassword}</span></p>
          </td>
        </tr>
      </table>

      ${getButtonHtml(loginUrl, 'Complete Enrollment in Portal', '#059669')}

      <p style="margin: 0; color: #64748B; font-size: 13px; line-height: 1.6;">
        Please log in to finalize document verification and complete the enrollment process.
      </p>
    `;

    const html = getEmailWrapper(ctx.schoolName, '#059669', contentHtml, ctx);
    return sendEmail(parentEmail, subject, html);
};

/**
 * 7. Admission Rejected
 */
export const sendAdmissionRejectionEmail = async (parentEmail, studentName, reason) => {
    const ctx = await getSchoolContext();
    const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const subject = `Admission Status Update - ${studentName}`;

    const contentHtml = `
      <h2 style="margin: 0 0 14px 0; color: #0F172A; font-size: 20px; font-weight: 700;">Update on Your Application</h2>
      <p style="margin: 0 0 18px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Dear Parent / Guardian, thank you for your interest in <strong>${ctx.schoolName}</strong> for student <strong>${studentName}</strong>.
      </p>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        After review of our current capacity and requirements, we regret to inform you that we are unable to offer admission at this time.
      </p>

      ${reason ? `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 4px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 14px 18px;">
              <p style="margin: 0 0 4px 0; color: #991B1B; font-size: 12px; font-weight: 700; text-transform: uppercase;">Committee Notes:</p>
              <p style="margin: 0; color: #B91C1C; font-size: 14px; line-height: 1.5;">${reason}</p>
            </td>
          </tr>
        </table>
      ` : ''}

      ${getButtonHtml(portalUrl, 'View Application Dossier', '#475569')}

      <p style="margin: 0; color: #64748B; font-size: 13px; line-height: 1.6;">
        We wish ${studentName} every success in their academic future.
      </p>
    `;

    const html = getEmailWrapper(ctx.schoolName, '#475569', contentHtml, ctx);
    return sendEmail(parentEmail, subject, html);
};

/**
 * 8. New Admission Application Received (to Admin)
 */
export const sendAdminNewAdmissionAlert = async (adminEmail, studentName, parentName, appliedClass, applicationNumber) => {
    const ctx = await getSchoolContext();
    const adminUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/admissions`;
    const subject = `New Admission Application: ${studentName}`;

    const contentHtml = `
      <h2 style="margin: 0 0 10px 0; color: #0F172A; font-size: 20px; font-weight: 700;">New Admission Application Received</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
        A new student admission application has been submitted and is waiting for administrative review.
      </p>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px 20px; font-size: 14px; color: #1E293B;">
            <p style="margin: 0 0 6px 0;"><strong>Student Name:</strong> ${studentName}</p>
            <p style="margin: 0 0 6px 0;"><strong>Parent/Guardian:</strong> ${parentName}</p>
            <p style="margin: 0 0 6px 0;"><strong>Applied Grade:</strong> ${appliedClass}</p>
            <p style="margin: 0;"><strong>Application ID:</strong> <span style="font-family: monospace; color: #4F46E5;">${applicationNumber}</span></p>
          </td>
        </tr>
      </table>

      ${getButtonHtml(adminUrl, 'Review Application in ERP', '#4F46E5')}
    `;

    const html = getEmailWrapper(ctx.schoolName, '#312E81', contentHtml, ctx);
    return sendEmail(adminEmail, subject, html);
};

/**
 * 9. Account Activated
 */
export const sendAccountActivatedEmail = async (email, userName) => {
    const ctx = await getSchoolContext();
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const subject = `Your Account is Activated - ${ctx.schoolName}`;

    const contentHtml = `
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 20px; font-weight: 700;">Your Account is Now Active</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Hello ${userName}, your account has been reviewed and activated by school administration. You now have full access to your assigned modules and services.
      </p>

      ${getButtonHtml(loginUrl, 'Go to Dashboard', '#4F46E5')}
    `;

    const html = getEmailWrapper(ctx.schoolName, '#4F46E5', contentHtml, ctx);
    return sendEmail(email, subject, html);
};

/**
 * 10. Role / Permission Updated
 */
export const sendPermissionUpdatedEmail = async (email, userName, assignedRoles) => {
    const ctx = await getSchoolContext();
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const subject = `Account Permissions Updated - ${ctx.schoolName}`;

    const contentHtml = `
      <h2 style="margin: 0 0 12px 0; color: #0F172A; font-size: 20px; font-weight: 700;">Account Permissions Updated</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Hello ${userName}, your portal access permissions and roles have been updated by an administrator.
      </p>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 16px 20px;">
            <p style="margin: 0 0 6px 0; color: #64748B; font-size: 12px; font-weight: 700; text-transform: uppercase;">Active Assigned Roles</p>
            <p style="margin: 0; color: #4F46E5; font-size: 15px; font-weight: 700;">${assignedRoles}</p>
          </td>
        </tr>
      </table>

      ${getButtonHtml(loginUrl, 'View Workspace', '#4F46E5')}
    `;

    const html = getEmailWrapper(ctx.schoolName, '#312E81', contentHtml, ctx);
    return sendEmail(email, subject, html);
};

/**
 * 11. Important System Notification
 */
export const sendSystemNotificationEmail = async (email, userName, title, bodyText, actionUrl) => {
    const ctx = await getSchoolContext();
    const targetUrl = actionUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;
    const subject = `${title} - ${ctx.schoolName}`;

    const contentHtml = `
      <h2 style="margin: 0 0 16px 0; color: #0F172A; font-size: 21px; font-weight: 700; line-height: 1.3;">
        ${title}
      </h2>
      <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Dear ${userName},
      </p>
      
      <div style="color: #334155; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
        ${bodyText}
      </div>

      ${getButtonHtml(targetUrl, 'View Notice in Portal', '#4F46E5')}
    `;

    const html = getEmailWrapper(ctx.schoolName, '#4F46E5', contentHtml, ctx);
    return sendEmail(email, subject, html);
};
