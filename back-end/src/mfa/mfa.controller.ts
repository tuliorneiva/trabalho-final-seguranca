import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { StepUpMfaGuard } from './step-up-mfa.guard'
import { MfaService } from './mfa.service'
import { EnableMfaDto } from './dto/enable-mfa.dto'
import { User } from '../auth/entities/user.entity'

@Controller('mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private readonly mfa: MfaService) {}

  @Post('generate')
  @HttpCode(200)
  generate(@Req() req: { user: User }) {
    return this.mfa.generate(req.user)
  }

  @Post('enable')
  @HttpCode(200)
  enable(@Req() req: { user: User }, @Body() dto: EnableMfaDto) {
    return this.mfa.enable(req.user, dto.code)
  }

  // Desativar o MFA é uma ação crítica: exige um código TOTP válido (step-up),
  // igual à exclusão de clientes. Assim, um JWT roubado sozinho não desliga o 2º fator.
  @Post('disable')
  @UseGuards(StepUpMfaGuard)
  @HttpCode(200)
  disable(@Req() req: { user: User }) {
    return this.mfa.disable(req.user)
  }
}
