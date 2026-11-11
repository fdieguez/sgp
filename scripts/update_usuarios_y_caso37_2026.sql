-- Actualización de caso 37, zona de Hugo González e inserción de nuevos responsables Mariana Altuna e Iván Oesquer

-- 1. Corrección del caso 37 (recalcular estado a 'en proceso' dado que ya tiene responsable asignado)
UPDATE solicitudes 
SET status = 'en proceso' 
WHERE id = 37 AND status = 'pendiente' AND responsable_id IS NOT NULL;

-- 2. Asignación de zona 'DEPORTIVO' a Hugo González (quedando con 'OESTE, DEPORTIVO')
UPDATE users 
SET zone = 'OESTE, DEPORTIVO' 
WHERE email = 'victorhugogonzalez618@gmail.com';

-- 3. Inserción de nuevos responsables oficiales
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('mariana_altuna@hotmail.com', '$2a$10$4l3EuG2vBQkNev7GVlbzzuTEep1YVvuW6nI.wd2nK2.LoIdCaH9Si', 'RESPONSABLE', 'Mariana', 'Altuna', '1990-01-01', '3420000000', 'SANTO TOME', '28948636', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('oesquerivan@gmail.com', '$2a$10$k/9Wghj5RE3JyB5r2FrXEOpK3pBljsfGc3pQnZzxd6nD3GO6/PYQO', 'RESPONSABLE', 'Ivan', 'Oesquer', '1990-01-01', '3420000000', 'SUR, EDUCACION', '32097341', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;
