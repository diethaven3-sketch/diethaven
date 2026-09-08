import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health/health.controller";
import { AuthModule } from "./auth/auth.module";
import { AuditModule } from "./audit/audit.module";
import { AdminModule } from "./admin/admin.module";
import { DietitianModule } from "./dietitian/dietitian.module";
import { InvitesModule } from "./invites/invites.module";
import { AssessmentsModule } from "./assessments/assessments.module";
import { DiagnosesModule } from "./diagnoses/diagnoses.module";
import { InterventionsModule } from "./interventions/interventions.module";
import { FollowUpsModule } from "./follow-ups/follow-ups.module";
import { PatientModule } from "./patient/patient.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";

@Module({
  imports: [
    // Looks for .env in apps/api first, then falls back to the repo root .env.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    AdminModule,
    DietitianModule,
    InvitesModule,
    AssessmentsModule,
    DiagnosesModule,
    InterventionsModule,
    FollowUpsModule,
    PatientModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
