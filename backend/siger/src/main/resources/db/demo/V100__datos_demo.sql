-- =====================================================================
-- SIGER · Flyway V100 · Datos de demostración (T-03-03) · SOLO perfil dev
-- application-dev.yml agrega classpath:db/demo a spring.flyway.locations; test y prod no la cargan.
--
-- Usuarios (contraseña de todos: Demo#2026):
--   organizador.ana@siger.test, organizador.carlos@siger.test   (Organizador, Activo)
--   participante01@siger.test … participante10@siger.test        (Participante; el 10 está Inactivo)
-- El administrador no está aquí: lo crea DataInitializer con siger.admin.* (admin@siger.test / Admin#2026 en dev).
-- Las fechas son relativas al momento en que se aplica la migración, para que los eventos Publicados
-- queden en el futuro y los Finalizados en el pasado.
-- =====================================================================

-- Categoría inactiva de ejemplo (como en el prototipo siger_categorias_admin)
INSERT INTO categorias (nombre, activa) VALUES ('Deportes', false);

-- ---------------------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------------------
INSERT INTO usuarios (nombres, apellidos, correo_electronico, contrasena_hash, fecha_nacimiento, rol, estado_cuenta, correo_verificado, fecha_registro)
SELECT v.nombres, v.apellidos, v.correo, '$2a$10$hz5nYRDRix0n252HQuQSeu79YTIrUgBrBigmyyLy09d6aYq1FXO8K',
       v.nacimiento::date, v.rol, v.estado, true, now() - interval '60 days'
FROM (VALUES
    ('Ana María',  'López Rivera',     'organizador.ana@siger.test',    '1990-04-12', 'Organizador',  'Activo'),
    ('Carlos José','Martínez Pineda',  'organizador.carlos@siger.test', '1987-09-03', 'Organizador',  'Activo'),
    ('Lucía',      'Martínez Flores',  'participante01@siger.test',     '2002-01-15', 'Participante', 'Activo'),
    ('José',       'Hernández Cruz',   'participante02@siger.test',     '2001-06-22', 'Participante', 'Activo'),
    ('Sofía',      'Ramírez Ayala',    'participante03@siger.test',     '2003-03-08', 'Participante', 'Activo'),
    ('Diego',      'Castillo Mejía',   'participante04@siger.test',     '2000-11-30', 'Participante', 'Activo'),
    ('Valeria',    'Gómez Portillo',   'participante05@siger.test',     '2002-08-19', 'Participante', 'Activo'),
    ('Mateo',      'Rivas Alvarado',   'participante06@siger.test',     '1999-12-05', 'Participante', 'Activo'),
    ('Camila',     'Orellana Díaz',    'participante07@siger.test',     '2004-02-27', 'Participante', 'Activo'),
    ('Andrés',     'Molina Guevara',   'participante08@siger.test',     '2001-10-10', 'Participante', 'Activo'),
    ('Gabriela',   'Henríquez Lara',   'participante09@siger.test',     '2003-05-14', 'Participante', 'Activo'),
    ('Fernando',   'Aguilar Menjívar', 'participante10@siger.test',     '1998-07-01', 'Participante', 'Inactivo')
) AS v(nombres, apellidos, correo, nacimiento, rol, estado);

-- ---------------------------------------------------------------------
-- Eventos: 4 Publicados, 1 Borrador, 1 Cancelado y 2 Finalizados
-- ---------------------------------------------------------------------
INSERT INTO eventos (nombre_evento, descripcion, id_categoria, fecha_hora_inicio, fecha_hora_fin, fecha_limite_reserva,
                     ubicacion, cupo_maximo, cupo_disponible, max_acompanantes, precio, requiere_qr, estado_evento,
                     motivo_cancelacion, id_organizador, fecha_creacion, fecha_actualizacion)
SELECT v.nombre, v.descripcion, c.id_categoria,
       date_trunc('hour', now()) + v.inicio,
       date_trunc('hour', now()) + v.inicio + v.duracion,
       date_trunc('hour', now()) + v.inicio - interval '1 day',
       v.ubicacion, v.cupo, v.cupo, v.acompanantes, v.precio, true, v.estado, v.motivo, u.id_usuario,
       now() - interval '45 days', now() - interval '45 days'
FROM (VALUES
    ('Congreso de Innovación Tecnológica 2026', 'Ponencias sobre inteligencia artificial, nube y desarrollo de software con invitados de la industria.',
        'Tecnología', interval '20 days', interval '8 hours', 'Auditorio Central, Ciudad Universitaria', 150, 2, 0.00, 'Publicado', NULL, 'organizador.ana@siger.test'),
    ('Taller de Spring Boot desde cero', 'Taller práctico: API REST con Java 21, Spring Boot y PostgreSQL. Llevar computadora.',
        'Taller', interval '7 days', interval '4 hours', 'Laboratorio 3, Escuela de Ingeniería de Sistemas', 25, 0, 10.00, 'Publicado', NULL, 'organizador.carlos@siger.test'),
    ('Feria de Emprendimiento Universitario', 'Exhibición de proyectos de emprendimiento estudiantil y charlas con inversionistas.',
        'Negocios', interval '14 days', interval '6 hours', 'Plaza Central, Ciudad Universitaria', 80, 1, 0.00, 'Publicado', NULL, 'organizador.ana@siger.test'),
    ('Exposición de Arte Digital', 'Muestra de ilustración, animación y arte generativo. Cupo limitado por recorrido guiado.',
        'Arte', interval '3 days', interval '2 hours', 'Sala de Exposiciones, Facultad de Artes', 5, 0, 3.00, 'Publicado', NULL, 'organizador.carlos@siger.test'),
    ('Noche de Integración Estudiantil', 'Actividad social de bienvenida para estudiantes de nuevo ingreso.',
        'Social', interval '30 days', interval '4 hours', 'Cafetería Central', 60, 1, 0.00, 'Borrador', NULL, 'organizador.ana@siger.test'),
    ('Conferencia de Ciberseguridad', 'Buenas prácticas de seguridad en aplicaciones web y gestión de incidentes.',
        'Conferencia', interval '10 days', interval '3 hours', 'Auditorio de Ingeniería', 100, 0, 0.00, 'Cancelado', 'El ponente principal no podrá asistir; se reprogramará más adelante.', 'organizador.carlos@siger.test'),
    ('Hackathon UES 2026', 'Competencia de 24 horas para resolver retos de la comunidad universitaria.',
        'Tecnología', interval '-20 days', interval '24 hours', 'Edificio de Ingeniería en Sistemas', 40, 0, 0.00, 'Finalizado', NULL, 'organizador.ana@siger.test'),
    ('Taller de Diseño UX', 'Investigación con usuarios, prototipos y pruebas de usabilidad.',
        'Taller', interval '-5 days', interval '3 hours', 'Laboratorio 1, Escuela de Ingeniería de Sistemas', 20, 0, 5.00, 'Finalizado', NULL, 'organizador.carlos@siger.test')
) AS v(nombre, descripcion, categoria, inicio, duracion, ubicacion, cupo, acompanantes, precio, estado, motivo, organizador)
JOIN categorias c ON c.nombre = v.categoria
JOIN usuarios u ON u.correo_electronico = v.organizador;

-- ---------------------------------------------------------------------
-- Reservaciones
-- ---------------------------------------------------------------------
INSERT INTO reservaciones (id_evento, id_participante, cantidad_acompanantes, observaciones, monto, codigo_comprobante,
                           estado_reservacion, fecha_reservacion, fecha_cancelacion)
SELECT e.id_evento, u.id_usuario, v.acompanantes, v.observaciones, e.precio * (1 + v.acompanantes),
       md5('siger-demo-' || e.nombre_evento || '-' || u.correo_electronico),
       v.estado,
       e.fecha_limite_reserva - interval '7 days',
       CASE WHEN v.estado = 'Cancelada' THEN e.fecha_limite_reserva - interval '6 days' END
FROM (VALUES
    ('Congreso de Innovación Tecnológica 2026', 'participante01@siger.test', 0, NULL, 'Confirmada'),
    ('Congreso de Innovación Tecnológica 2026', 'participante02@siger.test', 1, 'Asisto con un compañero de trabajo.', 'Confirmada'),
    ('Congreso de Innovación Tecnológica 2026', 'participante03@siger.test', 0, NULL, 'Confirmada'),
    ('Congreso de Innovación Tecnológica 2026', 'participante04@siger.test', 0, NULL, 'Confirmada'),
    ('Congreso de Innovación Tecnológica 2026', 'participante05@siger.test', 0, NULL, 'Confirmada'),
    ('Congreso de Innovación Tecnológica 2026', 'participante06@siger.test', 0, NULL, 'Confirmada'),
    ('Congreso de Innovación Tecnológica 2026', 'participante07@siger.test', 0, NULL, 'Cancelada'),
    ('Taller de Spring Boot desde cero',        'participante01@siger.test', 0, NULL, 'Confirmada'),
    ('Taller de Spring Boot desde cero',        'participante03@siger.test', 0, 'Uso silla de ruedas.', 'Confirmada'),
    ('Taller de Spring Boot desde cero',        'participante05@siger.test', 0, NULL, 'Confirmada'),
    ('Feria de Emprendimiento Universitario',   'participante02@siger.test', 0, NULL, 'Confirmada'),
    ('Feria de Emprendimiento Universitario',   'participante04@siger.test', 1, NULL, 'Confirmada'),
    ('Exposición de Arte Digital',              'participante05@siger.test', 0, NULL, 'Confirmada'),
    ('Exposición de Arte Digital',              'participante06@siger.test', 0, NULL, 'Confirmada'),
    ('Exposición de Arte Digital',              'participante07@siger.test', 0, NULL, 'Confirmada'),
    ('Exposición de Arte Digital',              'participante08@siger.test', 0, NULL, 'Confirmada'),
    ('Exposición de Arte Digital',              'participante09@siger.test', 0, NULL, 'Confirmada'),
    ('Conferencia de Ciberseguridad',           'participante01@siger.test', 0, NULL, 'Cancelada'),
    ('Conferencia de Ciberseguridad',           'participante02@siger.test', 0, NULL, 'Cancelada'),
    ('Hackathon UES 2026',                      'participante01@siger.test', 0, NULL, 'Confirmada'),
    ('Hackathon UES 2026',                      'participante02@siger.test', 0, NULL, 'Confirmada'),
    ('Hackathon UES 2026',                      'participante03@siger.test', 0, NULL, 'Confirmada'),
    ('Hackathon UES 2026',                      'participante04@siger.test', 0, NULL, 'Confirmada'),
    ('Hackathon UES 2026',                      'participante05@siger.test', 0, NULL, 'Confirmada'),
    ('Hackathon UES 2026',                      'participante06@siger.test', 0, NULL, 'Confirmada'),
    ('Hackathon UES 2026',                      'participante07@siger.test', 0, NULL, 'Confirmada'),
    ('Hackathon UES 2026',                      'participante08@siger.test', 0, NULL, 'Confirmada'),
    ('Taller de Diseño UX',                     'participante03@siger.test', 0, NULL, 'Confirmada'),
    ('Taller de Diseño UX',                     'participante04@siger.test', 0, NULL, 'Confirmada'),
    ('Taller de Diseño UX',                     'participante05@siger.test', 0, NULL, 'Confirmada'),
    ('Taller de Diseño UX',                     'participante06@siger.test', 0, NULL, 'Confirmada'),
    ('Taller de Diseño UX',                     'participante07@siger.test', 0, NULL, 'Confirmada')
) AS v(evento, correo, acompanantes, observaciones, estado)
JOIN eventos e ON e.nombre_evento = v.evento
JOIN usuarios u ON u.correo_electronico = v.correo;

-- Cupo disponible = cupo máximo − (participantes + acompañantes de las reservaciones confirmadas)
UPDATE eventos e
SET cupo_disponible = e.cupo_maximo - COALESCE((
        SELECT sum(1 + r.cantidad_acompanantes) FROM reservaciones r
        WHERE r.id_evento = e.id_evento AND r.estado_reservacion = 'Confirmada'), 0);

-- ---------------------------------------------------------------------
-- Asistencias de los eventos finalizados (una anulada por error, RN-15)
-- ---------------------------------------------------------------------
INSERT INTO asistencias (id_reservacion, fecha_hora_validacion, metodo_validacion, id_registrado_por, anulada, fecha_anulacion, id_anulada_por)
SELECT r.id_reservacion, e.fecha_hora_inicio + v.minutos * interval '1 minute', v.metodo, e.id_organizador,
       v.anulada,
       CASE WHEN v.anulada THEN e.fecha_hora_inicio + interval '1 hour' END,
       CASE WHEN v.anulada THEN e.id_organizador END
FROM (VALUES
    ('Hackathon UES 2026',  'participante01@siger.test', 'QR_Scanner',          5, false),
    ('Hackathon UES 2026',  'participante02@siger.test', 'QR_Scanner',          7, false),
    ('Hackathon UES 2026',  'participante03@siger.test', 'QR_Scanner',          9, false),
    ('Hackathon UES 2026',  'participante04@siger.test', 'Digital_Code',       12, false),
    ('Hackathon UES 2026',  'participante05@siger.test', 'QR_Scanner',         15, false),
    ('Hackathon UES 2026',  'participante06@siger.test', 'QR_Scanner',         18, false),
    ('Hackathon UES 2026',  'participante07@siger.test', 'Manual_Organizador', 25, false),
    ('Taller de Diseño UX', 'participante03@siger.test', 'QR_Scanner',          3, false),
    ('Taller de Diseño UX', 'participante04@siger.test', 'QR_Scanner',          6, false),
    ('Taller de Diseño UX', 'participante05@siger.test', 'Digital_Code',        8, false),
    ('Taller de Diseño UX', 'participante06@siger.test', 'Manual_Organizador', 10, true)
) AS v(evento, correo, metodo, minutos, anulada)
JOIN eventos e ON e.nombre_evento = v.evento
JOIN usuarios u ON u.correo_electronico = v.correo
JOIN reservaciones r ON r.id_evento = e.id_evento AND r.id_participante = u.id_usuario;

-- ---------------------------------------------------------------------
-- Notificaciones, bitácora y soporte
-- ---------------------------------------------------------------------
INSERT INTO notificaciones (id_usuario, id_evento, tipo_notificacion, asunto, mensaje_contenido, estado_envio, intentos_envio, leida, fecha_creacion, fecha_envio)
SELECT u.id_usuario, e.id_evento, v.tipo, v.asunto, v.mensaje, v.envio, v.intentos, v.leida,
       now() - v.hace, CASE WHEN v.envio = 'Enviado' THEN now() - v.hace END
FROM (VALUES
    ('participante01@siger.test', 'Congreso de Innovación Tecnológica 2026', 'Confirmacion_Reserva', 'Reservación confirmada',
        'Tu reservación para el Congreso de Innovación Tecnológica 2026 está confirmada. Presenta tu código QR en la entrada.', 'Enviado', 1, false, interval '13 days'),
    ('participante01@siger.test', 'Conferencia de Ciberseguridad', 'Cancelacion_Evento', 'Evento cancelado',
        'La Conferencia de Ciberseguridad fue cancelada: el ponente principal no podrá asistir.', 'Enviado', 1, true, interval '2 days'),
    ('participante02@siger.test', 'Conferencia de Ciberseguridad', 'Cancelacion_Evento', 'Evento cancelado',
        'La Conferencia de Ciberseguridad fue cancelada: el ponente principal no podrá asistir.', 'Enviado', 1, false, interval '2 days'),
    ('participante03@siger.test', 'Taller de Spring Boot desde cero', 'Recordatorio', 'Tu evento es pronto',
        'Recuerda: el Taller de Spring Boot desde cero comienza en una semana.', 'Pendiente', 0, false, interval '1 hour'),
    ('participante08@siger.test', 'Exposición de Arte Digital', 'Confirmacion_Reserva', 'Reservación confirmada',
        'Tu reservación para la Exposición de Arte Digital está confirmada.', 'Fallido', 3, false, interval '5 days')
) AS v(correo, evento, tipo, asunto, mensaje, envio, intentos, leida, hace)
JOIN usuarios u ON u.correo_electronico = v.correo
JOIN eventos e ON e.nombre_evento = v.evento;

INSERT INTO bitacora (id_usuario, accion, entidad, id_entidad, detalle, ip, fecha)
SELECT e.id_organizador, 'CANCELAR_EVENTO', 'eventos', e.id_evento,
       jsonb_build_object('motivo', e.motivo_cancelacion, 'reservaciones_canceladas', 2), '127.0.0.1', now() - interval '2 days'
FROM eventos e WHERE e.nombre_evento = 'Conferencia de Ciberseguridad';

INSERT INTO bitacora (id_usuario, accion, entidad, id_entidad, detalle, ip, fecha)
SELECT a.id_anulada_por, 'DESHACER_ASISTENCIA', 'asistencias', a.id_asistencia,
       jsonb_build_object('motivo', 'Registrada por error'), '127.0.0.1', a.fecha_anulacion
FROM asistencias a WHERE a.anulada;

INSERT INTO solicitudes_soporte (id_usuario, correo_contacto, tipo, descripcion, estado, fecha_creacion)
SELECT u.id_usuario, u.correo_electronico, 'Consulta',
       'No encuentro dónde descargar el comprobante de mi reservación.', 'Abierta', now() - interval '1 day'
FROM usuarios u WHERE u.correo_electronico = 'participante03@siger.test';

INSERT INTO solicitudes_soporte (correo_contacto, tipo, descripcion, estado, fecha_creacion)
VALUES ('visitante@example.com', 'Acceso', 'No me llegó el correo de verificación de la cuenta.', 'En_Proceso', now() - interval '3 days');
