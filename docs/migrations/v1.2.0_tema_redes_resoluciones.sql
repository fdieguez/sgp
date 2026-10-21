-- ==============================================================================
-- Migración DDL/DML v1.2.0: Tema, Redes Sociales y Formas de Resolución
-- Base de datos: sgp_dev_v1_2 / sgp_db
-- ==============================================================================

SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;

-- 1. Agregar columna 'tema' en la tabla 'solicitudes'
-- (En ejecución desatendida se omite error si ya existe)
-- ALTER TABLE solicitudes ADD COLUMN tema VARCHAR(100);

-- 2. Agregar columna 'social_media' en la tabla 'persons'
-- ALTER TABLE persons ADD COLUMN social_media VARCHAR(500);

-- 3. Actualizar tipos de resolución oficiales (Agenda, Subsidio en Dinero, Subsidio en Especie, Declaración de interés, Otro)
UPDATE tipo_resolucion SET tipo = 'SUBSIDIO EN DINERO' WHERE tipo = 'SUBSIDIO';
UPDATE tipo_resolucion SET tipo = 'OTRO' WHERE tipo = 'OTRA';

-- Insertar 'SUBSIDIO EN ESPECIE' si no existe
INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id)
SELECT 'SUBSIDIO EN ESPECIE', 1, tr.default_resolutor_id
FROM tipo_resolucion tr
WHERE tr.tipo = 'SUBSIDIO EN DINERO'
AND NOT EXISTS (SELECT 1 FROM tipo_resolucion WHERE tipo = 'SUBSIDIO EN ESPECIE');

-- Asociar al resolutor de subsidios también con 'SUBSIDIO EN ESPECIE'
INSERT INTO user_tipo_resolucion (user_id, tipo_resolucion_id)
SELECT utr.user_id, tr_nueva.id
FROM user_tipo_resolucion utr
JOIN tipo_resolucion tr_vieja ON utr.tipo_resolucion_id = tr_vieja.id
JOIN tipo_resolucion tr_nueva ON tr_nueva.tipo = 'SUBSIDIO EN ESPECIE'
WHERE tr_vieja.tipo = 'SUBSIDIO EN DINERO'
AND NOT EXISTS (
    SELECT 1 FROM user_tipo_resolucion 
    WHERE user_id = utr.user_id AND tipo_resolucion_id = tr_nueva.id
);

-- Copiar atributos de SUBSIDIO EN DINERO a SUBSIDIO EN ESPECIE
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr_nueva.id, tra.atributo_resolucion_id, tra.requerido, tra.orden
FROM tipo_resolucion tr_nueva
JOIN tipo_resolucion tr_vieja ON tr_vieja.tipo = 'SUBSIDIO EN DINERO'
JOIN tipo_resolucion_atributo tra ON tra.tipo_resolucion_id = tr_vieja.id
WHERE tr_nueva.tipo = 'SUBSIDIO EN ESPECIE'
AND NOT EXISTS (
    SELECT 1 FROM tipo_resolucion_atributo 
    WHERE tipo_resolucion_id = tr_nueva.id AND atributo_resolucion_id = tra.atributo_resolucion_id
);
