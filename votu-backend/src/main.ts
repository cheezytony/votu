import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createApp } from './create-app.js';

async function bootstrap(): Promise<void> {
  const app = await createApp();

  const port = process.env['PORT'] ?? 3000;

  // Swagger UI — available at /api/docs (non-production only)
  if (process.env['NODE_ENV'] !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Votu API')
      .setDescription(
        'Votu voting platform REST API.\n\n' +
          '**Auth flow:**\n' +
          '1. `POST /auth/register` or `POST /auth/login` → copy the `accessToken` from the response\n' +
          '2. Click **Authorize** → paste the token (without "Bearer " prefix)\n' +
          '3. The refresh token is handled automatically via httpOnly cookie — Swagger cannot set it manually; use the `/auth/refresh` endpoint only from the browser or a cookie-aware client',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste your accessToken here',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  await app.listen(port);
  console.log(`Application running on port ${String(port)}`);
  if (process.env['NODE_ENV'] !== 'production') {
    console.log(`Swagger docs: http://localhost:${String(port)}/api/docs`);
  }
}

void bootstrap();
