import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  SwaggerModule,
  DocumentBuilder,
} from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --------------------------------------------------
  // CORS
  // --------------------------------------------------

  app.enableCors({
    origin: 'http://localhost:3000',
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

  // --------------------------------------------------
  // Servidor
  // --------------------------------------------------

  await app.listen(3001);

  Logger.log(
    'Backend iniciado en http://localhost:3001',
  );
}

bootstrap();