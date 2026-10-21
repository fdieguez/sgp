/**
 * Configuración centralizada de versión del Sistema de Gestión Política (SGP).
 * Fuente única de la verdad para visualización de versión en toda la aplicación.
 * 
 * REGLA INMUTABLE: Siempre que se realice un fix o corrección de bugs, se debe incrementar
 * obligatoriamente el último dígito de la versión (Patch: X.Y.Z -> Z+1), actualizando también package.json.
 */
export const APP_VERSION = '1.2.0';
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
