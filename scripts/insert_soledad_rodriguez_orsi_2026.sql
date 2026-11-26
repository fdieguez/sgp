-- ==============================================================================
-- Inserción de Nuevo Responsable: Soledad María Rodriguez Orsi (GENERAL)
-- SGP Producción y Local
-- ==============================================================================
START TRANSACTION;

INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('soledadrodriguezorsi@gmail.com', '$2a$10$pK.SytX1/4dsz.80qigYcus7WCNsDSmsbWJaCC83u6XcHNcCSMK7m', 'RESPONSABLE', 'Soledad María', 'Rodriguez Orsi', '1990-01-01', '3420000000', 'GENERAL', '32660158', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

COMMIT;

SELECT id, email, first_name, last_name, role, zone, dni, activo FROM users WHERE email = 'soledadrodriguezorsi@gmail.com';
