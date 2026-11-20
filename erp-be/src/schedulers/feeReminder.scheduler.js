'use strict';

import cron from 'node-cron';
import feeService from '../services/fee.service.js';
import logger from '../utils/logger.js';

let reminderCronJob = null;

/**
 * Initializes the automated daily fee reminder cron job.
 * Runs every day at 08:00 AM server time (default: '0 8 * * *') or custom CRON expression from env.
 */
export const initFeeReminderScheduler = () => {
    const cronSchedule = process.env.FEE_REMINDER_CRON || '0 8 * * *';

    if (reminderCronJob) {
        logger.warn('[Fee Scheduler] Scheduler already initialized. Skipping redundant setup.');
        return reminderCronJob;
    }

    logger.info(`[Fee Scheduler] Initializing Daily Fee Reminder Scheduler (Cron: "${cronSchedule}")`);

    try {
        reminderCronJob = cron.schedule(
            cronSchedule,
            async () => {
                const startTime = Date.now();
                logger.info('[Fee Scheduler] ⏰ Triggering scheduled daily fee reminders run...');
                try {
                    const result = await feeService.runScheduledFeeReminders();
                    const durationMs = Date.now() - startTime;
                    if (result.executed) {
                        logger.info(
                            `[Fee Scheduler] ✅ Daily reminders executed in ${durationMs}ms. Sent: ${result.sentCount || 0}, Skipped: ${result.skippedCount || 0}, Target Candidates: ${result.targetCount || 0}`
                        );
                    } else {
                        logger.info(`[Fee Scheduler] ℹ️ Daily reminders skipped: ${result.reason || 'Disabled in settings'}`);
                    }
                } catch (err) {
                    logger.error(`[Fee Scheduler] ❌ Error during daily scheduled fee reminders: ${err.message}`, {
                        stack: err.stack,
                    });
                }
            },
            {
                scheduled: true,
                timezone: process.env.TZ || 'Asia/Kolkata',
            }
        );

        logger.info('[Fee Scheduler] Daily Fee Reminder Scheduler successfully started.');
        return reminderCronJob;
    } catch (scheduleErr) {
        logger.error(`[Fee Scheduler] Failed to schedule fee reminder cron: ${scheduleErr.message}`);
        return null;
    }
};

/**
 * Stops the scheduled cron worker during server graceful shutdown.
 */
export const stopFeeReminderScheduler = () => {
    if (reminderCronJob) {
        logger.info('[Fee Scheduler] Stopping Daily Fee Reminder Scheduler...');
        reminderCronJob.stop();
        reminderCronJob = null;
    }
};

export default {
    initFeeReminderScheduler,
    stopFeeReminderScheduler,
};

