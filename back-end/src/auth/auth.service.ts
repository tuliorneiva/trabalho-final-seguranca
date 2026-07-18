import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcryptjs'
import { User } from './entities/user.entity'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } })
    if (existing) throw new ConflictException('E-mail já cadastrado.')
    const passwordHash = await bcrypt.hash(dto.senha, 10)
    const user = this.users.create({ nome: dto.nome, email: dto.email, passwordHash })
    await this.users.save(user)
    return { id: user.id, email: user.email }
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { email: dto.email } })
    if (!user || !(await bcrypt.compare(dto.senha, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas.')
    }
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email })
    return {
      token,
      user: { nome: user.nome, email: user.email, mfaEnabled: user.isMfaEnabled },
    }
  }
}
