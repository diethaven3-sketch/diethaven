import { Controller, Get } from "@nestjs/common";
import { Role } from "database";
import { Roles } from "../common/decorators/roles.decorator";
import { StatsService } from "./stats.service";

@Controller("admin/stats")
@Roles(Role.ADMIN)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  get() {
    return this.statsService.getStats();
  }
}
