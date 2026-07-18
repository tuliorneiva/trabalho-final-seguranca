import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity'
import { CryptoService } from '../common/crypto/crypto.service'
import { TotpService } from './totp.service'

@Injectable()
export class MfaService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly crypto: CryptoService,
    private readonly totp: TotpService,
  ) {}

  async generate(user: User) {
    const secret = this.totp.generateSecret()
    user.totpSecret = this.crypto.encrypt(secret)
    await this.users.save(user)
    return { secret, qrCodeUrl: this.totp.keyuri(user.email, secret) }
  }

  async enable(user: User, code: string) {
    if (!user.totpSecret) throw new BadRequestException('Gere o QR Code primeiro.')
    const secret = this.crypto.decrypt(user.totpSecret)
    // Enrollment não grava lastTotpStep — replay é protegido nas ações críticas.
    const timeStep = this.totp.verify(secret, code, null)
    if (timeStep === null) throw new BadRequestException('Código inválido.')
    user.isMfaEnabled = true
    await this.users.save(user)
    return { enabled: true }
  }
}
