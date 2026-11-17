-- ==============================================================================
-- Limpieza de tipos de resolución duplicados / de prueba y separación de campos en Especie
-- ==============================================================================
START TRANSACTION;

-- 1. Unificar asignaciones históricas de SUBSIDIO -> SUBSIDIO EN DINERO y OTRA -> OTRO
UPDATE solicitud_resolutor_assignment
SET tipo_resolucion = 'SUBSIDIO EN DINERO'
WHERE UPPER(TRIM(tipo_resolucion)) = 'SUBSIDIO';

UPDATE solicitud_resolutor_assignment
SET tipo_resolucion = 'OTRO'
WHERE UPPER(TRIM(tipo_resolucion)) = 'OTRA';

-- 2. Reasignar competencias user_tipo_resolucion si existían en los IDs duplicados
SET @id_sub_dinero = (SELECT id FROM tipo_resolucion WHERE UPPER(tipo) = 'SUBSIDIO EN DINERO' LIMIT 1);
SET @id_sub_dup    = (SELECT id FROM tipo_resolucion WHERE UPPER(tipo) = 'SUBSIDIO' LIMIT 1);
SET @id_otro       = (SELECT id FROM tipo_resolucion WHERE UPPER(tipo) = 'OTRO' LIMIT 1);
SET @id_otra_dup   = (SELECT id FROM tipo_resolucion WHERE UPPER(tipo) = 'OTRA' LIMIT 1);
SET @id_otra_test  = (SELECT id FROM tipo_resolucion WHERE UPPER(tipo) = 'OTRA_TEST' LIMIT 1);

INSERT IGNORE INTO user_tipo_resolucion (user_id, tipo_resolucion_id)
SELECT user_id, @id_sub_dinero FROM user_tipo_resolucion WHERE tipo_resolucion_id = @id_sub_dup AND @id_sub_dinero IS NOT NULL;

INSERT IGNORE INTO user_tipo_resolucion (user_id, tipo_resolucion_id)
SELECT user_id, @id_otro FROM user_tipo_resolucion WHERE tipo_resolucion_id = @id_otra_dup AND @id_otro IS NOT NULL;

-- 3. Eliminar relaciones y registros duplicados/test (SUBSIDIO, OTRA, OTRA_TEST)
DELETE FROM user_tipo_resolucion WHERE tipo_resolucion_id IN (@id_sub_dup, @id_otra_dup, @id_otra_test);
DELETE FROM tipo_resolucion_atributo WHERE tipo_resolucion_id IN (@id_sub_dup, @id_otra_dup, @id_otra_test);
DELETE FROM tipo_resolucion WHERE id IN (@id_sub_dup, @id_otra_dup, @id_otra_test);

-- 4. Renombrar atributo para separar descripción de bienes y monto
UPDATE atributo_resolucion
SET nombre = 'Descripción de bienes solicitados'
WHERE nombre = 'Descripción del monto y bienes solicitados';

COMMIT;

SELECT id, tipo, default_resolutor_id FROM tipo_resolucion ORDER BY id;
SELECT id, nombre, tipo_dato FROM atributo_resolucion WHERE nombre IN ('Descripción de bienes solicitados', 'Monto');
