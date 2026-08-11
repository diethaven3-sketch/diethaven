import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "database";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Don't let a down/misconfigured DB crash the whole app at boot — let
    // individual queries (e.g. the /health check) fail and report instead.
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error("Failed to connect to the database", error instanceof Error ? error.stack : error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
