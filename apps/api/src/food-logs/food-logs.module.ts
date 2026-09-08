import { Module } from "@nestjs/common";
import { FoodLogsController, PatientFoodLogsController } from "./food-logs.controller";
import { FoodLogsService } from "./food-logs.service";

@Module({
  controllers: [FoodLogsController, PatientFoodLogsController],
  providers: [FoodLogsService],
})
export class FoodLogsModule {}
