const http = require('http');

const data = JSON.stringify({ email: 'mvgonza79@gmail.com', password: 'Maria_SGP_2026%' });

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
        const result = JSON.parse(body);
        if (!result.token) {
            console.log('Login failed:', body);
            return;
        }

        // Fetch /api/solicitudes
        const getOptions = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/solicitudes',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${result.token}`
            }
        };
        const getReq = http.request(getOptions, getRes => {
            let getBody = '';
            getRes.on('data', d => getBody += d);
            getRes.on('end', () => {
                console.log('--- SOLICITUDES PARA RESOLUTOR ---');
                console.log(JSON.stringify(JSON.parse(getBody), null, 2));
            });
        });
        getReq.end();
    });
});

req.on('error', error => {
    console.error('Request error:', error);
});

req.write(data);
req.end();
