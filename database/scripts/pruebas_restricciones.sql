-- SIGER · Pruebas de las restricciones de la base de datos (T-03-05).
-- Origen: avances/fase_1/ERD/SIGER_pruebas_esquema.sql (T-01-01), adaptado al esquema de Flyway (V1 a V3).
-- Ejecutar con database/scripts/probar_restricciones.ps1, que crea una base temporal con las migraciones,
-- corre este archivo y la borra; no toca la base de desarrollo.
-- Cada prueba informa OK o FALLA; los datos de prueba se descartan al final (ROLLBACK).
\set ON_ERROR_STOP on
\pset footer off

\echo '== 1. Inventario del esquema'
SELECT 'tablas' AS objeto, count(*) AS total FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL SELECT 'campos', count(*) FROM information_schema.columns WHERE table_schema = 'public'
UNION ALL SELECT 'llaves foráneas', count(*) FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace
UNION ALL SELECT 'CHECK', count(*) FROM pg_constraint WHERE contype = 'c' AND connamespace = 'public'::regnamespace
UNION ALL SELECT 'UNIQUE (restricción)', count(*) FROM pg_constraint WHERE contype = 'u' AND connamespace = 'public'::regnamespace
UNION ALL SELECT 'índices (ix_ y uq_ parciales)', count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname ~ '^(ix_|uq_reservaciones_confirmada|uq_asistencias_reservacion_vigente)'
UNION ALL SELECT 'comentarios de columna', count(*) FROM pg_description d JOIN pg_class c ON c.oid = d.objoid WHERE c.relnamespace = 'public'::regnamespace AND d.objsubid > 0;

BEGIN;
\o /dev/null
CREATE TEMP TABLE resultado (n serial, prueba text, esperado text, obtenido text);

CREATE FUNCTION pg_temp.debe_fallar(prueba text, sql text) RETURNS void AS $$
BEGIN
  BEGIN
    EXECUTE sql;
    INSERT INTO resultado (prueba, esperado, obtenido) VALUES (prueba, 'rechazo', 'aceptado');
  EXCEPTION WHEN others THEN
    INSERT INTO resultado (prueba, esperado, obtenido) VALUES (prueba, 'rechazo', 'rechazo (' || SQLSTATE || ')');
  END;
END $$ LANGUAGE plpgsql;

CREATE FUNCTION pg_temp.debe_pasar(prueba text, sql text) RETURNS void AS $$
BEGIN
  BEGIN
    EXECUTE sql;
    INSERT INTO resultado (prueba, esperado, obtenido) VALUES (prueba, 'aceptado', 'aceptado');
  EXCEPTION WHEN others THEN
    INSERT INTO resultado (prueba, esperado, obtenido) VALUES (prueba, 'aceptado', 'rechazo: ' || SQLERRM);
  END;
END $$ LANGUAGE plpgsql;

-- Datos base
INSERT INTO categorias (nombre) VALUES ('Tecnología'), ('Negocios') ON CONFLICT (nombre) DO NOTHING;  -- ya existen por V3
INSERT INTO usuarios (nombres, apellidos, correo_electronico, contrasena_hash, rol) VALUES
  ('Ana', 'Organizadora', 'org@siger.test', 'x', 'Organizador'),
  ('Luis', 'Participante', 'par@siger.test', 'x', 'Participante'),
  ('Eva', 'Admin', 'admin@siger.test', 'x', 'Administrador');
INSERT INTO eventos (nombre_evento, descripcion, id_categoria, fecha_hora_inicio, fecha_hora_fin, fecha_limite_reserva, ubicacion, cupo_maximo, cupo_disponible, estado_evento, id_organizador)
VALUES ('Taller de Spring Boot', 'Práctica', (SELECT id_categoria FROM categorias WHERE nombre = 'Tecnología'), now() + interval '10 days', now() + interval '10 days 2 hours', now() + interval '9 days', 'Auditorio FMOcc', 5, 5, 'Publicado',
        (SELECT id_usuario FROM usuarios WHERE rol = 'Organizador'));

