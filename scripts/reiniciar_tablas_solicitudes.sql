-- SGP Database Reset Script
-- Este script vacía las tablas de solicitudes y beneficiarios, reseteando los IDs de orden a 1.
-- Diseñado para ser ejecutado manualmente en clientes SQL (HeidiSQL, Workbench, etc.).

-- 1. Desactivar temporalmente la comprobación de claves foráneas
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Vaciar las tablas de transacciones y relaciones
TRUNCATE TABLE documento_adjunto;
TRUNCATE TABLE ticket_seguimiento;
TRUNCATE TABLE asignacion_historial;
TRUNCATE TABLE solicitud_resolutor_assignment;

-- 3. Vaciar la tabla de personas (beneficiarios)
TRUNCATE TABLE persons;

-- 4. Vaciar la tabla de solicitudes y restablecer el ID de inicio a 1
TRUNCATE TABLE solicitudes;
ALTER TABLE solicitudes AUTO_INCREMENT = 1;

-- 5. Reactivar la comprobación de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;
