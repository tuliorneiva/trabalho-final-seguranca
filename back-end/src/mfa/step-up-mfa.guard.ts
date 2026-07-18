import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity'
import { CryptoService } from '../common/crypto/crypto.service'
import { TotpService } from './totp.service'

@Injectable()
export class StepUpMfaGuard implements CanActivate {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly crypto: CryptoService,
    private readonly totp: TotpService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const user: User = req.user // já preenchido pelo JwtAuthGuard
    const code = req.headers['x-mfa-code'] as string | undefined

    if (!code) {
      throw new UnauthorizedException({ code: 'MFA_REQUIRED', message: 'Código MFA obrigatório.' })
    }
    if (!user.isMfaEnabled || !user.totpSecret) {
      throw new UnauthorizedException({
        code: 'MFA_REQUIRED',
        message: 'Ative o MFA antes de executar ações críticas.',
      })
    }

    const secret = this.crypto.decrypt(user.totpSecret)
    const timeStep = this.totp.verify(secret, code, user.lastTotpStep)
    if (timeStep === null) {
      throw new UnauthorizedException({ code: 'MFA_INVALID', message: 'Código MFA inválido.' })
    }

    user.lastTotpStep = timeStep
    await this.users.save(user)
    return true
  }
}