-- Usuarios
SELECT pg_temp.debe_fallar('usuarios: correo duplicado (UNIQUE)', $q$INSERT INTO usuarios (nombres, apellidos, correo_electronico, contrasena_hash, rol) VALUES ('B','B','par@siger.test','x','Participante')$q$);
SELECT pg_temp.debe_fallar('usuarios: correo con mayúsculas (ck_usuarios_correo_minusculas)', $q$INSERT INTO usuarios (nombres, apellidos, correo_electronico, contrasena_hash, rol) VALUES ('B','B','Otro@Siger.test','x','Participante')$q$);
SELECT pg_temp.debe_fallar('usuarios: rol fuera del dominio', $q$INSERT INTO usuarios (nombres, apellidos, correo_electronico, contrasena_hash, rol) VALUES ('B','B','b@siger.test','x','Invitado')$q$);
SELECT pg_temp.debe_fallar('usuarios: estado de cuenta fuera del dominio', $q$UPDATE usuarios SET estado_cuenta = 'Eliminado' WHERE correo_electronico = 'par@siger.test'$q$);
SELECT pg_temp.debe_pasar('usuarios: cuenta nueva queda Activo y sin verificar por defecto', $q$DO $d$ BEGIN IF NOT EXISTS (SELECT 1 FROM usuarios WHERE correo_electronico = 'par@siger.test' AND estado_cuenta = 'Activo' AND correo_verificado = false) THEN RAISE EXCEPTION 'valores por defecto'; END IF; END $d$$q$);
-- Categorías
SELECT pg_temp.debe_fallar('categorias: nombre duplicado (UNIQUE)', $q$INSERT INTO categorias (nombre) VALUES ('Tecnología')$q$);
-- Eventos
SELECT pg_temp.debe_fallar('eventos: fin anterior al inicio', $q$UPDATE eventos SET fecha_hora_fin = fecha_hora_inicio - interval '1 hour'$q$);
SELECT pg_temp.debe_fallar('eventos: fecha límite posterior al inicio', $q$UPDATE eventos SET fecha_limite_reserva = fecha_hora_inicio + interval '1 hour'$q$);
SELECT pg_temp.debe_fallar('eventos: capacidad 0', $q$UPDATE eventos SET cupo_maximo = 0, cupo_disponible = 0$q$);
SELECT pg_temp.debe_fallar('eventos: cupo disponible negativo (RN-01)', $q$UPDATE eventos SET cupo_disponible = -1$q$);
SELECT pg_temp.debe_fallar('eventos: cupo disponible mayor que la capacidad', $q$UPDATE eventos SET cupo_disponible = 6$q$);
SELECT pg_temp.debe_fallar('eventos: precio negativo', $q$UPDATE eventos SET precio = -1$q$);
SELECT pg_temp.debe_fallar('eventos: estado fuera del dominio (Lleno no se guarda)', $q$UPDATE eventos SET estado_evento = 'Lleno'$q$);
SELECT pg_temp.debe_fallar('eventos: cancelar sin motivo (ck_eventos_motivo_cancelacion)', $q$UPDATE eventos SET estado_evento = 'Cancelado'$q$);
SELECT pg_temp.debe_fallar('eventos: categoría inexistente (FK)', $q$UPDATE eventos SET id_categoria = 99$q$);
-- Reservaciones
SELECT pg_temp.debe_pasar('reservaciones: primera reserva confirmada y descuento de cupo', $q$
  INSERT INTO reservaciones (id_evento, id_participante, codigo_comprobante) SELECT e.id_evento, u.id_usuario, 'QR-0001' FROM eventos e, usuarios u WHERE u.rol = 'Participante';
  UPDATE eventos SET cupo_disponible = cupo_disponible - 1 WHERE cupo_disponible >= 1$q$);
