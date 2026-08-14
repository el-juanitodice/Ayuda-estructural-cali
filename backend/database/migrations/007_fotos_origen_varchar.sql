-- origen: enum fijo → VARCHAR para roles dinámicos (slug del nombre del rol).
USE cali_inspeccion;

ALTER TABLE fotos MODIFY COLUMN origen VARCHAR(50) NOT NULL;

SELECT DISTINCT origen FROM fotos ORDER BY origen;
