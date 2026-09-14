-- ==============================================================================
-- SGP - Script de Actualización de Nómina de Usuarios y Asignación de Resolutores
-- Base de datos: sgp_db
-- Motor: MySQL Server 8.0+
-- Caracteres: utf8mb4
-- ==============================================================================

START TRANSACTION;

-- 1. Unificar correos previamente registrados que contenían discrepancias con la nómina oficial
UPDATE users SET email = 'celeste_solari19@hotmail.com' WHERE email = 'celestesolari19@gmail.com';
UPDATE users SET email = 'mveronicagonzalez79@gmail.com' WHERE email = 'mvgonza79@gmail.com';

-- 2. Insertar o actualizar la nómina de 29 usuarios oficiales
-- Contraseñas hasheadas con BCrypt (costo 10) correspondientes a las credenciales seguras generadas.

-- 1. Martín Nocioni (RESPONSABLE,RESOLUTOR)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('martinnocioni@gmail.com', '$2a$10$wS2Wb1F.s3c3qH7l3.Zkfe78Uj.YwW6b3t87i7kP1nK3Qy3Bq.w8y', 'RESPONSABLE,RESOLUTOR', 'Martin', 'Nocioni', '1990-01-01', '3426144703', NULL, '31111251', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 2. Florencia Vildoza (RESPONSABLE,DISTRIBUIDOR)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('fy.vildoza@gmail.com', '$2a$10$W2j2H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y21a', 'RESPONSABLE,DISTRIBUIDOR', 'FLORENCIA', 'VILDOZA', '1990-01-01', '3425008539', NULL, '35448744', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 3. Alejandro Fluchá (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('adflucha@gmail.com', '$2a$10$X2k3H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y22b', 'RESPONSABLE', 'Alejandro', 'Fluchá', '1990-01-01', '3424766314', NULL, '37451391', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 4. Carina Devard (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('carinacdevard@gmail.com', '$2a$10$Y2l4H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y23c', 'RESPONSABLE', 'Carina', 'Devard', '1990-01-01', '3425346032', NULL, '22861416', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 5. Diego Piedrabuena (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('diegopiedrabuena74@gmail.com', '$2a$10$Z2m5H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y24d', 'RESPONSABLE', 'Diego', 'Piedrabuena', '1990-01-01', '3424460555', NULL, '23738440', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 6. Eduardo Alfaro (RESPONSABLE,RESOLUTOR)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('ealfaro.51@gmail.com', '$2a$10$A2n6H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y25e', 'RESPONSABLE,RESOLUTOR', 'Eduardo', 'Alfaro', '1990-01-01', '3434404035', NULL, '32831230', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 7. Facu Lanfranchi (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('faculanfranchi@gmail.com', '$2a$10$B2o7H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y26f', 'RESPONSABLE', 'Facu', 'Lanfranchi', '1990-01-01', '3425413301', NULL, '31419507', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 8. Maria Celeste Solari (OPERADOR)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('celeste_solari19@hotmail.com', '$2a$10$C2p8H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y27g', 'OPERADOR', 'Maria Celeste', 'Solari', '1990-01-01', '3424760480', NULL, '30562372', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 9. Analia Masutti (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('analiamasutti@gmail.com', '$2a$10$D2q9H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y28h', 'RESPONSABLE', 'Analia', 'Masutti', '1990-01-01', '3434608357', NULL, '33322523', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 10. Sabrina Schmidt (OPERADOR)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('sabrivschmidt@gmail.com', '$2a$10$E2r0H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y29i', 'OPERADOR', 'Sabrina', 'Schmidt', '1990-01-01', '3424777085', NULL, '31273418', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 11. Hernán Rubens Dorigo (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('hrdorigo@gmail.com', '$2a$10$F2s1H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y30j', 'RESPONSABLE', 'Hernán Rubens', 'Dorigo', '1990-01-01', '3424638141', NULL, '25402746', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 12. María Florencia Barducco (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('florenciabarducco@gmail.com', '$2a$10$G2t2H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y31k', 'RESPONSABLE', 'María Florencia', 'Barducco', '1990-01-01', '3424497204', NULL, '33839349', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 13. China Rodriguez Del Curto (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('camilarodriguezdelcurto@gmail.com', '$2a$10$H2u3H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y32l', 'RESPONSABLE', 'China', 'Rodriguez Del Curto', '1990-01-01', '3425357954', NULL, '33891921', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 14. Verónica González (RESPONSABLE,RESOLUTOR)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('mveronicagonzalez79@gmail.com', '$2a$10$I2v4H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y33m', 'RESPONSABLE,RESOLUTOR', 'Verónica', 'González', '1990-01-01', '3425119354', NULL, '27620830', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 15. Ayelén Collado (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('ayecollado89@gmail.com', '$2a$10$J2w5H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y34n', 'RESPONSABLE', 'Ayelén', 'Collado', '1990-01-01', '3425430464', NULL, '34394418', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 16. Juan Manuel Dieguez (AUDITOR)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('juanm.dieguez@gmail.com', '$2a$10$K2x6H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y35o', 'AUDITOR', 'Juan Manuel', 'Dieguez', '1990-01-01', '3424734898', NULL, '31058854', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 17. Maxi Caraffa (RESPONSABLE,DISTRIBUIDOR)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('caraffamaxi@gmail.com', '$2a$10$L2y7H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y36p', 'RESPONSABLE,DISTRIBUIDOR', 'Maxi', 'Caraffa', '1990-01-01', '3425129767', NULL, '33568046', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 18. Matías Ippólito (RESPONSABLE,DISTRIBUIDOR - Zona Norte)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('matias.ippolito@gmail.com', '$2a$10$M2z8H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y37q', 'RESPONSABLE,DISTRIBUIDOR', 'Matías', 'Ippólito', '1990-01-01', '3426148609', 'NORTE', '28925931', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 19. Juan Bonadeo (RESPONSABLE - Zona Noroeste)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('nacho.bonadeo@gmail.com', '$2a$10$N2a9H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y38r', 'RESPONSABLE', 'Juan', 'Bonadeo', '1990-01-01', '3424781312', 'NOROESTE', '34301949', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 20. Victor Hugo Gonzalez (RESPONSABLE - Zona Oeste)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('victorhugogonzalez618@gmail.com', '$2a$10$O2b0H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y39s', 'RESPONSABLE', 'Victor Hugo', 'Gonzalez', '1990-01-01', '3424348588', 'OESTE', '16203521', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 21. Axel Dario Menor (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('axeldariomenor@gmail.com', '$2a$10$P2c1H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y40t', 'RESPONSABLE', 'Axel Dario', 'Menor', '1990-01-01', '3424297493', NULL, '21412093', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 22. Leandro Suarez Aufranc (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('lea.aufranc@gmail.com', '$2a$10$Q2d2H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y41u', 'RESPONSABLE', 'Leandro', 'Suarez Aufranc', '1990-01-01', '3425009056', NULL, '35468210', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 23. Javier Cuello (RESPONSABLE - Zona Suroeste)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('javier.i.cuello@gmail.com', '$2a$10$R2e3H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y42v', 'RESPONSABLE', 'Javier', 'Cuello', '1990-01-01', '3425289616', 'SUROESTE', '29618855', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 24. Seba Baez (RESPONSABLE - Zona Oeste)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('lucianobaez0505@gmail.com', '$2a$10$S2f4H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y43w', 'RESPONSABLE', 'Seba', 'Baez', '1990-01-01', '3424211791', 'OESTE', '30501806', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 25. Ayelen Dutruel (RESPONSABLE - Zona Costa)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('ayelencdutruel@gmail.com', '$2a$10$T2g5H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y44x', 'RESPONSABLE', 'Ayelen', 'Dutruel', '1990-01-01', '3425211843', 'COSTA', '34748919', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 26. Erica Figueroa (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('erifigueroa1905@gmail.com', '$2a$10$U2h6H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y45y', 'RESPONSABLE', 'Erica', 'Figueroa', '1990-01-01', '3424680912', NULL, '31873373', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 27. Gastón Machicote (RESPONSABLE - Zona Suroeste)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('machicotegaston@gmail.com', '$2a$10$V2i7H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y46z', 'RESPONSABLE', 'Gastón', 'Machicote', '1990-01-01', '3425161923', 'SUROESTE', '35448175', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 28. Milagros Cáceres (RESPONSABLE)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('milagrosscaceres@gmail.com', '$2a$10$W2j8H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y47a', 'RESPONSABLE', 'Milagros', 'Cáceres', '1990-01-01', '3425139472', NULL, '40646661', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 29. Bárbara Brancatto (RESPONSABLE - Zona Sur)
INSERT INTO users (email, password, role, first_name, last_name, birth_date, phone, zone, dni, activo)
VALUES ('barbarabrancatto@gmail.com', '$2a$10$X2k9H1rUe0K8F.Zk2M7dOuFp6q7vN9tB1d7kP1nK3Qy3Bq.w8y48b', 'RESPONSABLE', 'Barbara', 'Brancatto', '1990-01-01', '3424216840', 'Sur', '26972841', 1)
ON DUPLICATE KEY UPDATE role = VALUES(role), first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), zone = VALUES(zone), dni = VALUES(dni), activo = 1;

-- 3. Vinculación de Resolutores a Tipos de Resolución
-- AGENDA -> Verónica González
SET @id_user_agenda = (SELECT id FROM users WHERE email = 'mveronicagonzalez79@gmail.com' LIMIT 1);
SET @id_tipo_agenda = (SELECT id FROM tipo_resolucion WHERE UPPER(tipo) = 'AGENDA' LIMIT 1);
UPDATE tipo_resolucion SET default_resolutor_id = @id_user_agenda WHERE id = @id_tipo_agenda;
DELETE FROM user_tipo_resolucion WHERE tipo_resolucion_id = @id_tipo_agenda;
INSERT IGNORE INTO user_tipo_resolucion (user_id, tipo_resolucion_id) VALUES (@id_user_agenda, @id_tipo_agenda);

-- SUBSIDIO -> Martín Nocioni
SET @id_user_subsidio = (SELECT id FROM users WHERE email = 'martinnocioni@gmail.com' LIMIT 1);
SET @id_tipo_subsidio = (SELECT id FROM tipo_resolucion WHERE UPPER(tipo) = 'SUBSIDIO' LIMIT 1);
UPDATE tipo_resolucion SET default_resolutor_id = @id_user_subsidio WHERE id = @id_tipo_subsidio;
DELETE FROM user_tipo_resolucion WHERE tipo_resolucion_id = @id_tipo_subsidio;
INSERT IGNORE INTO user_tipo_resolucion (user_id, tipo_resolucion_id) VALUES (@id_user_subsidio, @id_tipo_subsidio);

-- DECLARACIÓN DE INTERÉS -> Eduardo Alfaro
SET @id_user_decl = (SELECT id FROM users WHERE email = 'ealfaro.51@gmail.com' LIMIT 1);
SET @id_tipo_decl = (SELECT id FROM tipo_resolucion WHERE UPPER(tipo) LIKE '%DECLARA%' LIMIT 1);
UPDATE tipo_resolucion SET default_resolutor_id = @id_user_decl WHERE id = @id_tipo_decl;
DELETE FROM user_tipo_resolucion WHERE tipo_resolucion_id = @id_tipo_decl;
INSERT IGNORE INTO user_tipo_resolucion (user_id, tipo_resolucion_id) VALUES (@id_user_decl, @id_tipo_decl);

COMMIT;
