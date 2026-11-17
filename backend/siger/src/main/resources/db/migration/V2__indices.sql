-- =====================================================================
-- SIGER · Sistema Inteligente de Gestión de Eventos y Reservaciones
-- Flyway V2 · PostgreSQL 18 · T-03-01
-- Índices de consulta, índices de las llaves foráneas e índices únicos parciales (RN-09).
-- Generado de avances/fase_1/ERD/SIGER_esquema.sql (T-01-01, aprobado el 02/10/2026),
-- que a su vez sale del Diccionario de Datos v2. No editar una migración ya aplicada:
-- los cambios van en una migración nueva (V3__…, V4__…).
-- Convención de nombres: pk_ llave primaria, fk_ foránea, uq_ única, ck_ CHECK, ix_ índice.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
CREATE INDEX ix_usuarios_rol_estado ON usuarios (rol, estado_cuenta);
CREATE INDEX ix_eventos_estado_inicio ON eventos (estado_evento, fecha_hora_inicio);
CREATE INDEX ix_eventos_categoria ON eventos (id_categoria);
CREATE INDEX ix_eventos_organizador ON eventos (id_organizador);
CREATE INDEX ix_eventos_busqueda_trgm ON eventos USING gin (nombre_evento gin_trgm_ops, ubicacion gin_trgm_ops);
CREATE UNIQUE INDEX uq_reservaciones_confirmada ON reservaciones (id_evento, id_participante) WHERE estado_reservacion = 'Confirmada';
CREATE INDEX ix_reservaciones_participante ON reservaciones (id_participante);
CREATE INDEX ix_reservaciones_evento_estado ON reservaciones (id_evento, estado_reservacion);
CREATE UNIQUE INDEX uq_asistencias_reservacion_vigente ON asistencias (id_reservacion) WHERE anulada = false;
CREATE INDEX ix_asistencias_fecha ON asistencias (fecha_hora_validacion);
CREATE INDEX ix_asistencias_registrado_por ON asistencias (id_registrado_por);  -- índice de la llave foránea
CREATE INDEX ix_asistencias_anulada_por ON asistencias (id_anulada_por);  -- índice de la llave foránea
CREATE INDEX ix_notificaciones_usuario_leida ON notificaciones (id_usuario, leida);
CREATE INDEX ix_notificaciones_cola ON notificaciones (estado_envio, fecha_creacion);
CREATE INDEX ix_notificaciones_evento ON notificaciones (id_evento);  -- índice de la llave foránea
CREATE INDEX ix_tokens_usuario_tipo_usado ON tokens_usuario (id_usuario, tipo, usado);
CREATE INDEX ix_bitacora_fecha ON bitacora (fecha DESC);
CREATE INDEX ix_bitacora_usuario ON bitacora (id_usuario);
CREATE INDEX ix_solicitudes_estado_fecha ON solicitudes_soporte (estado, fecha_creacion);
CREATE INDEX ix_solicitudes_usuario ON solicitudes_soporte (id_usuario);  -- índice de la llave foránea
