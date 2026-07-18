import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/entities/user.entity'
import { MfaService } from './mfa.service'
import { MfaController } from './mfa.controller'
import { TotpService } from './totp.service'
import { CryptoService } from '../common/crypto/crypto.service'

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [MfaController],
  providers: [MfaService, TotpService, CryptoService],
  exports: [TotpService, CryptoService],
})
export class MfaModule {}
