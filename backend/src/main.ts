import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  SwaggerModule,
  DocumentBuilder,
} from '@nestjs/swagger';

async function bootstrap() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret || !jwtSecret.trim()) {
    throw new Error(
      'JWT_SECRET es obligatorio para iniciar PollaMix.',
    );
  }

  const app = await NestFactory.create(AppModule);

  // --------------------------------------------------
  // CORS
  // --------------------------------------------------

  app.enableCors({
    origin:
      process.env.FRONTEND_URL ||
      'http://localhost:3000',
    methods: [
      'GET',
      'HEAD',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
    credentials: true,
  });

  // --------------------------------------------------
  // Swagger
  // --------------------------------------------------

  if (process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('PollaMix API')
      .setDescription('API oficial de PollaMix')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(
      app,
      config,
    );

    SwaggerModule.setup(
      'api',
      app,
      document,
    );
  }

  // --------------------------------------------------
  // Servidor
  // --------------------------------------------------

  const port = Number(process.env.PORT || 3001);

  await app.listen(port);

  Logger.log(
    `Backend iniciado en el puerto ${port}`,
  );
}

bootstrap();