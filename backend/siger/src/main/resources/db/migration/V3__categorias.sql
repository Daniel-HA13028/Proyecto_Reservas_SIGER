-- =====================================================================
-- SIGER · Flyway V3 · T-03-03
-- Categorías iniciales de los eventos (RF-26), las activas del prototipo siger_categorias_admin.
-- Se cargan en todos los entornos; el administrador puede renombrarlas, desactivarlas o crear otras.
-- =====================================================================

INSERT INTO categorias (nombre) VALUES
    ('Tecnología'),
    ('Negocios'),
    ('Arte'),
    ('Social'),
    ('Conferencia'),
    ('Taller');
