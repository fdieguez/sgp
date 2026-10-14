-- ==============================================================================
-- Migración Oficial - Versión 1.1.0 SGP
-- Base de datos: sgp_dev_v1_1 / sgp_db
-- ==============================================================================

-- 1. Módulo C: Gestión de Invitados Frecuentes en Google Calendar (CDU-14 y CDU-15)
CREATE TABLE IF NOT EXISTS agenda_guests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sheets_config_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agenda_guests_sheets_config FOREIGN KEY (sheets_config_id) REFERENCES sheets_config (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_agenda_guests_config ON agenda_guests (sheets_config_id);
