import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    // First attempt the standard JWT AuthGuard
    try {
      const result = await super.canActivate(context);
      if (result) {
        return true;
      }
    } catch (error) {
      // If the standard guard fails, use our custom logic
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user to request
      request.user = payload;
      return true;
    } catch (error) {
      console.error('Token verification error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
}
