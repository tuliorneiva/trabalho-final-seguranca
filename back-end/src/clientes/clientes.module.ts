import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Cliente } from './entities/cliente.entity'
import { User } from '../auth/entities/user.entity'
import { ClientesService } from './clientes.service'
import { ClientesController } from './clientes.controller'
import { StepUpMfaGuard } from '../mfa/step-up-mfa.guard'
import { CryptoService } from '../common/crypto/crypto.service'
import { TotpService } from '../mfa/totp.service'

@Module({
  imports: [TypeOrmModule.forFeature([Cliente, User])],
  controllers: [ClientesController],
  providers: [ClientesService, StepUpMfaGuard, CryptoService, TotpService],
})
export class ClientesModule {}
