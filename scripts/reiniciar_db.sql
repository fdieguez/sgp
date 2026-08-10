-- SGP Database Reset Script
-- Este script vacía las tablas de solicitudes y beneficiarios, reseteando los IDs de orden.

SET FOREIGN_KEY_CHECKS = 0;

-- Vaciar tablas relacionadas con documentos, tickets y asignaciones
TRUNCATE TABLE documento_adjunto;
TRUNCATE TABLE ticket_seguimiento;
TRUNCATE TABLE asignacion_historial;
TRUNCATE TABLE solicitud_resolutor_assignment;

-- Vaciar tabla principal de solicitudes y personas (beneficiarios)
TRUNCATE TABLE solicitudes;
TRUNCATE TABLE persons;

SET FOREIGN_KEY_CHECKS = 1;
