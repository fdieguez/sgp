-- ==============================================================================
-- Inserción de Nuevos Barrios en Santa Fe: Villa Hipódromo y Nueva Esperanza
-- ==============================================================================
START TRANSACTION;

SET @sf_city_id = (SELECT id FROM locations WHERE UPPER(name) = 'SANTA FE' AND type = 'CITY' LIMIT 1);

INSERT INTO locations (name, type, parent_id, show_in_ui)
SELECT 'Villa Hipódromo', 'NEIGHBORHOOD', @sf_city_id, 0
FROM DUAL
WHERE @sf_city_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM locations WHERE parent_id = @sf_city_id AND UPPER(name) = 'VILLA HIPÓDROMO');

INSERT INTO locations (name, type, parent_id, show_in_ui)
SELECT 'Nueva Esperanza', 'NEIGHBORHOOD', @sf_city_id, 0
FROM DUAL
WHERE @sf_city_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM locations WHERE parent_id = @sf_city_id AND UPPER(name) = 'NUEVA ESPERANZA');

COMMIT;

SELECT id, name, type, parent_id, show_in_ui FROM locations WHERE parent_id = @sf_city_id AND name IN ('Villa Hipódromo', 'Nueva Esperanza');
