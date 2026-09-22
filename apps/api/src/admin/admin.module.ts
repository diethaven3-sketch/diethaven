import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { FoodExchangeController } from "./food-exchange.controller";
import { FoodExchangeReadController } from "./food-exchange-read.controller";
import { FoodExchangeService } from "./food-exchange.service";
import { AuditLogController } from "./audit-log.controller";
import { AuditLogService } from "./audit-log.service";
import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

@Module({
  controllers: [
    AdminController,
    FoodExchangeController,
    FoodExchangeReadController,
    AuditLogController,
    StatsController,
  ],
  providers: [AdminService, FoodExchangeService, AuditLogService, StatsService],
})
export class AdminModule {}
