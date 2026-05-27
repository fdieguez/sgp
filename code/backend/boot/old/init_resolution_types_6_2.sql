-- 1. Limpieza de tipos de resolución antiguos en relaciones y tablas
DELETE FROM tipo_resolucion_atributo 
WHERE tipo_resolucion_id IN (SELECT id FROM tipo_resolucion WHERE tipo IN ('MATERIALES', 'ASESORAMIENTO'));

DELETE FROM tipo_resolucion WHERE tipo IN ('MATERIALES', 'ASESORAMIENTO');

-- 2. Limpiar las relaciones previas para los tipos principales a configurar
DELETE FROM tipo_resolucion_atributo 
WHERE tipo_resolucion_id IN (SELECT id FROM tipo_resolucion WHERE tipo IN ('AGENDA', 'SUBSIDIO', 'DECLARACION DE INTERES', 'OTRA'));

DELETE FROM tipo_resolucion WHERE tipo IN ('AGENDA', 'SUBSIDIO', 'DECLARACION DE INTERES', 'OTRA');

-- 3. Limpiar todos los atributos de resolución anteriores para evitar conflictos y duplicados
DELETE FROM atributo_resolucion;

-- 4. Recrear los 4 tipos de resolución base con el resolutor por defecto asignado dinámicamente
INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) 
SELECT 'AGENDA', true, id FROM users WHERE email = 'resolutor@sgp.com';

INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) 
SELECT 'SUBSIDIO', true, id FROM users WHERE email = 'resolutor@sgp.com';

INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) 
SELECT 'DECLARACION DE INTERES', true, id FROM users WHERE email = 'resolutor@sgp.com';

INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) 
SELECT 'OTRA', true, id FROM users WHERE email = 'resolutor@sgp.com';

-- 5. Insertar los nuevos Atributos Dinámicos en atributo_resolucion
-- Atributos de SUBSIDIO
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Tipo de pedido', 'SELECT', 'Personal,Institucional en dinero,Institucional en especie,Institucional indistinto', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Descripción de subsidio', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Monto de subsidio', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Fin', 'SELECT', 'Educación,Salud,Deporte,Cultura,Social,Infraestructura,Otros', true);

-- Condicionales "Personal" de SUBSIDIO
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Apellido y nombre solicitante', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('DNI solicitante', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Dirección DNI', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('DNI Frente', 'FILE', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('DNI Atrás', 'FILE', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Constancia de CBU', 'FILE', NULL, true);

-- Condicionales "Institucional" de SUBSIDIO
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Nombre Institución', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Dirección Institución', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Localidad Institución', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 1 Nombre', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 1 DNI', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 1 Cargo', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 2 Nombre', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 2 DNI', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable 2 Cargo', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Nota de pedido', 'FILE', NULL, true);

-- Atributos de AGENDA
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Tipo de actividad', 'SELECT', 'Reunión,Evento,Visita,Gestión,Otro', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('¿La organizamos nosotros?', 'SELECT', 'SI,NO', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Descripción/Temario', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Asistentes', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('¿Tiene declaración de interés?', 'SELECT', 'SI,NO', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('¿Hubo Aporte?', 'SELECT', 'SI,NO', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable del evento', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Observación de agenda', 'TEXTAREA', NULL, true);

-- Atributos de DECLARACIÓN DE INTERÉS
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Nombre completo del evento/institución', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Tipo de declaración', 'SELECT', 'Deportiva,Cultural,Educativa,Social,Institucional,Otros', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Breve descripción de declaración', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Localidad de declaración', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Fecha de declaración', 'DATE', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Hora de declaración', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Dirección de declaración', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Fundamentos de declaración', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Flyer/Nota', 'FILE', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Observaciones de declaración', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable del evento de declaración', 'TEXT', NULL, true);

-- Atributos de OTRA
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Descripción corta', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Detalle de resolución', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Adjuntos adicionales', 'FILE', NULL, true);


-- 6. Vincular Atributos a Tipos de Resolución (tipo_resolucion_atributo)
-- Relaciones de SUBSIDIO
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Tipo de pedido';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Descripción de subsidio';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Monto de subsidio';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 4 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Fin';

-- Condicionales "Personal"
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 5 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Apellido y nombre solicitante';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 6 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'DNI solicitante';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 7 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Dirección DNI';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 8 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'DNI Frente';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 9 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'DNI Atrás';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 10 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Constancia de CBU';

-- Condicionales "Institucional"
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 11 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Nombre Institución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 12 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Dirección Institución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 13 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Localidad Institución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 14 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 1 Nombre';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 15 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 1 DNI';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 16 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 1 Cargo';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 17 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 2 Nombre';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 18 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 2 DNI';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 19 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Responsable 2 Cargo';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 20 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Nota de pedido';


-- Relaciones de AGENDA
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Tipo de actividad';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = '¿La organizamos nosotros?';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Descripción/Temario';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 4 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Asistentes';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 5 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = '¿Tiene declaración de interés?';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 6 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = '¿Hubo Aporte?';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 7 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Responsable del evento';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 8 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Observación de agenda';


-- Relaciones de DECLARACION DE INTERES
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Nombre completo del evento/institución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Tipo de declaración';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Breve descripción de declaración';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 4 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Localidad de declaración';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 5 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Fecha de declaración';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 6 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Hora de declaración';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 7 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Dirección de declaración';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 8 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Fundamentos de declaración';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 9 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Flyer/Nota';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 10 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Observaciones de declaración';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 11 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Responsable del evento de declaración';


-- Relaciones de OTRA
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'OTRA' AND ar.nombre = 'Descripción corta';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'OTRA' AND ar.nombre = 'Detalle de resolución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'OTRA' AND ar.nombre = 'Adjuntos adicionales';
