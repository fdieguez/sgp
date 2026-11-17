-- ==============================================================================
-- Inserción de Nuevo Auditor: Paco Garibaldi (Auditoría y Seguimiento)
-- SGP Producción y Local
-- ==============================================================================
START TRANSACTION;

INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('paco_gari@hotmail.com', '$2a$10$SDZy2l.bYM1FNj9QTy2ywegKdNum0mgTQHHw5Ho/LWjYZPMeBFRyO', 'AUDITOR', 'Paco', 'Garibaldi', '1990-01-01', '3420000000', NULL, '30165812', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

COMMIT;

SELECT id, email, first_name, last_name, role, zone, dni, activo FROM users WHERE email = 'paco_gari@hotmail.com';
