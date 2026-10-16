import nodemailer from 'nodemailer';
import db from '../models/index.js';
import { success, error } from '../utils/apiResponse.js';
import { 
    updateSchoolConfigSchema, 
    updateSmtpConfigSchema, 
    testEmailSchema, 
    updateThemeSchema 
} from '../validators/schoolConfig.validator.js';
import { encrypt, decrypt } from '../services/encryption.service.js';

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

// =============================================================================
// PUT /api/school-config/smtp
// Save and update SMTP Configuration with AES-256 encryption
// =============================================================================
export const updateSmtpConfig = async (req, res, next) => {
    try {
        const validated = updateSmtpConfigSchema.parse(req.body);
        let config = await SchoolConfig.findOne();

        if (!config) {
            config = await SchoolConfig.create({
                schoolName: 'School ERP',
            });
        }

        const existingSmtp = config.smtpSettings || {};
        
        // If password is provided, encrypt it; otherwise retain existing encrypted password
        let encryptedPassword = existingSmtp.password;
        if (validated.password && validated.password.trim() !== '') {
            encryptedPassword = encrypt(validated.password);
        }

        const updatedSmtp = {
            host: validated.host,
            port: Number(validated.port),
            encryption: validated.encryption,
            username: validated.username,
            password: encryptedPassword,
            fromName: validated.fromName,
            fromEmail: validated.fromEmail,
            replyTo: validated.replyTo || '',
            isConfigured: true,
            lastTestedAt: existingSmtp.lastTestedAt || null,
            connectionStatus: existingSmtp.connectionStatus || 'UNTESTED',
        };

        config = await config.update({ smtpSettings: updatedSmtp });

        // Mask password in response
        const safeResponse = {
            ...updatedSmtp,
            password: '••••••••••••',
        };

        return success(res, safeResponse, 'Email server settings saved successfully');
    } catch (err) {
        next(err);
    }
};

// =============================================================================
// POST /api/school-config/test-email
// Verify SMTP connection and send a styled test email
// =============================================================================
export const testEmailConnection = async (req, res, next) => {
    try {
        const { recipientEmail } = testEmailSchema.parse(req.body);
        const config = await SchoolConfig.findOne();

        if (!config?.smtpSettings?.isConfigured) {
            return error(res, 'SMTP Server is not configured yet. Please configure and save settings first.', 400);
        }

        const smtp = config.smtpSettings;
        const decryptedPassword = decrypt(smtp.password);

        if (!decryptedPassword) {
            return error(res, 'Unable to decrypt SMTP password. Please re-enter your password and save.', 400);
        }

        const isSecure = smtp.encryption === 'SSL' || Number(smtp.port) === 465;
        const transporter = nodemailer.createTransport({
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
        });

        // Verify transporter credentials
        await transporter.verify();

        // Send confirmation test email
        const mailOptions = {
            from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
            to: recipientEmail,
            replyTo: smtp.replyTo || smtp.fromEmail,
            subject: `[Verified] SMTP Email Server Test - ${config.schoolName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                    <h2 style="color: #6d28d9; margin-top: 0;">✓ Email Server Verified Successfully</h2>
                    <p style="color: #334155; line-height: 1.6;">
                        This is an automated test message sent from <strong>${config.schoolName}</strong> ERP system to confirm your custom SMTP setup is operational.
                    </p>
                    <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>SMTP Host:</strong> ${smtp.host}:${smtp.port}</p>
                        <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Encryption:</strong> ${smtp.encryption}</p>
                        <p style="margin: 4px 0; font-size: 13px; color: #475569;"><strong>Sender:</strong> ${smtp.fromName} (${smtp.fromEmail})</p>
                    </div>
                    <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">Timestamp: ${new Date().toUTCString()}</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);

        // Record verification timestamp
        const updatedSmtp = {
            ...config.smtpSettings,
            lastTestedAt: new Date(),
            connectionStatus: 'SUCCESS',
        };
        await config.update({ smtpSettings: updatedSmtp });

        return success(res, {
            connectionStatus: 'SUCCESS',
            lastTestedAt: updatedSmtp.lastTestedAt,
        }, `Test email dispatched to ${recipientEmail}. SMTP server verified!`);
    } catch (err) {
        // Record failed status
        try {
            const config = await SchoolConfig.findOne();
            if (config?.smtpSettings) {
                await config.update({
                    smtpSettings: {
                        ...config.smtpSettings,
                        lastTestedAt: new Date(),
                        connectionStatus: 'FAILED',
                    }
                });
            }
        } catch (_) {}

        return error(res, `SMTP Connection Failed: ${err.message}`, 400);
    }
};

// =============================================================================
// PUT /api/school-config/theme
// Update Royal Active Theme in DB
// =============================================================================
export const updateTheme = async (req, res, next) => {
    try {
        const { activeTheme } = updateThemeSchema.parse(req.body);
        let config = await SchoolConfig.findOne();

        if (!config) {
            config = await SchoolConfig.create({
                schoolName: 'School ERP',
                activeTheme,
            });
        } else {
            config = await config.update({ activeTheme });
        }

        return success(res, { activeTheme: config.activeTheme }, 'Theme configuration updated successfully');
    } catch (err) {
        next(err);
    }
};

