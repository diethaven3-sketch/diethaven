import { Body, Controller, Get, Patch, Post, UsePipes } from "@nestjs/common";
import {
  changePasswordSchema,
  dietitianRegisterSchema,
  forgotPasswordSchema,
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  patientRegisterSchema,
  resetPasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type DietitianRegisterInput,
  type ForgotPasswordInput,
  type LoginInput,
  type OtpRequestInput,
  type OtpVerifyInput,
  type PatientRegisterInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
} from "@repo/types";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("dietitian/register")
  @UsePipes(new ZodValidationPipe(dietitianRegisterSchema))
  registerDietitian(@Body() dto: DietitianRegisterInput) {
    return this.authService.registerDietitian(dto);
  }

  @Public()
  @Post("patient/register")
  @UsePipes(new ZodValidationPipe(patientRegisterSchema))
  registerPatient(@Body() dto: PatientRegisterInput) {
    return this.authService.registerPatient(dto);
  }

  @Public()
  @Post("login")
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() dto: LoginInput) {
    return this.authService.login(dto);
  }

  @Public()
  @Post("forgot-password")
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  forgotPassword(@Body() dto: ForgotPasswordInput) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post("reset-password")
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  resetPassword(@Body() dto: ResetPasswordInput) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post("otp/request")
  @UsePipes(new ZodValidationPipe(otpRequestSchema))
  requestOtp(@Body() dto: OtpRequestInput) {
    return this.authService.requestOtp(dto);
  }

  @Public()
  @Post("otp/verify")
  @UsePipes(new ZodValidationPipe(otpVerifySchema))
  verifyOtp(@Body() dto: OtpVerifyInput) {
    return this.authService.verifyOtp(dto);
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Get("profile")
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  @Patch("profile")
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileInput,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Post("change-password")
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordInput,
  ) {
    return this.authService.changePassword(user.id, dto);
  }
}