SELECT pg_temp.debe_fallar('reservaciones: segunda reserva confirmada del mismo participante (RN-02, índice parcial)', $q$INSERT INTO reservaciones (id_evento, id_participante, codigo_comprobante) SELECT e.id_evento, u.id_usuario, 'QR-0002' FROM eventos e, usuarios u WHERE u.rol = 'Participante'$q$);
SELECT pg_temp.debe_fallar('reservaciones: código de comprobante repetido (I-14)', $q$INSERT INTO reservaciones (id_evento, id_participante, codigo_comprobante) SELECT e.id_evento, u.id_usuario, 'QR-0001' FROM eventos e, usuarios u WHERE u.rol = 'Administrador'$q$);
SELECT pg_temp.debe_fallar('reservaciones: cancelar sin fecha de cancelación', $q$UPDATE reservaciones SET estado_reservacion = 'Cancelada' WHERE codigo_comprobante = 'QR-0001'$q$);
SELECT pg_temp.debe_fallar('reservaciones: acompañantes negativos', $q$UPDATE reservaciones SET cantidad_acompanantes = -1$q$);
-- Asistencias
SELECT pg_temp.debe_pasar('asistencias: primer registro por QR', $q$INSERT INTO asistencias (id_reservacion, metodo_validacion, id_registrado_por) SELECT r.id_reservacion, 'QR_Scanner', e.id_organizador FROM reservaciones r JOIN eventos e USING (id_evento) WHERE r.codigo_comprobante = 'QR-0001'$q$);
SELECT pg_temp.debe_fallar('asistencias: segundo registro de la misma reservación (RN-09)', $q$INSERT INTO asistencias (id_reservacion, metodo_validacion, id_registrado_por) SELECT r.id_reservacion, 'Manual_Organizador', e.id_organizador FROM reservaciones r JOIN eventos e USING (id_evento) WHERE r.codigo_comprobante = 'QR-0001'$q$);
SELECT pg_temp.debe_fallar('asistencias: método fuera del dominio', $q$UPDATE asistencias SET metodo_validacion = 'Foto'$q$);
-- Deshacer sin borrar (RN-15) y volver a registrar (índice único parcial)
SELECT pg_temp.debe_fallar('asistencias: anular sin fecha ni responsable (ck_asistencias_anulacion)', $q$UPDATE asistencias SET anulada = true$q$);
SELECT pg_temp.debe_fallar('asistencias: fecha de anulación sin marcarla como anulada', $q$UPDATE asistencias SET fecha_anulacion = now()$q$);
SELECT pg_temp.debe_pasar('asistencias: deshacer (anulada con fecha y responsable) y volver a registrar la misma reservación', $q$
  UPDATE asistencias SET anulada = true, fecha_anulacion = now(), id_anulada_por = (SELECT id_usuario FROM usuarios WHERE rol = 'Organizador');
  INSERT INTO asistencias (id_reservacion, metodo_validacion, id_registrado_por) SELECT r.id_reservacion, 'Manual_Organizador', e.id_organizador FROM reservaciones r JOIN eventos e USING (id_evento) WHERE r.codigo_comprobante = 'QR-0001';
  DO $d$ BEGIN IF (SELECT count(*) FROM asistencias) <> 2 OR (SELECT count(*) FROM asistencias WHERE NOT anulada) <> 1 THEN RAISE EXCEPTION 'se esperaban 2 filas y 1 vigente'; END IF; END $d$$q$);
SELECT pg_temp.debe_fallar('asistencias: segunda asistencia vigente tras volver a registrar (RN-09)', $q$INSERT INTO asistencias (id_reservacion, metodo_validacion, id_registrado_por) SELECT r.id_reservacion, 'QR_Scanner', e.id_organizador FROM reservaciones r JOIN eventos e USING (id_evento) WHERE r.codigo_comprobante = 'QR-0001'$q$);
-- Cancelar y volver a reservar (el índice parcial solo cuenta las Confirmadas)
SELECT pg_temp.debe_pasar('reservaciones: cancelada con fecha y nueva reserva confirmada del mismo participante', $q$
  UPDATE reservaciones SET estado_reservacion = 'Cancelada', fecha_cancelacion = now() WHERE codigo_comprobante = 'QR-0001';
  INSERT INTO reservaciones (id_evento, id_participante, codigo_comprobante) SELECT e.id_evento, u.id_usuario, 'QR-0003' FROM eventos e, usuarios u WHERE u.rol = 'Participante'$q$);
