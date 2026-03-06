const http = require('http');

const data = JSON.stringify({ email: 'user1@sgp.com', password: 'User_Pass_2026!' });

const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log('Login Response:', body);
        const result = JSON.parse(body);
        if (!result.token) return;

        // Fetch /api/users/me
        const meOptions = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/users/me',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${result.token}`
            }
        };
        const meReq = http.request(meOptions, meRes => {
            let meBody = '';
            meRes.on('data', d => meBody += d);
            meRes.on('end', () => console.log('Me Response:', meBody));
        });
        meReq.end();
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
