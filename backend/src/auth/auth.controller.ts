import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthDto } from './auth.dto';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: AuthDto) {
    return this.authService.login(body);
  }

  // Local-only demo helper. It is intentionally simple and exists only for
  // resetting the presentation users in DynamoDB Local.
  @Post('demo-reset-password')
  demoResetPassword(@Body() body: any) {
    return this.authService.demoResetPassword(body);
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  updateMe(@Req() req: any, @Body() body: any) {
    return this.authService.updateProfile(req.user.profile_id, body);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return req.user;
  }
}
