const http = require('http');

const data = JSON.stringify({ email: 'admin@sgp.com', password: 'SGP_Admin_#2026_Prod_Secure_!' });

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

        // Fetch /api/solicitudes?sort=id,desc&size=5
        const getOptions = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/solicitudes?sort=id,desc&size=5',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${result.token}`
            }
        };
        const getReq = http.request(getOptions, getRes => {
            let getBody = '';
            getRes.on('data', d => getBody += d);
            getRes.on('end', () => {
                console.log('--- RECENT SOLICITUDES ---');
                const list = JSON.parse(getBody).content;
                list.forEach(s => {
                    console.log(`Solicitud #${s.id} - ${s.type} - Status: ${s.status}`);
                    console.log('Resolutor assignments:', JSON.stringify(s.resolutorAssignments.map(a => ({
                        id: a.id,
                        resolutor: a.resolutor.email,
                        tipoResolucion: a.tipoResolucion,
                        approved: a.approved
                    })), null, 2));
                    console.log('Legacy resolutor:', s.resolutor ? s.resolutor.email : 'null');
                    console.log('Suggested resolution type:', s.suggestedResolutionType);
                    console.log('------------------------------------');
                });
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
