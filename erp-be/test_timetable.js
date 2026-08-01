const http = require('http');

async function test() {
    const login = () => new Promise((resolve, reject) => {
        const req = http.request('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.write(JSON.stringify({ email: 'admin@school.com', password: 'password123' }));
        req.end();
    });

    const getClasses = (token) => new Promise((resolve) => {
        const req = http.request('http://localhost:5000/api/classrooms?limit=1', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.end();
    });

    const getClass = (token, id) => new Promise((resolve) => {
        const req = http.request(`http://localhost:5000/api/classrooms/${id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.end();
    });

    const postSlot = (token, cId, sId) => new Promise((resolve) => {
        const req = http.request(`http://localhost:5000/api/classrooms/${cId}/subjects/${sId}/timetable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.write(JSON.stringify({ dayOfWeek: 'Monday', startTime: '08:00', endTime: '09:00' }));
        req.end();
    });

    try {
        const auth = await login();
        const token = auth.data.token;
        const classes = await getClasses(token);
        const classroomId = classes.data.classrooms[0].id;
        const classDetails = await getClass(token, classroomId);
        const subjectId = classDetails.data.classroom.subjects[0]?.id;
        
        if (!subjectId) {
            console.log("No subject found for this classroom");
            return;
        }

        const res = await postSlot(token, classroomId, subjectId);
        console.log("Response:", JSON.stringify(res, null, 2));
    } catch(e) {
        console.error(e);
    }
}

test();
