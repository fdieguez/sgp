-- ==============================================================================
-- Inserción de Nueva Responsable: Bianca Scalenghe (Zona Noreste)
-- SGP Producción y Local
-- ==============================================================================
START TRANSACTION;

INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('scalenghebianca@gmail.com', '$2a$10$HM9uWkJ7Fv/KSclJPZnYV.vvXkkRJDfFFx8s.9.4NzviBXt/Xl.82', 'RESPONSABLE', 'Bianca', 'Scalenghe', '1990-01-01', '3420000000', 'NORESTE', '37797942', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

COMMIT;

SELECT id, email, first_name, last_name, role, zone, dni, activo FROM users WHERE email = 'scalenghebianca@gmail.com';
