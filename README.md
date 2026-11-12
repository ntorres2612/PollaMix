# GolPro

Pronósticos y resultados de fútbol. El producto se llamaba PollaMix; el código visible y esta carpeta usan el nombre GolPro.

## Arranque local

Frontend, en el puerto 3000:

```bash
cd frontend
npm install
npm run dev
```

Backend, en el puerto 3001:

```bash
cd backend
npm install
npm run start:dev
```

El backend exige `JWT_SECRET`. También usa `DATABASE_URL`, `FRONTEND_URL` y, si hay recuperación de contraseña, la configuración SMTP. La infraestructura de PRD y QA está descrita en `deploy/README.md`.

Las variables `POLLAMIX_*` y el namespace de sesión `pollamix-session-v1` se conservan a propósito: las primeras ya están en el despliegue y el segundo invalida los tokens activos si cambia.
