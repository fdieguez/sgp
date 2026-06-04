-- Desactivar integridad referencial temporalmente
SET REFERENTIAL_INTEGRITY FALSE;

-- Eliminar relaciones de muchos a muchos para los tipos obsoletos
DELETE FROM user_tipo_resolucion 
WHERE tipo_resolucion_id IN (SELECT id FROM tipo_resolucion WHERE tipo IN ('MATERIALES', 'ASESORAMIENTO'));

-- Eliminar relaciones de atributos para los tipos obsoletos
DELETE FROM tipo_resolucion_atributo 
WHERE tipo_resolucion_id IN (SELECT id FROM tipo_resolucion WHERE tipo IN ('MATERIALES', 'ASESORAMIENTO'));

-- Eliminar los tipos de resolución obsoletos
DELETE FROM tipo_resolucion 
WHERE tipo IN ('MATERIALES', 'ASESORAMIENTO');

-- Reactivar integridad referencial
SET REFERENTIAL_INTEGRITY TRUE;
