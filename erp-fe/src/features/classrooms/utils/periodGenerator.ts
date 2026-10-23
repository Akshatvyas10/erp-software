export interface PeriodConfig {
    startTime: string; // "08:00"
    numberOfLectures: number; // 8
    lectureDuration: number; // 45 (minutes)
    lunchAfterLecture: number; // 4
    lunchDuration: number; // 30 (minutes)
    hasShortBreak?: boolean;
    shortBreakAfterLecture?: number; // e.g. 2
    shortBreakDuration?: number; // 15 (minutes)
}

export interface GeneratedPeriod {
    order: number;
    name: string;
    startTime: string; // "08:00"
    endTime: string; // "08:45"
    type: "LECTURE" | "LUNCH" | "BREAK";
    durationMinutes: number;
}

/**
 * Format total minutes from midnight into "HH:mm"
 */
export function minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Parse "HH:mm" to total minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

/**
 * Pure generator function to calculate sequential period schedule
 */
export function calculatePeriods(config: PeriodConfig): GeneratedPeriod[] {
    const {
        startTime,
        numberOfLectures,
        lectureDuration,
        lunchAfterLecture,
        lunchDuration,
        hasShortBreak,
        shortBreakAfterLecture,
        shortBreakDuration,
    } = config;

    if (!startTime || numberOfLectures <= 0 || lectureDuration <= 0) {
        return [];
    }

    const periods: GeneratedPeriod[] = [];
    let currentMinutes = timeToMinutes(startTime);
    let orderCounter = 1;

    for (let i = 1; i <= numberOfLectures; i++) {
        // 1. Current Lecture
        const lectureStart = currentMinutes;
        const lectureEnd = lectureStart + lectureDuration;

        periods.push({
            order: orderCounter++,
            name: `Lecture ${i}`,
            startTime: minutesToTime(lectureStart),
            endTime: minutesToTime(lectureEnd),
            type: "LECTURE",
            durationMinutes: lectureDuration,
        });

        currentMinutes = lectureEnd;

        // 2. Check for optional Short Break
        if (
            hasShortBreak &&
            shortBreakDuration &&
            shortBreakDuration > 0 &&
            shortBreakAfterLecture === i &&
            i < numberOfLectures
        ) {
            const breakStart = currentMinutes;
            const breakEnd = breakStart + shortBreakDuration;

            periods.push({
                order: orderCounter++,
                name: "Short Break",
                startTime: minutesToTime(breakStart),
                endTime: minutesToTime(breakEnd),
                type: "BREAK",
                durationMinutes: shortBreakDuration,
            });

            currentMinutes = breakEnd;
        }

        // 3. Check for Lunch Break
        if (
            lunchDuration > 0 &&
            lunchAfterLecture === i &&
            i < numberOfLectures
        ) {
            const lunchStart = currentMinutes;
            const lunchEnd = lunchStart + lunchDuration;

            periods.push({
                order: orderCounter++,
                name: "Lunch",
                startTime: minutesToTime(lunchStart),
                endTime: minutesToTime(lunchEnd),
                type: "LUNCH",
                durationMinutes: lunchDuration,
            });

            currentMinutes = lunchEnd;
        }
    }

    return periods;
}
