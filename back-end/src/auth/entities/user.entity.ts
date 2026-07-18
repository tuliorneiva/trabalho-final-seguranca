import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  nome: string

  @Column({ unique: true })
  email: string

  @Column()
  passwordHash: string

  @Column({ type: 'text', nullable: true })
  totpSecret: string | null

  @Column({ default: false })
  isMfaEnabled: boolean

  @Column({ type: 'integer', nullable: true })
  lastTotpStep: number | null
}
