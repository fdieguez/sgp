-- Inserción de nuevos responsables: Carlos Egestti y Martín Ledesma
USE sgp_prod_v1_2;

INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('egestticarlos@gmail.com', '$2a$10$Th2nKEc4zed1nuhYKc0P/uByUcIUbTPGsE6lHFjOSxZ4sxCdKkcFy', 'RESPONSABLE', 'Carlos', 'Egestti', '1990-01-01', '3420000000', 'PRIMER CORDON', '21411650', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('ledesmamartin089@gmail.com', '$2a$10$t0T1RHdLM6T8QGfF3DSv5.VneDfc7LcbOy0ezq7Ld5hvUVMz0/aoO', 'RESPONSABLE', 'Martín', 'Ledesma', '1990-01-01', '3420000000', 'COSTA', '30432225', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;
