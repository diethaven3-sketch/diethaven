import { Module } from "@nestjs/common";
import { DietitianController } from "./dietitian.controller";
import { DietitianService } from "./dietitian.service";

@Module({
  controllers: [DietitianController],
  providers: [DietitianService],
})
export class DietitianModule {}
