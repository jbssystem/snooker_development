import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './common/filters/http-error.filter';

// Photo → ball-map sends a base64-encoded JPEG, which easily exceeds Express's
// default 100 KB JSON body limit. The large cap (aligned to
// RecognizeLayoutInputSchema's ~12 MB image bound) applies ONLY to that route;
// every other endpoint keeps a small limit so oversized payloads are rejected
// before they allocate memory.
const DEFAULT_BODY_LIMIT = '256kb';
const RECOGNIZE_BODY_LIMIT = '15mb';
const RECOGNIZE_LAYOUT_PATH = '/drill-templates/recognize-layout';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  // Express keeps the first parsed body (req.body) and the later parser skips
  // an already-parsed request, so the route-scoped parser must come first.
  app.use(RECOGNIZE_LAYOUT_PATH, json({ limit: RECOGNIZE_BODY_LIMIT }));
  app.use(json({ limit: DEFAULT_BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: DEFAULT_BODY_LIMIT }));
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  if (isProduction) {
    const express = app.getHttpAdapter().getInstance() as { set?: (name: string, value: unknown) => void };
    express.set?.('trust proxy', 1);
  }
  app.use(securityHeaders(configService));
  app.enableCors({ origin: corsOrigins(configService), credentials: true });
  app.useGlobalFilters(new HttpErrorFilter());

  // Swagger is a development aid: in production it would hand an attacker the
  // full API surface, so it is only mounted outside production.
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Snooker Player OS API')
      .setDescription('REST API for the Snooker Player Development OS')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(`[api] listening on :${port}`);
}

function securityHeaders(configService: ConfigService) {
  return (_req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'",
    );
    if (configService.get<string>('NODE_ENV') === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}

function corsOrigins(configService: ConfigService): string[] | false {
  const configured = configService.get<string>('CORS_ORIGINS');
  if (configured) {
    return configured
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  return configService.get<string>('NODE_ENV') === 'production'
    ? false
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];
}

void bootstrap();
