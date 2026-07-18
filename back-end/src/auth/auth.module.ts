import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { User } from './entities/user.entity'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtStrategy } from './jwt.strategy'
import { requireSecret } from '../common/config/secrets'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    // registerAsync (lazy): o secret é resolvido no init do DI, DEPOIS que o
    // ConfigModule carregou o .env — mantendo assinatura e verificação (JwtStrategy)
    // usando exatamente o mesmo JWT_SECRET.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireSecret('JWT_SECRET', 'test-insecure-jwt-secret'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [TypeOrmModule, PassportModule, JwtModule],
})
export class AuthModule {}
