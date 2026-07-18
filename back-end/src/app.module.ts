import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HealthController } from './health.controller'
import { AuthModule } from './auth/auth.module'
import { MfaModule } from './mfa/mfa.module'
import { ClientesModule } from './clientes/clientes.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH ?? 'data.sqlite',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    MfaModule,
    ClientesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
