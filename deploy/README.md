# GolPro en la VPS

Un servidor, dos sitios y dos bases. QA se prueba primero. Producción usa la misma versión cuando QA ya está bien. Las bases no se copian entre sí y la base local no se sube.

## Qué queda encendido

- El API de fútbol consulta resultados cada 10 minutos en QA y en producción. La clave va en `deploy/.env` del servidor.
- El cierre oficial de premios sigue apagado.
- El abono de prueba de 100 pesos no vale en el servidor. Allá solo cuenta el valor de la inscripción.

## Antes de arrancar

En el panel del VPS: Ubuntu 24.04, Monarx y copias diarias. No actives el Docker Manager de Hostinger.

El dominio y `qa.` de ese dominio apuntan con un registro A a la IP de la VPS.

En el servidor:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker "$USER"
```

Cierra la sesión y vuelve a entrar para que el grupo de Docker aplique.

## Secretos

```bash
cd deploy
cp .env.runtime.example .env
chmod 600 .env
```

Completa `.env` en el servidor. No lo subas a Git y no copies el `.env` de tu computador: trae la base local, usuarios de prueba y el abono de 100 pesos.

Ahí van las claves nuevas de las dos bases, dos `JWT_SECRET` distintos, la clave del API de fútbol, la clave SMTP de `contacto@totalgol.tech` y, cuando el cliente de Google esté creado, el ID y el secreto. En Google, el cliente es una aplicación web y las dos direcciones de retorno son las de `PRD_GOOGLE_REDIRECT_URI` y `QA_GOOGLE_REDIRECT_URI`.

## Arranque

Desde `deploy`, con el código actual del proyecto:

```bash
docker compose --env-file .env \
  -f compose.db.yml \
  -f compose.apps.yml \
  -f compose.proxy.yml \
  up -d --build
```

El backend aplica las migraciones al iniciar. Caddy pide el certificado HTTPS cuando el dominio ya resuelve a esta máquina.

Crea el primer usuario desde la web de QA y promuévelo una sola vez:

```bash
docker compose --env-file .env -f compose.db.yml exec postgres-qa \
  psql -U golpro_qa_user -d golpro_qa \
  -c "UPDATE \"User\" SET role = 'ADMIN' WHERE id = 1;"
```

Repite ese paso en `postgres-prd` y `golpro_prd` solo cuando pases a producción, con el usuario que se registre allá. No copies jugadores ni pollas de QA.

## Copia de la base

```bash
./scripts/backup-db.sh qa
./scripts/backup-db.sh prd
```
