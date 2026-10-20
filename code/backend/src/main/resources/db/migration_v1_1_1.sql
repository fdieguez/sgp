-- ==============================================================================
-- Migración Oficial - Versión 1.1.1 SGP
-- Actualización de Atributos para Tipos de Resolución de Subsidio
-- (Personal, Institucional en Dinero, Institucional en Especie)
-- Base de datos: sgp_dev_v1_1 / sgp_db
-- ==============================================================================

-- 1. Actualizar el atributo 'Compañía' a tipo SELECT con opciones fijas (MOVISTAR, CLARO, PERSONAL, OTRA)
UPDATE atributo_resolucion 
SET tipo_dato = 'SELECT', opciones = 'MOVISTAR,CLARO,PERSONAL,OTRA' 
WHERE nombre = 'Compañía';

-- 2. Insertar atributos requeridos para 'Institucional en Especie' si no existen
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo)
SELECT 'Fecha del evento', 'DATE', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM atributo_resolucion WHERE nombre = 'Fecha del evento');

INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo)
SELECT 'Descripción del monto y bienes solicitados', 'TEXTAREA', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM atributo_resolucion WHERE nombre = 'Descripción del monto y bienes solicitados');

-- 3. Vincular los nuevos atributos al tipo de resolución 'SUBSIDIO'
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, 0, 20
FROM tipo_resolucion tr, atributo_resolucion ar
WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Fecha del evento'
AND NOT EXISTS (
    SELECT 1 FROM tipo_resolucion_atributo tra 
    WHERE tra.tipo_resolucion_id = tr.id AND tra.atributo_resolucion_id = ar.id
);

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, 0, 21
FROM tipo_resolucion tr, atributo_resolucion ar
WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Descripción del monto y bienes solicitados'
AND NOT EXISTS (
    SELECT 1 FROM tipo_resolucion_atributo tra 
    WHERE tra.tipo_resolucion_id = tr.id AND tra.atributo_resolucion_id = ar.id
);

-- 4. Reordenar atributos finales 'Monto' y 'Observaciones' para SUBSIDIO
UPDATE tipo_resolucion_atributo tra
JOIN tipo_resolucion tr ON tra.tipo_resolucion_id = tr.id
JOIN atributo_resolucion ar ON tra.atributo_resolucion_id = ar.id
SET tra.orden = 22
WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Monto';

UPDATE tipo_resolucion_atributo tra
JOIN tipo_resolucion tr ON tra.tipo_resolucion_id = tr.id
JOIN atributo_resolucion ar ON tra.atributo_resolucion_id = ar.id
SET tra.orden = 23
WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Observaciones';
