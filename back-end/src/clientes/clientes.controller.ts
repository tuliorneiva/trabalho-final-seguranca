import { Controller, Delete, Get, HttpCode, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { StepUpMfaGuard } from '../mfa/step-up-mfa.guard'
import { ClientesService } from './clientes.service'

@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  findAll() {
    return this.clientes.findAll()
  }

  @Delete(':id')
  @UseGuards(StepUpMfaGuard)
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.clientes.remove(id)
    return { success: true }
  }
}
