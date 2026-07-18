import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

export type ClienteStatus = 'Ativo' | 'Inativo' | 'Pendente'

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  nome: string

  @Column()
  email: string

  @Column()
  status: ClienteStatus
}
