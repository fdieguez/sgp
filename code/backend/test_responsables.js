const http = require('http');

const data = JSON.stringify({ email: 'francisco@sgp.com', password: 'SGP_StrongPass_2026!' });

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
        console.log('Login Response Status:', res.statusCode);
        const result = JSON.parse(body);
        if (!result.token) {
            console.error('No se obtuvo token de acceso', body);
            return;
        }

        // Obtener la lista de Responsables
        const relOptions = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/responsables',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${result.token}`
            }
        };

        console.log('Consultando GET /api/responsables ...');
        const relReq = http.request(relOptions, relRes => {
            let relBody = '';
            relRes.on('data', d => relBody += d);
            relRes.on('end', () => {
                console.log('\n--- Status API Responsables:', relRes.statusCode, '---\n');
                try {
                    const parsed = JSON.parse(relBody);
                    console.log(JSON.stringify(parsed, null, 2));
                } catch (e) {
                    console.log(relBody);
                }
            });
        });
        relReq.end();
    });
});

req.on('error', error => {
    console.error('Error de conexión:', error.message);
    console.log('Asegurate de que el backend esté corriendo en el puerto 8080.');
});

req.write(data);
req.end();
