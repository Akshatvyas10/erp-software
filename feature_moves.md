# Feature Moves: ERP System Roles & Capabilities

This document outlines the planned feature moves and access controls for different roles within the ERP system.

## 1. Admin

### Attendance
- **Global Overview:** View school-wide attendance dashboards, analytics, and period-wise reports.
- **Rule Configuration:** Set up academic calendars, mark holidays, and define attendance rules (e.g., late thresholds, minimum attendance %).
- **Leave Management:** Approve or reject leave requests escalated to the administration.
- **Staff Tracking:** Monitor and manage teacher and staff attendance for payroll and compliance.
- **Overrides:** Override any student or teacher attendance record if required.

---

## 2. Teacher

### Attendance
- **Daily Marking:** Mark daily or period-wise attendance for their assigned classrooms.
- **Record Updates:** Edit and correct attendance mistakes for past dates (within an allowed time window).
- **Classroom Reports:** View attendance history, trends, and percentages for students in their classes.
- **Leave Visibility:** See approved leaves for their students so they aren't marked absent manually.

---

## 3. Student / Parent

### Attendance
- **Self-Service Tracking:** View own daily attendance records, term summaries, and overall percentages.
- **Leave Requests:** Submit leave requests (e.g., sick leave, doctor appointments) with optional document uploads (like medical certificates).
- **Notifications:** Receive automated SMS/Email alerts for unexpected absences or lateness.







exam related

1. Automated Calculations & Grading 🧮
Instead of just showing raw marks, the gradebook should do the heavy lifting:

Total & Percentage Columns: Automatically sum up the marks across all subjects for each student and display their overall percentage.
Auto-Letter Grading: Automatically assign a grade (A+, A, B, C, F) based on the percentage (e.g., >90% = A+).
Pass/Fail Highlighting: Visually highlight failing grades in light red (bg-destructive/10 text-destructive) so teachers can instantly spot struggling students.
2. Result Publishing & Status 📢
Right now, saving marks is instant. We should add a Draft vs. Published state:

Draft Mode: Teachers can enter and tweak marks over several days. Students/Parents cannot see them yet.
"Publish Results" Button: Once the Class Teacher or Admin verifies all marks, they click "Publish". This locks the gradebook and instantly notifies parents/students on their dashboard that results are out.
3. Print & Export (Excel/PDF) 🖨️
Schools heavily rely on physical records and spreadsheets:

Export to Excel/CSV: A button for teachers to download the blank template, or download the filled gradebook for their records.
Generate Report Cards (PDF): A button next to each student's name to instantly generate and download a beautifully formatted, printable PDF Report Card with the school logo, grades, and teacher signatures.
4. Teacher Remarks & Feedback 💬
Numbers don't tell the whole story.

Add a "Remarks" column or a slide-out drawer where the Class Teacher can write a custom comment for the student (e.g., "Excellent improvement in mathematics", "Needs to participate more in class"). This remark will appear on the final report card.
5. Mini-Analytics Dashboard 📊
Add a small analytics summary at the top of the gradebook once marks are saved:

Class Average: Show the average score for each subject.
Top Performers: Briefly highlight the top 3 students in the class.
Pass Percentage: A quick progress bar showing what percentage of the class passed the exams.
6. Bulk Upload (Excel Import) ⬆️
Typing marks one-by-one can be tedious for a class of 50 students. We can add an "Import Marks" button where a teacher can upload an Excel sheet, and the gradebook will automatically populate the UI with the data.

Which of these features is the highest priority for you right now? I highly recommend starting with the Automated Calculations or Report Card Generation, as schools consider those essential!