-- Notificaciones, tokens, soporte
SELECT pg_temp.debe_fallar('notificaciones: tipo fuera del dominio', $q$INSERT INTO notificaciones (id_usuario, tipo_notificacion, asunto, mensaje_contenido) SELECT id_usuario, 'Cambio_Horario', 'a', 'b' FROM usuarios LIMIT 1$q$);
SELECT pg_temp.debe_pasar('notificaciones: nueva notificación queda Pendiente, sin leer y con 0 intentos', $q$INSERT INTO notificaciones (id_usuario, id_evento, tipo_notificacion, asunto, mensaje_contenido) SELECT u.id_usuario, e.id_evento, 'Confirmacion_Reserva', 'Reserva confirmada', 'Texto' FROM usuarios u, eventos e WHERE u.rol = 'Participante';
  DO $d$ BEGIN IF NOT EXISTS (SELECT 1 FROM notificaciones WHERE estado_envio = 'Pendiente' AND leida = false AND intentos_envio = 0 AND fecha_envio IS NULL) THEN RAISE EXCEPTION 'valores por defecto'; END IF; END $d$$q$);
SELECT pg_temp.debe_fallar('tokens_usuario: Cambio_Correo sin el correo nuevo (RF-07)', $q$INSERT INTO tokens_usuario (id_usuario, tipo, token_hash, fecha_expiracion) SELECT id_usuario, 'Cambio_Correo', 'h', now() + interval '1 day' FROM usuarios LIMIT 1$q$);
SELECT pg_temp.debe_fallar('tokens_usuario: correo nuevo con mayúsculas', $q$INSERT INTO tokens_usuario (id_usuario, tipo, token_hash, fecha_expiracion, correo_nuevo) SELECT id_usuario, 'Cambio_Correo', 'h', now() + interval '1 day', 'Nuevo@Correo.test' FROM usuarios LIMIT 1$q$);
SELECT pg_temp.debe_pasar('tokens_usuario: Cambio_Correo con el correo nuevo', $q$INSERT INTO tokens_usuario (id_usuario, tipo, token_hash, fecha_expiracion, correo_nuevo) SELECT id_usuario, 'Cambio_Correo', 'h', now() + interval '1 day', 'nuevo@correo.test' FROM usuarios WHERE rol = 'Participante'$q$);
SELECT pg_temp.debe_fallar('tokens_usuario: sexto intento del código', $q$INSERT INTO tokens_usuario (id_usuario, tipo, token_hash, fecha_expiracion, intentos) SELECT id_usuario, 'Recuperacion_Contrasena', 'h', now() + interval '15 minutes', 6 FROM usuarios LIMIT 1$q$);
SELECT pg_temp.debe_fallar('solicitudes_soporte: tipo fuera del dominio', $q$INSERT INTO solicitudes_soporte (correo_contacto, tipo, descripcion) VALUES ('a@b.c', 'Queja', 'x')$q$);
SELECT pg_temp.debe_pasar('solicitudes_soporte: reporte sin sesión (id_usuario nulo) queda Abierta', $q$INSERT INTO solicitudes_soporte (correo_contacto, tipo, descripcion) VALUES ('visitante@correo.test', 'Consulta', 'No puedo ingresar')$q$);
SELECT pg_temp.debe_pasar('bitacora: detalle JSONB', $q$INSERT INTO bitacora (id_usuario, accion, entidad, id_entidad, detalle, ip) SELECT id_usuario, 'CAMBIO_ESTADO_CUENTA', 'usuarios', id_usuario, '{"antes":"Pendiente","despues":"Activo"}', '127.0.0.1' FROM usuarios WHERE rol = 'Administrador'$q$);
-- Borrados (RN-15: no se borran usuarios con historial; las FK lo impiden)
SELECT pg_temp.debe_fallar('borrado: usuario con eventos (ON DELETE RESTRICT)', $q$DELETE FROM usuarios WHERE rol = 'Organizador'$q$);
SELECT pg_temp.debe_fallar('borrado: evento con reservaciones (ON DELETE RESTRICT)', $q$DELETE FROM eventos$q$);
SELECT pg_temp.debe_fallar('borrado: categoría en uso (ON DELETE RESTRICT)', $q$DELETE FROM categorias WHERE nombre = 'Tecnología'$q$);
SELECT pg_temp.debe_pasar('borrado: tokens se eliminan en cascada con su usuario', $q$
  INSERT INTO usuarios (nombres, apellidos, correo_electronico, contrasena_hash, rol) VALUES ('T','T','temp@siger.test','x','Participante');
  INSERT INTO tokens_usuario (id_usuario, tipo, token_hash, fecha_expiracion) SELECT id_usuario, 'Verificacion_Correo', 'h', now() + interval '1 day' FROM usuarios WHERE correo_electronico = 'temp@siger.test';
  DELETE FROM usuarios WHERE correo_electronico = 'temp@siger.test';
  DO $d$ BEGIN IF EXISTS (SELECT 1 FROM tokens_usuario t LEFT JOIN usuarios u USING (id_usuario) WHERE u.id_usuario IS NULL) THEN RAISE EXCEPTION 'quedaron tokens'; END IF; END $d$$q$);
