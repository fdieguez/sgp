-- Desactivar integridad referencial en H2 para evitar violaciones de clave foránea al recrear tablas
SET REFERENTIAL_INTEGRITY FALSE;

-- 1. Limpiar por completo las relaciones previas
DELETE FROM user_tipo_resolucion;
DELETE FROM tipo_resolucion_atributo;
DELETE FROM tipo_resolucion;
DELETE FROM atributo_resolucion;

-- 2. Recrear los 4 tipos de resolución base
INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) VALUES ('AGENDA', true, null);
INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) VALUES ('SUBSIDIO', true, null);
INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) VALUES ('DECLARACION DE INTERES', true, null);
INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) VALUES ('OTRA', true, null);

-- 3. Insertar atributos dinámicos estandarizados y comprimidos (Etapa 7)

-- Atributos para SUBSIDIO (base & personal)
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Tipo de pedido', 'SELECT', 'Personal,Institucional en dinero,Institucional en especie,Institucional indistinto', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Descripción', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Monto', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Fin de subsidio', 'SELECT', 'subsistencia,salud,educación,deporte,construcción,viaje,beneficio,otro', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Nombre y apellido', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('DNI', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Dirección de DNI', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('DNI frente', 'FILE', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('DNI dorso', 'FILE', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Constancia de CBU', 'FILE', NULL, true);

-- Atributos para SUBSIDIO (institucional)
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Nombre de institución', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Dirección de institución', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Localidad', 'TEXT', NULL, true); -- UNIFICADO
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 1: Nombre', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 1: DNI', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 1: Cargo', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 2: Nombre', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 2: DNI', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 2: Cargo', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Nota de pedido', 'FILE', NULL, true);

-- Atributos para AGENDA
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Tipo de actividad', 'SELECT', 'reunión,evento,acto,recorrido gestión,recorrido territorial,visita,otros', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Organización propia', 'SELECT', 'si,no', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Detalle de actividad', 'TEXTAREA', NULL, true); -- UNIFICADO
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Asistentes', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Declaración de interés', 'SELECT', 'si,no', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Aporte otorgado', 'SELECT', 'si,no', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Detalle de aporte', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Datos de responsable', 'TEXT', NULL, true); -- UNIFICADO
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Observaciones', 'TEXTAREA', NULL, true); -- UNIFICADO

-- Atributos para DECLARACION DE INTERES
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Nombre de objeto', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Tipo de evento', 'SELECT', 'cultural,educativo,científico,deportivo,social,otros', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Fecha', 'DATE', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Hora', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Dirección de evento', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Fundamentos de declaración', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Nota o folleto', 'FILE', NULL, true);

-- Atributos para OTRA
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Descripción corta', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Detalle de resolución', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Adjuntos adicionales', 'FILE', NULL, true);


-- 4. Vincular Atributos a SUBSIDIO (ordenado)
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Tipo de pedido';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Descripción';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Monto';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 4 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Fin de subsidio';

-- Vinculación de condicionales de tipo Personal
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 5 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Nombre y apellido';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 6 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'DNI';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 7 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Dirección de DNI';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 8 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'DNI frente';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 9 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'DNI dorso';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 10 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Constancia de CBU';

-- Vinculación de condicionales de tipo Institucional
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 11 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Nombre de institución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 12 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Dirección de institución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 13 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Localidad';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 14 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 1: Nombre';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 15 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 1: DNI';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 16 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 1: Cargo';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 17 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 2: Nombre';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 18 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 2: DNI';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 19 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 2: Cargo';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 20 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Nota de pedido';


-- 5. Vincular Atributos a AGENDA (ordenado)
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Tipo de actividad';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Organización propia';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Detalle de actividad';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 4 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Asistentes';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 5 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Declaración de interés';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 6 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Aporte otorgado';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 7 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Detalle de aporte';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 8 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Datos de responsable';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 9 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Observaciones';


-- 6. Vincular Atributos a DECLARACION DE INTERES (ordenado)
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Nombre de objeto';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Tipo de evento';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Detalle de actividad';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 4 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Localidad';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 5 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Fecha';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 6 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Hora';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 7 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Dirección de evento';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 8 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Fundamentos de declaración';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 9 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Nota o folleto';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 10 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Observaciones';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 11 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Datos de responsable';


-- 7. Vincular Atributos a OTRA (ordenado)
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'OTRA' AND ar.nombre = 'Descripción corta';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'OTRA' AND ar.nombre = 'Detalle de resolución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'OTRA' AND ar.nombre = 'Adjuntos adicionales';

-- Reactivar integridad referencial
SET REFERENTIAL_INTEGRITY TRUE;
