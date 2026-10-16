import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import db from '../models/index.js';

const { SchoolConfig } = db;

/**
 * Creates a transporter dynamically.
 * In the future, this can be extended to fetch credentials from the database (e.g., for multi-tenant setups or user-defined SMTP).
 */
const createTransporter = async () => {
    // TODO: In the future, fetch these from DB based on user/tenant settings
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!user || !pass) {
        throw new Error('SMTP credentials are not configured in environment variables.');
    }

    return nodemailer.createTransport({
        service: 'gmail', // Standard configuration for Gmail
        auth: {
            user: user,
            pass: pass,
        },
    });
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
        address: [config?.addressLine1, config?.city, config?.state].filter(Boolean).join(', ') || ''
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
        const transporter = await createTransporter();
        const from = process.env.SMTP_FROM || `"ERP System" <${process.env.SMTP_USER}>`;

        const info = await transporter.sendMail({
            from,
            to,
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

// =============================================================================
// Specific Email Templates
// =============================================================================

const getHeaderHtml = (schoolName, logoUrl) => `
    <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
        ${logoUrl ? `<img src="${logoUrl}" alt="School Logo" style="max-height: 60px; margin-bottom: 12px;" />` : ''}
        <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 600;">${schoolName}</h1>
    </div>
`;

const getFooterHtml = (schoolName, phone, email, address) => `
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; line-height: 1.5;">
        <p style="margin: 0 0 8px 0; font-weight: 600;">${schoolName}</p>
        ${address ? `<p style="margin: 0 0 4px 0;">${address}</p>` : ''}
        ${phone || email ? `<p style="margin: 0;">${phone ? `Phone: ${phone}` : ''} ${phone && email ? '|' : ''} ${email ? `Email: ${email}` : ''}</p>` : ''}
        <p style="margin: 16px 0 0 0; font-size: 11px;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
`;


export const sendAdmissionSubmissionEmail = async (parentEmail, studentName) => {
    const ctx = await getSchoolContext();
    const subject = `Admission Application Received - ${studentName}`;
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            ${getHeaderHtml(ctx.schoolName, ctx.logoUrl)}
            <div style="padding: 32px; background-color: #ffffff; color: #374151; line-height: 1.6;">
                <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Application Successfully Received</h2>
                <p style="font-size: 16px;">Dear Parent / Guardian,</p>
                <p style="font-size: 16px;">Thank you for choosing our institution. We have successfully received the admission application for <strong>${studentName}</strong>.</p>
                <p style="font-size: 16px;">Our admissions team will carefully review the application and all provided details. We will notify you of any updates or if further information is required.</p>
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 15px; margin: 0;">Warm Regards,</p>
                    <p style="font-size: 16px; font-weight: 600; color: #4f46e5; margin: 4px 0 0 0;">Admissions Office</p>
                </div>
            </div>
            ${getFooterHtml(ctx.schoolName, ctx.primaryPhone, ctx.email, ctx.address)}
        </div>
    `;
    return sendEmail(parentEmail, subject, html);
};

export const sendAdmissionApprovalEmail = async (parentEmail, studentName, studentId, temporaryPassword) => {
    const ctx = await getSchoolContext();
    const subject = `Admission Approved - Welcome ${studentName}!`;
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            ${getHeaderHtml(ctx.schoolName, ctx.logoUrl).replace('#4f46e5', '#10b981')}
            <div style="padding: 32px; background-color: #ffffff; color: #374151; line-height: 1.6;">
                <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Congratulations!</h2>
                <p style="font-size: 16px;">Dear Parent / Guardian,</p>
                <p style="font-size: 16px;">We are delighted to inform you that the admission application for <strong>${studentName}</strong> has been officially approved.</p>
                
                <div style="background-color: #f3f4f6; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <h3 style="margin-top: 0; color: #111827; font-size: 16px;">Your ERP Portal Credentials</h3>
                    <p style="margin: 0 0 8px 0; font-size: 15px;">You can now log in to the School ERP portal to manage academics, fees, and more.</p>
                    <table style="width: 100%; font-size: 15px;">
                        <tr>
                            <td style="padding: 4px 0; width: 100px;"><strong>Login ID:</strong></td>
                            <td style="padding: 4px 0; color: #111827;">${studentId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0;"><strong>Password:</strong></td>
                            <td style="padding: 4px 0; color: #111827; font-family: monospace; font-size: 16px;">${temporaryPassword}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="font-size: 14px; color: #dc2626; font-weight: 500;">⚠️ For security reasons, please ensure you change this password upon your first login.</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Login to ERP Portal</a>
                </div>

                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 15px; margin: 0;">Warm Regards,</p>
                    <p style="font-size: 16px; font-weight: 600; color: #10b981; margin: 4px 0 0 0;">School Administration</p>
                </div>
            </div>
            ${getFooterHtml(ctx.schoolName, ctx.primaryPhone, ctx.email, ctx.address)}
        </div>
    `;
    return sendEmail(parentEmail, subject, html);
};

export const sendAdmissionRejectionEmail = async (parentEmail, studentName, reason) => {
    const ctx = await getSchoolContext();
    const subject = `Admission Update - ${studentName}`;
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #f3f4f6; padding: 24px; text-align: center; border-bottom: 3px solid #ef4444;">
                ${ctx.logoUrl ? `<img src="${ctx.logoUrl}" alt="School Logo" style="max-height: 60px; margin-bottom: 12px;" />` : ''}
                <h1 style="margin: 0; font-size: 24px; color: #1f2937; font-weight: 600;">${ctx.schoolName}</h1>
            </div>
            <div style="padding: 32px; background-color: #ffffff; color: #374151; line-height: 1.6;">
                <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Application Update</h2>
                <p style="font-size: 16px;">Dear Parent / Guardian,</p>
                <p style="font-size: 16px;">Thank you for your interest in our institution and for applying for the admission of <strong>${studentName}</strong>.</p>
                <p style="font-size: 16px;">After careful consideration and review of the application, we regret to inform you that we are unable to proceed with the admission at this time.</p>
                
                ${reason ? `
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <h3 style="margin-top: 0; color: #991b1b; font-size: 15px;">Reason for Decision</h3>
                    <p style="margin: 0; color: #b91c1c; font-size: 15px;">${reason}</p>
                </div>
                ` : ''}
                
                <p style="font-size: 16px;">We wish ${studentName} the very best in all future academic endeavors.</p>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 15px; margin: 0;">Sincerely,</p>
                    <p style="font-size: 16px; font-weight: 600; color: #4f46e5; margin: 4px 0 0 0;">Admissions Office</p>
                </div>
            </div>
            ${getFooterHtml(ctx.schoolName, ctx.primaryPhone, ctx.email, ctx.address)}
        </div>
    `;
    return sendEmail(parentEmail, subject, html);
};

// =============================================================================
// Reusable function for future (e.g., Reset Password)
// =============================================================================
export const sendPasswordResetEmail = async (email, resetLink) => {
    const ctx = await getSchoolContext();
    const subject = `Password Reset Request`;
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            ${getHeaderHtml(ctx.schoolName, ctx.logoUrl)}
            <div style="padding: 32px; background-color: #ffffff; color: #374151; line-height: 1.6;">
                <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Password Reset Request</h2>
                <p style="font-size: 16px;">Hello,</p>
                <p style="font-size: 16px;">We received a request to reset the password associated with your account on the School ERP portal.</p>
                <p style="font-size: 16px;">Please click the secure link below to choose a new password:</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset My Password</a>
                </div>
                
                <p style="font-size: 15px; color: #6b7280;">If the button above does not work, copy and paste the following URL into your browser:</p>
                <p style="font-size: 13px; color: #4f46e5; word-break: break-all; margin-top: 4px;">${resetLink}</p>
                
                <p style="font-size: 15px; margin-top: 24px;">If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 15px; margin: 0;">Warm Regards,</p>
                    <p style="font-size: 16px; font-weight: 600; color: #4f46e5; margin: 4px 0 0 0;">School Administration</p>
                </div>
            </div>
            ${getFooterHtml(ctx.schoolName, ctx.primaryPhone, ctx.email, ctx.address)}
        </div>
    `;
    return sendEmail(email, subject, html);
};
