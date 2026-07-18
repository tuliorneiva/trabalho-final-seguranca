import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cliente, ClienteStatus } from './entities/cliente.entity'

const SEED: Array<{ nome: string; email: string; status: ClienteStatus }> = [
  { nome: 'Ana Beatriz Costa', email: 'ana.costa@empresa.com', status: 'Ativo' },
  { nome: 'Carlos Eduardo Lima', email: 'carlos.lima@startup.io', status: 'Ativo' },
  { nome: 'Fernanda Oliveira', email: 'fernanda@consultoria.com', status: 'Inativo' },
  { nome: 'Rafael Mendes', email: 'rafael.mendes@tech.com', status: 'Pendente' },
  { nome: 'Julia Santos', email: 'julia.santos@design.co', status: 'Ativo' },
  { nome: 'Pedro Alves Rodrigues', email: 'pedro.alves@fintech.com', status: 'Ativo' },
  { nome: 'Mariana Ferreira', email: 'mariana@agencia.com.br', status: 'Inativo' },
  { nome: 'Lucas Brandão', email: 'lucas.brandao@corp.com', status: 'Pendente' },
]

@Injectable()
export class ClientesService implements OnModuleInit {
  constructor(@InjectRepository(Cliente) private readonly repo: Repository<Cliente>) {}

  async onModuleInit() {
    if ((await this.repo.count()) === 0) {
      await this.repo.save(this.repo.create(SEED))
    }
  }

  findAll(): Promise<Cliente[]> {
    return this.repo.find()
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id)
    if (!result.affected) throw new NotFoundException('Cliente não encontrado.')
  }
}
