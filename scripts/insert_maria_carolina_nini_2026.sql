-- ==============================================================================
-- Inserción de Nuevo Responsable: Maria Carolina Nini (GENERAL)
-- SGP Producción y Local
-- ==============================================================================
START TRANSACTION;

INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('mariacarolinanini@gmail.com', '$2a$10$CB9x4VYyMvOtnS5yElgISeR.bI63HUqa0YriKm.8gPygOE27rptze', 'RESPONSABLE', 'Maria Carolina', 'Nini', '1990-01-01', '3420000000', 'GENERAL', '37446537', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

COMMIT;

SELECT id, email, first_name, last_name, role, zone, dni, activo FROM users WHERE email = 'mariacarolinanini@gmail.com';
