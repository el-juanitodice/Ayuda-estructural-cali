-- aviso no es pagina de menu: requiere ?uuid= desde Revision
USE cali_inspeccion;

UPDATE app_modules SET route_path = NULL WHERE code = 'aviso';

SELECT code, name, route_path FROM app_modules ORDER BY nav_sort_order;
