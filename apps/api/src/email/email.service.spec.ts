import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";

describe("EmailService", () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === "EMAIL_FROM") return "DietHaven Consult <onboarding@resend.dev>";
              if (key === "RESEND_API_KEY") return undefined;
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should gracefully handle simulated sending when no API key is provided", async () => {
    const result = await service.sendOtp({ to: "test@example.com", code: "123456" });
    expect(result.success).toBe(true);
  });

  it("should generate valid patient invite and password reset templates", async () => {
    const inviteResult = await service.sendPatientInvite({
      to: "patient@example.com",
      dietitianName: "Dr. Jane Doe",
      inviteUrl: "http://localhost:3000/invites/sample-token",
    });
    expect(inviteResult.success).toBe(true);

    const resetResult = await service.sendPasswordReset({
      to: "user@example.com",
      code: "654321",
    });
    expect(resetResult.success).toBe(true);
  });
});
