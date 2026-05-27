-- update_locations_6_1.sql
-- Este script actualiza el campo show_in_ui para limitar las localidades visibles en el sistema (Etapa 6.1).
-- Nota: La columna `show_in_ui` es creada automáticamente por Hibernate (ddl-auto=update) en el arranque.
-- Este script se encargará exclusivamente de setear el valor en las localidades requeridas.

UPDATE locations 
SET show_in_ui = TRUE 
WHERE type = 'CITY' 
AND name IN (
    'Santa Fe',
    'Laguna Paiva',
    'Recreo',
    'San José del Rincón',
    'Santo Tomé',
    'Arroyo Aguiar',
    'Arroyo Leyes',
    'Cabal',
    'Campo Andino',
    'Candioti',
    'Emilia',
    'Llambi Campbell',
    'Monte Vera',
    'Nelson',
    'Sauce Viejo',
    'Otra'
);
