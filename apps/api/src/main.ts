import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { parseWebOrigins } from "./web-origin";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = parseWebOrigins(process.env.WEB_ORIGIN);
  app.enableCors({ origin: origins, credentials: true });
  new Logger("Bootstrap").log(`CORS allowed origins: ${origins.join(", ")}`);
  const port = process.env.PORT ?? 4000;
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
