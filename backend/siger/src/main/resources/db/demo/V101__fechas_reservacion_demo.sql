-- =====================================================================
-- SIGER · Flyway V101 · Corrección de los datos de demostración (Fase 9) · SOLO perfil dev
-- V100 calculó fecha_reservacion como «fecha límite − 7 días», que en los eventos de dentro de varias semanas
-- queda en el futuro: una reservación no puede hacerse después de hoy y, con esas fechas, la tendencia de
-- reservaciones de los reportes salía vacía. Se mueven al pasado solo las fechas que quedaron en el futuro.
-- No se edita V100 porque ya está aplicada en las bases de desarrollo (Flyway rechazaría el cambio de checksum).
-- =====================================================================

UPDATE reservaciones
SET fecha_reservacion = now() - interval '2 days',
    fecha_cancelacion = CASE WHEN fecha_cancelacion IS NULL THEN NULL ELSE now() - interval '1 day' END
WHERE fecha_reservacion > now();
