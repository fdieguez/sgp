-- ==============================================================================
-- Migración DDL/DML v1.1.2: Saneamiento de acentos y nombres de usuarios en UTF-8
-- Corrige caracteres corruptos generados por codificaciones no-UTF8 en la nómina.
-- Compatible tanto con Linux (producción) como con Windows (desarrollo local).
-- ==============================================================================

SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;

UPDATE users SET first_name = 'Matías', last_name = 'Ippólito' WHERE email = 'matias.ippolito@gmail.com';
UPDATE users SET first_name = 'Verónica', last_name = 'González' WHERE email = 'mveronicagonzalez79@gmail.com';
UPDATE users SET first_name = 'Alejandro', last_name = 'Fluchá' WHERE email = 'adflucha@gmail.com';
UPDATE users SET first_name = 'Hernán Rubens', last_name = 'Dorigo' WHERE email = 'hrdorigo@gmail.com';
UPDATE users SET first_name = 'María Florencia', last_name = 'Barducco' WHERE email = 'florenciabarducco@gmail.com';
UPDATE users SET first_name = 'Ayelén', last_name = 'Collado' WHERE email = 'ayecollado89@gmail.com';
UPDATE users SET first_name = 'Gastón', last_name = 'Machicote' WHERE email = 'machicotegaston@gmail.com';
UPDATE users SET first_name = 'Milagros', last_name = 'Cáceres' WHERE email = 'milagrosscaceres@gmail.com';
UPDATE users SET first_name = 'Victor', last_name = 'González' WHERE email = 'vicnanogonzalez@gmail.com';
UPDATE users SET first_name = 'Joaquín', last_name = 'Simon' WHERE email = 'quinchosimon11@gmail.com';
