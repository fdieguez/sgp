-- Agregar la columna activo a la tabla users con valor por defecto true si no existe
ALTER TABLE users ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE;
