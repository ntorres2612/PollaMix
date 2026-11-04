-- Registrar aceptación del reglamento por usuario.
ALTER TABLE "User"
  ADD COLUMN "rulesAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "rulesVersion" TEXT;
