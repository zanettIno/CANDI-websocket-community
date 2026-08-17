import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Token não encontrado');

    try {
      const token = header.slice(7);
      const payload = await this.jwtService.verifyAsync<{ id: string; email: string }>(token, {
        secret: process.env.ACCESS_TOKEN_SECRET || 'demo_access_secret_change_me',
      });
      request.user = await this.authService.getProfile(payload.id);
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
