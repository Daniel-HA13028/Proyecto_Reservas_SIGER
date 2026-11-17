#!/bin/sh
# Respaldo diario de SIGER en el servidor (RNF-05, T-03-04).
# Ejecuta pg_dump en el contenedor de PostgreSQL, guarda el archivo comprimido en $DESTINO,
# comprueba que se puede leer y borra los respaldos con más de $DIAS días.
#
# Programarlo todos los días a las 02:00 con cron (crontab -e):
#   0 2 * * * /opt/siger/database/scripts/respaldo.sh >> /var/log/siger-respaldo.log 2>&1
set -eu

CONTENEDOR="${CONTENEDOR:-siger-postgres}"
BASE="${BASE:-siger}"
USUARIO="${USUARIO:-siger}"
DESTINO="${DESTINO:-/var/backups/siger}"
DIAS="${DIAS:-14}"

mkdir -p "$DESTINO"
NOMBRE="${BASE}_$(date +%Y%m%d_%H%M%S).dump"

docker exec "$CONTENEDOR" pg_dump -U "$USUARIO" -d "$BASE" -Fc --no-owner -f "/tmp/$NOMBRE"
docker cp "$CONTENEDOR:/tmp/$NOMBRE" "$DESTINO/$NOMBRE"
docker exec "$CONTENEDOR" pg_restore --list "/tmp/$NOMBRE" > /dev/null
docker exec "$CONTENEDOR" rm -f "/tmp/$NOMBRE"
chmod 600 "$DESTINO/$NOMBRE"

echo "$(date '+%F %T') respaldo creado: $DESTINO/$NOMBRE ($(du -h "$DESTINO/$NOMBRE" | cut -f1))"
find "$DESTINO" -name "${BASE}_*.dump" -type f -mtime +"$DIAS" -print -delete
