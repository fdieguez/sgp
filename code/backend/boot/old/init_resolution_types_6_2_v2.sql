-- Desactivar integridad referencial en H2 para evitar violaciones de clave foránea al recrear tablas
SET REFERENTIAL_INTEGRITY FALSE;

-- 1. Limpiar por completo las relaciones de atributos de resolución para evitar violaciones de clave foránea (FK)
DELETE FROM tipo_resolucion_atributo;

-- 2. Limpiar todos los tipos de resolución
DELETE FROM tipo_resolucion;

-- 3. Limpiar todos los atributos de resolución
DELETE FROM atributo_resolucion;

-- 4. Recrear los 4 tipos de resolución base asignando el resolutor por defecto resolutor@sgp.com como null inicialmente
INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) VALUES ('AGENDA', true, null);
INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) VALUES ('SUBSIDIO', true, null);
INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) VALUES ('DECLARACION DE INTERES', true, null);
INSERT INTO tipo_resolucion (tipo, activo, default_resolutor_id) VALUES ('OTRA', true, null);

-- 5. Insertar atributos dinámicos para SUBSIDIO
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Tipo de pedido', 'SELECT', 'Personal,Institucional en dinero,Institucional en especie,Institucional indistinto', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Descripción', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Monto', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Fin', 'SELECT', 'subsistencia,salud,educación,deporte,construcción,viaje,beneficio,otro', true);

-- Atributos específicos para el flujo "Personal" de SUBSIDIO
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Apellido y nombre', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('DNI', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Dirección del DNI', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Adjuntar DNI frente', 'FILE', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Adjuntar DNI atras', 'FILE', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Adjuntar Constancia de CBU', 'FILE', NULL, true);

-- Atributos específicos para el flujo "Institucional" de SUBSIDIO
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Nombre de la Institución', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Dirección de la Institución', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Localidad de la Institución', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('responsable1: Nombre', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('responsable1: DNI', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('responsable1: Cargo', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('responsable2: Nombre', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('responsable2: DNI', 'NUMBER', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('responsable2: Cargo', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Adjuntar nota de pedido (jpg/pdf)', 'FILE', NULL, true);

-- 6. Insertar atributos dinámicos para AGENDA
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Tipo de actividad', 'SELECT', 'reunión,evento,acto,recorrido gestión,recorrido territorial,visita,otros', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('La organizamos nosotros? (si/no)', 'SELECT', 'si,no', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('describir la actividad/temario', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Quienes asisten?', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Tiene declaración de interés? (si/no)', 'SELECT', 'si,no', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Hubo Aporte? (si/no)', 'SELECT', 'si,no', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('describir aporte', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('responsable (nombre, dni, telefono)', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Observación', 'TEXTAREA', NULL, true);

-- 7. Insertar atributos dinámicos para DECLARACION DE INTERES
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Nombre completo del evento / actividad / institución a declarar', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('tipo', 'SELECT', 'cultural,educativo,científico,deportivo,social,otros', true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Breve descripción:', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Localidad:', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Fecha:', 'DATE', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Hora (si corresponde)', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Dirección / lugar:', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Fundamentos de la declaración:', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Flyer/nota: adjuntar jpg/pdf', 'FILE', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Observaciones:', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Responsable: nombre, dni, cargo, telefono', 'TEXT', NULL, true);

-- 8. Insertar atributos dinámicos para OTRA
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Descripción corta', 'TEXT', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Detalle de resolución', 'TEXTAREA', NULL, true);
INSERT INTO atributo_resolucion (nombre, tipo_dato, opciones, activo) VALUES ('Adjuntos adicionales', 'FILE', NULL, true);


-- 9. Vincular Atributos a SUBSIDIO (ordenado)
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Tipo de pedido';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Descripción';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Monto';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 4 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Fin';

-- Vinculación de condicionales de tipo Personal
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 5 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Apellido y nombre';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 6 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'DNI';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 7 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Dirección del DNI';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 8 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Adjuntar DNI frente';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 9 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Adjuntar DNI atras';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 10 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Adjuntar Constancia de CBU';

-- Vinculación de condicionales de tipo Institucional
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 11 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Nombre de la Institución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 12 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Dirección de la Institución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 13 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Localidad de la Institución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 14 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'responsable1: Nombre';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 15 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'responsable1: DNI';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 16 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'responsable1: Cargo';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 17 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'responsable2: Nombre';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 18 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'responsable2: DNI';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 19 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'responsable2: Cargo';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 20 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'SUBSIDIO' AND ar.nombre = 'Adjuntar nota de pedido (jpg/pdf)';


-- 10. Vincular Atributos a AGENDA (ordenado)
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Tipo de actividad';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'La organizamos nosotros? (si/no)';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'describir la actividad/temario';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 4 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Quienes asisten?';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 5 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Tiene declaración de interés? (si/no)';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 6 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Hubo Aporte? (si/no)';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 7 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'describir aporte';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 8 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'responsable (nombre, dni, telefono)';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 9 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'AGENDA' AND ar.nombre = 'Observación';


-- 11. Vincular Atributos a DECLARACION DE INTERES (ordenado)
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Nombre completo del evento / actividad / institución a declarar';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'tipo';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Breve descripción:';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 4 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Localidad:';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 5 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Fecha:';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 6 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Hora (si corresponde)';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 7 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Dirección / lugar:';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 8 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Fundamentos de la declaración:';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 9 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Flyer/nota: adjuntar jpg/pdf';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 10 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Observaciones:';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 11 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'DECLARACION DE INTERES' AND ar.nombre = 'Responsable: nombre, dni, cargo, telefono';


-- 12. Vincular Atributos a OTRA (ordenado)
INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 1 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'OTRA' AND ar.nombre = 'Descripción corta';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, true, 2 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'OTRA' AND ar.nombre = 'Detalle de resolución';

INSERT INTO tipo_resolucion_atributo (tipo_resolucion_id, atributo_resolucion_id, requerido, orden)
SELECT tr.id, ar.id, false, 3 FROM tipo_resolucion tr, atributo_resolucion ar WHERE tr.tipo = 'OTRA' AND ar.nombre = 'Adjuntos adicionales';

-- Reactivar integridad referencial
SET REFERENTIAL_INTEGRITY TRUE;
