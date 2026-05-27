const http = require('http');

const loginData = JSON.stringify({
  email: 'admin@sgp.com',
  password: 'SGP_Admin_#2026_Prod_Secure_!'
});

const loginOptions = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = http.request(loginOptions, (res) => {
  let loginResBody = '';
  res.on('data', (chunk) => { loginResBody += chunk; });
  res.on('end', () => {
    try {
      const loginJson = JSON.parse(loginResBody);
      const token = loginJson.token;
      if (!token) {
        console.error('Error: No se obtuvo token de login. Respuesta:', loginResBody);
        return;
      }
      console.log('Login exitoso, token obtenido.');

      // Hacer fetch de locations usando el token
      const locOptions = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/locations',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const locReq = http.request(locOptions, (locRes) => {
        let locData = '';
        locRes.on('data', (chunk) => { locData += chunk; });
        locRes.on('end', () => {
          try {
            const locations = JSON.parse(locData);
            console.log(`Recibidas ${locations.length} localidades de la API.`);
            
            const santaFe = locations.find(l => l.name === 'Santa Fe');
            console.log('Santa Fe en la API:', santaFe ? JSON.stringify(santaFe) : 'No encontrada');

            const lagunaPaiva = locations.find(l => l.name === 'Laguna Paiva');
            console.log('Laguna Paiva en la API:', lagunaPaiva ? JSON.stringify(lagunaPaiva) : 'No encontrada');

            const allVisible = locations.filter(l => l.showInUi === true);
            console.log('Localidades con showInUi = true:', allVisible.map(l => l.name));
            
            console.log('Primeras 10 localidades devueltas:');
            console.log(JSON.stringify(locations.slice(0, 10), null, 2));
          } catch (e) {
            console.error('Error parseando JSON de localidades:', e.message);
            console.log('Respuesta raw:', locData.slice(0, 500));
          }
        });
      });
      locReq.on('error', (err) => {
        console.error('Error al consultar localidades:', err.message);
      });
      locReq.end();

    } catch (e) {
      console.error('Error parseando JSON de login:', e.message);
      console.log('Respuesta de login raw:', loginResBody);
    }
  });
});

req.on('error', (err) => {
  console.error('Error en request de login:', err.message);
});

req.write(loginData);
req.end();
