# GolPro — Infraestructura

## Entornos

PRD:
- PostgreSQL 17
- Base: golpro_prd
- Usuario: golpro_prd_user

QA:
- PostgreSQL 17
- Base: golpro_qa
- Usuario: golpro_qa_user

## Seguridad

- Contraseñas distintas para PRD y QA.
- Sin puertos PostgreSQL publicados.
- Volúmenes persistentes separados.
- Redes privadas independientes.
- No incluir secretos en Git.
- No copiar datos QA automáticamente a PRD.
- No ejecutar migraciones sin verificar el destino.

## Estado

Esta configuración es preparatoria.

Todavía faltan:
- Dockerfiles de frontend y backend.
- Conexión segura de cada API a su red privada.
- Configuración de secretos y HTTPS.
- Respaldos externos y pruebas de restauración.
- Configuración de despliegue y supervisión.
- Pruebas de integridad y autorización.

No ejecutar los servicios hasta completar su configuración.