SELECT pg_temp.debe_pasar('borrado: borrador sin reservaciones deja sus notificaciones con id_evento nulo (SET NULL, I-15)', $q$
  INSERT INTO eventos (nombre_evento, descripcion, id_categoria, fecha_hora_inicio, fecha_hora_fin, fecha_limite_reserva, ubicacion, cupo_maximo, cupo_disponible, id_organizador)
    SELECT 'Borrador', 'x', (SELECT id_categoria FROM categorias WHERE nombre = 'Negocios'), now() + interval '5 days', now() + interval '5 days 1 hour', now() + interval '5 days', 'Sala', 10, 10, id_usuario FROM usuarios WHERE rol = 'Organizador';
  INSERT INTO notificaciones (id_usuario, id_evento, tipo_notificacion, asunto, mensaje_contenido) SELECT e.id_organizador, e.id_evento, 'Cambio_Evento', 'a', 'b' FROM eventos e WHERE e.nombre_evento = 'Borrador';
  DELETE FROM eventos WHERE nombre_evento = 'Borrador';
  DO $d$ BEGIN IF NOT EXISTS (SELECT 1 FROM notificaciones WHERE tipo_notificacion = 'Cambio_Evento' AND id_evento IS NULL) THEN RAISE EXCEPTION 'no quedó en nulo'; END IF; END $d$$q$);

\o
\echo '== 2. Reglas verificadas en la base de datos '
SELECT n AS "#", prueba, esperado, obtenido,
       CASE WHEN obtenido LIKE esperado || '%' THEN 'OK' ELSE 'FALLA' END AS resultado
FROM resultado ORDER BY n;
SELECT count(*) FILTER (WHERE obtenido LIKE esperado || '%') AS ok, count(*) FILTER (WHERE obtenido NOT LIKE esperado || '%') AS fallas, count(*) AS total FROM resultado;
DO $chk$ BEGIN IF EXISTS (SELECT 1 FROM resultado WHERE obtenido NOT LIKE esperado || '%') THEN RAISE EXCEPTION 'Hay pruebas con FALLA'; END IF; END $chk$;

\echo '== 3. Concurrencia del cupo: UPDATE condicional (patrón descontarCupos del plan)'
UPDATE eventos SET cupo_disponible = 1 WHERE nombre_evento = 'Taller de Spring Boot';
WITH u AS (UPDATE eventos SET cupo_disponible = cupo_disponible - 2 WHERE nombre_evento = 'Taller de Spring Boot' AND cupo_disponible >= 2 RETURNING 1)
SELECT count(*) AS filas_afectadas_al_pedir_2_cupos_con_1_libre FROM u;

\echo '== 4. Uso del índice de búsqueda pg_trgm (RF-11)'
SET LOCAL enable_seqscan = off;
EXPLAIN (COSTS OFF) SELECT id_evento FROM eventos WHERE nombre_evento ILIKE '%spring%';
ROLLBACK;
