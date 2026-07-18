# MFA/TOTP Step-up Authentication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a NestJS + SQLite backend that adds MFA via TOTP with step-up authentication on critical actions, and wire the existing React front-end (currently mocked) to it.

**Architecture:** REST API (NestJS) with JWT auth on all protected routes. The critical action (`DELETE /clientes/:id`) additionally requires a fresh TOTP code in the `x-mfa-code` header, enforced by a dedicated `StepUpMfaGuard`. TOTP secrets are encrypted at rest (AES-256-GCM). Replay is prevented by tracking the last consumed TOTP time-step per user. The front-end flips its mock flags off, gains a real login/register flow, and protects routes behind auth.

**Tech Stack:** NestJS 10, TypeORM 0.3 + SQLite, `@nestjs/jwt` + `passport-jwt`, `bcryptjs`, `otplib` 12 (classic `authenticator` API), `class-validator`; React 19 + Vite + axios (existing).

## Global Constraints

- Backend lives in `back-end/`; front-end already exists in `front-end/`.
- Backend port: `3000`. Front-end (Vite) port: `5173`. CORS on backend allows `http://localhost:5173`.
- API contract the front already expects (do not rename):
  - `POST /mfa/generate` → `{ secret, qrCodeUrl }`
  - `POST /mfa/enable` body `{ code }`
  - `GET /clientes` → `Cliente[]`
  - `DELETE /clientes/:id` header `x-mfa-code`; errors as `401 { code: "MFA_REQUIRED" | "MFA_INVALID", message }`
- `POST /auth/login` must return `{ token, user: { nome, email, mfaEnabled } }` (shape `AuthContext` expects).
- Front stores JWT in `localStorage['crm_token']`; axios interceptor already attaches `Authorization: Bearer`.
- `Cliente.status` is exactly one of `'Ativo' | 'Inativo' | 'Pendente'`.
- Use `otplib` **v12 classic API** (`authenticator.generateSecret/keyuri/generate/check/checkDelta`). Do not use the newer functional API.
- Secrets/keys come from env: `JWT_SECRET`, `MFA_ENC_KEY`. Never commit real values; `.env` is gitignored, `.env.example` is committed.

---

## File Structure

```
back-end/
  package.json  tsconfig.json  tsconfig.build.json  nest-cli.json  .gitignore  .env.example
  test/jest-e2e.json
  test/auth.e2e-spec.ts
  test/mfa.e2e-spec.ts
  test/clientes.e2e-spec.ts
  src/
    main.ts
    app.module.ts
    health.controller.ts
    common/crypto/crypto.service.ts
    common/crypto/crypto.service.spec.ts
    auth/
      auth.module.ts  auth.service.ts  auth.controller.ts
      jwt.strategy.ts  jwt-auth.guard.ts
      entities/user.entity.ts
      dto/register.dto.ts  dto/login.dto.ts
    mfa/
      mfa.module.ts  mfa.service.ts  mfa.controller.ts
      totp.service.ts  step-up-mfa.guard.ts
      dto/enable-mfa.dto.ts
    clientes/
      clientes.module.ts  clientes.service.ts  clientes.controller.ts
      entities/cliente.entity.ts

front-end/ (modified)
  src/api/authApi.ts            (new)
  src/api/mfaApi.ts             (USE_MOCK → false)
  src/api/clientesApi.ts        (USE_MOCK → false)
  src/contexts/AuthContext.tsx  (remove mocks, add setMfaEnabled)
  src/components/routing/ProtectedRoute.tsx  (new)
  src/pages/LoginPage.tsx + Auth.module.css  (new)
  src/pages/RegisterPage.tsx    (new)
  src/hooks/useMfaSetup.ts      (call setMfaEnabled on success)
  src/App.tsx                   (public vs protected routes)
  .env.local                    (new, gitignored)
```

---

## Task 1: Scaffold NestJS backend (SQLite + health check)

**Files:**
- Create: `back-end/package.json`, `back-end/tsconfig.json`, `back-end/tsconfig.build.json`, `back-end/nest-cli.json`, `back-end/.gitignore`, `back-end/.env.example`
- Create: `back-end/src/main.ts`, `back-end/src/app.module.ts`, `back-end/src/health.controller.ts`
- Create: `back-end/test/jest-e2e.json`, `back-end/test/health.e2e-spec.ts`

**Interfaces:**
- Produces: a bootable Nest app on port 3000 with CORS for `http://localhost:5173`, global `ValidationPipe`, TypeORM SQLite (`autoLoadEntities`, `synchronize`), and `GET /health → { status: 'ok' }`.

- [ ] **Step 1: Create `back-end/package.json`**

```json
{
  "name": "back-end",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^3.2.3",
    "@nestjs/core": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/typeorm": "^10.0.2",
    "bcryptjs": "^2.4.3",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "otplib": "^12.0.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "sqlite3": "^5.1.7",
    "typeorm": "^0.3.20"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/testing": "^10.4.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.0",
    "ts-loader": "^9.5.1",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.5.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: Create config files**

`back-end/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

`back-end/tsconfig.build.json`:
```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

`back-end/nest-cli.json`:
```json
{ "$schema": "https://json.schemastore.org/nest-cli", "collection": "@nestjs/schematics", "sourceRoot": "src" }
```

`back-end/.gitignore`:
```
node_modules
dist
*.sqlite
.env
```

`back-end/.env.example`:
```
PORT=3000
CORS_ORIGIN=http://localhost:5173
DB_PATH=data.sqlite
JWT_SECRET=troque-por-um-segredo-aleatorio-longo
MFA_ENC_KEY=troque-por-outra-chave-aleatoria-longa
```

`back-end/test/jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd back-end && npm install`
Expected: completes; `node_modules` created. (`sqlite3` compiles a native binary — allow a minute.)

- [ ] **Step 4: Create app source files**

`back-end/src/health.controller.ts`:
```ts
import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' }
  }
}
```

`back-end/src/app.module.ts`:
```ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HealthController } from './health.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH ?? 'data.sqlite',
      autoLoadEntities: true,
      synchronize: true,
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

`back-end/src/main.ts`:
```ts
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
```

- [ ] **Step 5: Write the health e2e test**

`back-end/test/health.e2e-spec.ts`:
```ts
process.env.DB_PATH = ':memory:'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'

describe('Health (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 6: Run the e2e test**

Run: `cd back-end && npm run test:e2e`
Expected: PASS (`Health (e2e) › GET /health returns ok`).

- [ ] **Step 7: Commit**

```bash
cd back-end && git add -A && git commit -m "feat(back): scaffold NestJS + SQLite with health check"
```

---

## Task 2: CryptoService (AES-256-GCM at rest)

**Files:**
- Create: `back-end/src/common/crypto/crypto.service.ts`
- Test: `back-end/src/common/crypto/crypto.service.spec.ts`

**Interfaces:**
- Produces: `CryptoService` with `encrypt(plain: string): string` and `decrypt(payload: string): string`. Ciphertext format is `ivHex:authTagHex:cipherHex`. Key derived from `MFA_ENC_KEY` via SHA-256 (any-length secret allowed).

- [ ] **Step 1: Write the failing unit test**

`back-end/src/common/crypto/crypto.service.spec.ts`:
```ts
import { CryptoService } from './crypto.service'

describe('CryptoService', () => {
  const svc = new CryptoService()

  it('round-trips a value and does not store plaintext', () => {
    const enc = svc.encrypt('JBSWY3DPEHPK3PXP')
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP')
    expect(svc.decrypt(enc)).toBe('JBSWY3DPEHPK3PXP')
  })

  it('uses a random IV so ciphertext differs each call', () => {
    expect(svc.encrypt('same-value')).not.toBe(svc.encrypt('same-value'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd back-end && npm test -- crypto`
Expected: FAIL (`Cannot find module './crypto.service'`).

- [ ] **Step 3: Implement CryptoService**

`back-end/src/common/crypto/crypto.service.ts`:
```ts
import { Injectable } from '@nestjs/common'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

@Injectable()
export class CryptoService {
  private readonly key: Buffer

  constructor() {
    const secret = process.env.MFA_ENC_KEY ?? 'dev-insecure-key-change-me'
    // Deriva uma chave de 32 bytes a partir de qualquer segredo.
    this.key = createHash('sha256').update(secret).digest()
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
  }

  decrypt(payload: string): string {
    const [ivHex, tagHex, dataHex] = payload.split(':')
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    const plain = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()])
    return plain.toString('utf8')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd back-end && npm test -- crypto`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
cd back-end && git add -A && git commit -m "feat(back): add AES-256-GCM CryptoService for secret-at-rest"
```

---

## Task 3: Auth — User entity, register, login, JWT

**Files:**
- Create: `back-end/src/auth/entities/user.entity.ts`
- Create: `back-end/src/auth/dto/register.dto.ts`, `back-end/src/auth/dto/login.dto.ts`
- Create: `back-end/src/auth/auth.service.ts`, `auth.controller.ts`, `jwt.strategy.ts`, `jwt-auth.guard.ts`, `auth.module.ts`
- Modify: `back-end/src/app.module.ts` (import `AuthModule`)
- Test: `back-end/test/auth.e2e-spec.ts`

**Interfaces:**
- Produces:
  - `User` entity: `{ id: string, nome: string, email: string, passwordHash: string, totpSecret: string | null, isMfaEnabled: boolean, lastTotpStep: number | null }`.
  - `JwtAuthGuard` (passport `'jwt'`) — on success sets `req.user: User`.
  - `POST /auth/register` `{ nome, email, senha }` → `201`; `POST /auth/login` `{ email, senha }` → `200 { token, user: { nome, email, mfaEnabled } }`.
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Create the User entity**

`back-end/src/auth/entities/user.entity.ts`:
```ts
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
```

- [ ] **Step 2: Create DTOs, guard, and strategy**

`back-end/src/auth/dto/register.dto.ts`:
```ts
import { IsEmail, IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  @MinLength(2)
  nome: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  senha: string
}
```

`back-end/src/auth/dto/login.dto.ts`:
```ts
import { IsEmail, IsString } from 'class-validator'

export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  senha: string
}
```

`back-end/src/auth/jwt-auth.guard.ts`:
```ts
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`back-end/src/auth/jwt.strategy.ts`:
```ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './entities/user.entity'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET ?? 'dev-insecure-jwt-secret',
    })
  }

  async validate(payload: { sub: string; email: string }): Promise<User> {
    const user = await this.users.findOne({ where: { id: payload.sub } })
    if (!user) throw new UnauthorizedException()
    return user
  }
}
```

- [ ] **Step 3: Create AuthService, controller, and module**

`back-end/src/auth/auth.service.ts`:
```ts
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
```

`back-end/src/auth/auth.controller.ts`:
```ts
import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
  }
}
```

`back-end/src/auth/auth.module.ts`:
```ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { User } from './entities/user.entity'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtStrategy } from './jwt.strategy'

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-insecure-jwt-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [TypeOrmModule, PassportModule, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 4: Register AuthModule in AppModule**

In `back-end/src/app.module.ts`, add the import and list it in `imports`:
```ts
import { AuthModule } from './auth/auth.module'
```
Add `AuthModule` to the `imports` array (after `TypeOrmModule.forRoot({...})`).

- [ ] **Step 5: Write the auth e2e test**

`back-end/test/auth.e2e-spec.ts`:
```ts
process.env.DB_PATH = ':memory:'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'

describe('Auth (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('registers a new user', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ nome: 'Tulio', email: 'tulio@test.com', senha: 'senha123' })
      .expect(201)
  })

  it('logs in and returns token + user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'tulio@test.com', senha: 'senha123' })
      .expect(200)
    expect(typeof res.body.token).toBe('string')
    expect(res.body.user).toEqual({ nome: 'Tulio', email: 'tulio@test.com', mfaEnabled: false })
  })

  it('rejects wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'tulio@test.com', senha: 'errada' })
      .expect(401)
  })

  it('rejects invalid register payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ nome: 'x', email: 'not-an-email', senha: '123' })
      .expect(400)
  })
})
```

- [ ] **Step 6: Run the auth e2e test**

Run: `cd back-end && npm run test:e2e -- auth`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
cd back-end && git add -A && git commit -m "feat(back): add auth (register, login, JWT strategy + guard)"
```

---

## Task 4: MFA — TotpService, generate & enable

**Files:**
- Create: `back-end/src/mfa/totp.service.ts`
- Create: `back-end/src/mfa/dto/enable-mfa.dto.ts`
- Create: `back-end/src/mfa/mfa.service.ts`, `mfa.controller.ts`, `mfa.module.ts`
- Modify: `back-end/src/app.module.ts` (import `MfaModule`)
- Test: `back-end/test/mfa.e2e-spec.ts`

**Interfaces:**
- Consumes: `User` entity, `JwtAuthGuard` (Task 3), `CryptoService` (Task 2).
- Produces:
  - `TotpService` with:
    - `generateSecret(): string`
    - `keyuri(email: string, secret: string): string` (returns `otpauth://...`)
    - `generate(secret: string): string`
    - `verify(secret: string, token: string, lastTotpStep: number | null): number | null` — returns the consumed `timeStep` if valid (and not a replay), else `null`.
  - `POST /mfa/generate` (JWT) → `200 { secret, qrCodeUrl }`; `POST /mfa/enable` (JWT) `{ code }` → `200 { enabled: true }` or `400`.
  - `MfaModule` exports `TotpService` and `CryptoService` (reused by the step-up guard in Task 6).

- [ ] **Step 1: Create TotpService**

`back-end/src/mfa/totp.service.ts`:
```ts
import { Injectable } from '@nestjs/common'
import { authenticator } from 'otplib'

const STEP_SECONDS = 30

@Injectable()
export class TotpService {
  constructor() {
    // Tolera ±1 passo de 30s para compensar dessincronização de relógio.
    authenticator.options = { window: 1 }
  }

  generateSecret(): string {
    return authenticator.generateSecret()
  }

  keyuri(email: string, secret: string): string {
    return authenticator.keyuri(email, 'MiniCRM', secret)
  }

  generate(secret: string): string {
    return authenticator.generate(secret)
  }

  /**
   * Verifica o token com proteção contra replay.
   * Retorna o timeStep consumido se válido; null se inválido OU já usado (replay).
   */
  verify(secret: string, token: string, lastTotpStep: number | null): number | null {
    const delta = authenticator.checkDelta(token, secret)
    if (delta === null) return null
    const currentStep = Math.floor(Date.now() / 1000 / STEP_SECONDS)
    const timeStep = currentStep + delta
    if (lastTotpStep !== null && timeStep <= lastTotpStep) return null // replay
    return timeStep
  }
}
```

- [ ] **Step 2: Create the enable DTO, service, controller, module**

`back-end/src/mfa/dto/enable-mfa.dto.ts`:
```ts
import { IsString, Length } from 'class-validator'

export class EnableMfaDto {
  @IsString()
  @Length(6, 6)
  code: string
}
```

`back-end/src/mfa/mfa.service.ts`:
```ts
import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity'
import { CryptoService } from '../common/crypto/crypto.service'
import { TotpService } from './totp.service'

@Injectable()
export class MfaService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly crypto: CryptoService,
    private readonly totp: TotpService,
  ) {}

  async generate(user: User) {
    const secret = this.totp.generateSecret()
    user.totpSecret = this.crypto.encrypt(secret)
    await this.users.save(user)
    return { secret, qrCodeUrl: this.totp.keyuri(user.email, secret) }
  }

  async enable(user: User, code: string) {
    if (!user.totpSecret) throw new BadRequestException('Gere o QR Code primeiro.')
    const secret = this.crypto.decrypt(user.totpSecret)
    // Enrollment não grava lastTotpStep — replay é protegido nas ações críticas.
    const timeStep = this.totp.verify(secret, code, null)
    if (timeStep === null) throw new BadRequestException('Código inválido.')
    user.isMfaEnabled = true
    await this.users.save(user)
    return { enabled: true }
  }
}
```

`back-end/src/mfa/mfa.controller.ts`:
```ts
import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
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
}
```

`back-end/src/mfa/mfa.module.ts`:
```ts
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
```

- [ ] **Step 3: Register MfaModule in AppModule**

In `back-end/src/app.module.ts` add `import { MfaModule } from './mfa/mfa.module'` and add `MfaModule` to the `imports` array.

- [ ] **Step 4: Write the MFA e2e test**

`back-end/test/mfa.e2e-spec.ts`:
```ts
process.env.DB_PATH = ':memory:'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { authenticator } from 'otplib'
import { AppModule } from '../src/app.module'

describe('MFA (e2e)', () => {
  let app: INestApplication
  let token: string
  let secret: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    const server = app.getHttpServer()
    await request(server)
      .post('/auth/register')
      .send({ nome: 'Mfa User', email: 'mfa@test.com', senha: 'senha123' })
    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'mfa@test.com', senha: 'senha123' })
    token = login.body.token
  })

  afterAll(async () => {
    await app.close()
  })

  it('generates a secret and qrCodeUrl', async () => {
    const res = await request(app.getHttpServer())
      .post('/mfa/generate')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.secret).toEqual(expect.any(String))
    expect(res.body.qrCodeUrl).toContain('otpauth://totp/MiniCRM')
    secret = res.body.secret
  })

  it('rejects generate without JWT', async () => {
    await request(app.getHttpServer()).post('/mfa/generate').expect(401)
  })

  it('enables MFA with a valid code', async () => {
    const code = authenticator.generate(secret)
    const res = await request(app.getHttpServer())
      .post('/mfa/enable')
      .set('Authorization', `Bearer ${token}`)
      .send({ code })
      .expect(200)
    expect(res.body).toEqual({ enabled: true })
  })

  it('rejects an invalid code on enable', async () => {
    await request(app.getHttpServer())
      .post('/mfa/enable')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: '000000' })
      .expect(400)
  })
})
```

- [ ] **Step 5: Run the MFA e2e test**

Run: `cd back-end && npm run test:e2e -- mfa`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
cd back-end && git add -A && git commit -m "feat(back): add MFA generate/enable with TOTP + replay-aware verify"
```

---

## Task 5: Clientes — entity, seed, GET list

**Files:**
- Create: `back-end/src/clientes/entities/cliente.entity.ts`
- Create: `back-end/src/clientes/clientes.service.ts`, `clientes.controller.ts`, `clientes.module.ts`
- Modify: `back-end/src/app.module.ts` (import `ClientesModule`)
- Test: `back-end/test/clientes.e2e-spec.ts`

**Interfaces:**
- Consumes: `JwtAuthGuard` (Task 3).
- Produces:
  - `Cliente` entity `{ id: string, nome: string, email: string, status: 'Ativo' | 'Inativo' | 'Pendente' }`, seeded with 8 rows on boot when empty.
  - `ClientesService` with `findAll(): Promise<Cliente[]>` and `remove(id: string): Promise<void>` (throws `NotFoundException` if missing).
  - `GET /clientes` (JWT) → `200 Cliente[]`.

- [ ] **Step 1: Create the Cliente entity**

`back-end/src/clientes/entities/cliente.entity.ts`:
```ts
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
```

- [ ] **Step 2: Create the service (with seed), controller, and module**

`back-end/src/clientes/clientes.service.ts`:
```ts
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
```

`back-end/src/clientes/clientes.controller.ts`:
```ts
import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ClientesService } from './clientes.service'

@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  findAll() {
    return this.clientes.findAll()
  }
}
```

`back-end/src/clientes/clientes.module.ts`:
```ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Cliente } from './entities/cliente.entity'
import { ClientesService } from './clientes.service'
import { ClientesController } from './clientes.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Cliente])],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
```

- [ ] **Step 3: Register ClientesModule in AppModule**

In `back-end/src/app.module.ts` add `import { ClientesModule } from './clientes/clientes.module'` and add `ClientesModule` to `imports`.

- [ ] **Step 4: Write the clientes e2e test**

`back-end/test/clientes.e2e-spec.ts`:
```ts
process.env.DB_PATH = ':memory:'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'

describe('Clientes GET (e2e)', () => {
  let app: INestApplication
  let token: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    const server = app.getHttpServer()
    await request(server)
      .post('/auth/register')
      .send({ nome: 'Cli User', email: 'cli@test.com', senha: 'senha123' })
    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'cli@test.com', senha: 'senha123' })
    token = login.body.token
  })

  afterAll(async () => {
    await app.close()
  })

  it('lists seeded clientes with a valid JWT', async () => {
    const res = await request(app.getHttpServer())
      .get('/clientes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(8)
    expect(res.body[0]).toHaveProperty('nome')
    expect(res.body[0]).toHaveProperty('status')
  })

  it('rejects without JWT', async () => {
    await request(app.getHttpServer()).get('/clientes').expect(401)
  })
})
```

- [ ] **Step 5: Run the clientes e2e test**

Run: `cd back-end && npm run test:e2e -- clientes`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd back-end && git add -A && git commit -m "feat(back): add clientes entity, seed, and GET list"
```

---

## Task 6: Step-up guard + DELETE /clientes/:id

**Files:**
- Create: `back-end/src/mfa/step-up-mfa.guard.ts`
- Modify: `back-end/src/clientes/clientes.controller.ts` (add `DELETE`), `back-end/src/clientes/clientes.module.ts` (provide guard deps)
- Test: `back-end/test/clientes.e2e-spec.ts` (append a step-up describe block)

**Interfaces:**
- Consumes: `User` entity, `CryptoService` + `TotpService` (Task 4), `JwtAuthGuard` (sets `req.user`).
- Produces:
  - `StepUpMfaGuard` enforcing: missing `x-mfa-code` or MFA not enabled → `401 { code: 'MFA_REQUIRED', message }`; invalid/replayed code → `401 { code: 'MFA_INVALID', message }`; on success persists `user.lastTotpStep`.
  - `DELETE /clientes/:id` (JWT + step-up) → `200 { success: true }`.

- [ ] **Step 1: Create the StepUpMfaGuard**

`back-end/src/mfa/step-up-mfa.guard.ts`:
```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity'
import { CryptoService } from '../common/crypto/crypto.service'
import { TotpService } from './totp.service'

@Injectable()
export class StepUpMfaGuard implements CanActivate {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly crypto: CryptoService,
    private readonly totp: TotpService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const user: User = req.user // já preenchido pelo JwtAuthGuard
    const code = req.headers['x-mfa-code'] as string | undefined

    if (!code) {
      throw new UnauthorizedException({ code: 'MFA_REQUIRED', message: 'Código MFA obrigatório.' })
    }
    if (!user.isMfaEnabled || !user.totpSecret) {
      throw new UnauthorizedException({
        code: 'MFA_REQUIRED',
        message: 'Ative o MFA antes de executar ações críticas.',
      })
    }

    const secret = this.crypto.decrypt(user.totpSecret)
    const timeStep = this.totp.verify(secret, code, user.lastTotpStep)
    if (timeStep === null) {
      throw new UnauthorizedException({ code: 'MFA_INVALID', message: 'Código MFA inválido.' })
    }

    user.lastTotpStep = timeStep
    await this.users.save(user)
    return true
  }
}
```

- [ ] **Step 2: Add DELETE route to the controller**

Replace `back-end/src/clientes/clientes.controller.ts` with:
```ts
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
```

- [ ] **Step 3: Provide the guard's dependencies in ClientesModule**

Replace `back-end/src/clientes/clientes.module.ts` with:
```ts
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
```

- [ ] **Step 4: Append the step-up e2e block**

Add this `describe` block to `back-end/test/clientes.e2e-spec.ts` (after the existing block, same file, importing `authenticator` at top — add `import { authenticator } from 'otplib'`):
```ts
describe('Clientes DELETE step-up (e2e)', () => {
  let app: INestApplication
  let token: string
  let secret: string
  let ids: string[]

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    const server = app.getHttpServer()
    await request(server)
      .post('/auth/register')
      .send({ nome: 'Del User', email: 'del@test.com', senha: 'senha123' })
    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'del@test.com', senha: 'senha123' })
    token = login.body.token

    const gen = await request(server).post('/mfa/generate').set('Authorization', `Bearer ${token}`)
    secret = gen.body.secret
    await request(server)
      .post('/mfa/enable')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: authenticator.generate(secret) })

    const list = await request(server).get('/clientes').set('Authorization', `Bearer ${token}`)
    ids = list.body.map((c: { id: string }) => c.id)
  })

  afterAll(async () => {
    await app.close()
  })

  it('rejects DELETE without x-mfa-code (MFA_REQUIRED)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/clientes/${ids[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401)
    expect(res.body.code).toBe('MFA_REQUIRED')
  })

  it('rejects DELETE with an invalid code (MFA_INVALID)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/clientes/${ids[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-mfa-code', '000000')
      .expect(401)
    expect(res.body.code).toBe('MFA_INVALID')
  })

  it('deletes with a valid code, then rejects the same code as replay', async () => {
    const code = authenticator.generate(secret)

    await request(app.getHttpServer())
      .delete(`/clientes/${ids[0]}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-mfa-code', code)
      .expect(200)

    const replay = await request(app.getHttpServer())
      .delete(`/clientes/${ids[1]}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-mfa-code', code)
      .expect(401)
    expect(replay.body.code).toBe('MFA_INVALID')
  })
})
```

- [ ] **Step 5: Run the full backend e2e suite**

Run: `cd back-end && npm run test:e2e`
Expected: PASS — all e2e specs (health, auth, mfa, clientes GET + step-up).

- [ ] **Step 6: Commit**

```bash
cd back-end && git add -A && git commit -m "feat(back): add step-up MFA guard and protected DELETE /clientes/:id"
```

---

## Task 7: Front-end — real auth (context, API, pages, route guard)

**Files:**
- Create: `front-end/src/api/authApi.ts`, `front-end/src/components/routing/ProtectedRoute.tsx`, `front-end/src/pages/LoginPage.tsx`, `front-end/src/pages/RegisterPage.tsx`, `front-end/src/pages/Auth.module.css`
- Modify: `front-end/src/contexts/AuthContext.tsx`, `front-end/src/App.tsx`

**Interfaces:**
- Consumes: existing `apiClient` (`api/axios.ts`), `AuthUser` type, `useAuth()`.
- Produces:
  - `authApi`: `login(email, senha): Promise<{ token, user: AuthUser }>`, `register(nome, email, senha): Promise<void>`.
  - `AuthContext` value gains `setMfaEnabled(enabled: boolean): void`; initial `token`/`user` come only from `localStorage` (no mock fallback).
  - `ProtectedRoute` redirects to `/login` when not authenticated.

- [ ] **Step 1: Create the auth API client**

`front-end/src/api/authApi.ts`:
```ts
// =============================================================================
// API — AUTH ENDPOINTS
// =============================================================================

import apiClient from './axios'
import type { AuthUser } from '../types'

export interface LoginResponse {
  token: string
  user: AuthUser
}

/** POST /auth/login */
export async function login(email: string, senha: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, senha })
  return data
}

/** POST /auth/register */
export async function register(nome: string, email: string, senha: string): Promise<void> {
  await apiClient.post('/auth/register', { nome, email, senha })
}
```

- [ ] **Step 2: Rewrite AuthContext (remove mocks, add setMfaEnabled)**

Replace `front-end/src/contexts/AuthContext.tsx` with:
```tsx
// =============================================================================
// CONTEXT — AUTH
// Token JWT + usuário logado, persistidos em localStorage.
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types'

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  setMfaEnabled: (enabled: boolean) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('crm_token'))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('crm_user')
    return stored ? (JSON.parse(stored) as AuthUser) : null
  })

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem('crm_token', newToken)
    localStorage.setItem('crm_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
    setToken(null)
    setUser(null)
  }, [])

  const setMfaEnabled = useCallback((enabled: boolean) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, mfaEnabled: enabled }
      localStorage.setItem('crm_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{ token, user, login, logout, setMfaEnabled, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  }
  return ctx
}
```

- [ ] **Step 3: Create ProtectedRoute**

`front-end/src/components/routing/ProtectedRoute.tsx`:
```tsx
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

- [ ] **Step 4: Create the shared auth stylesheet**

`front-end/src/pages/Auth.module.css`:
```css
.wrapper {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0f172a;
  padding: 24px;
}
.card {
  width: 100%;
  max-width: 380px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 32px;
  color: #e2e8f0;
}
.title {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 4px;
}
.subtitle {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 24px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.field label {
  font-size: 0.8rem;
  color: #cbd5e1;
}
.field input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #475569;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 0.95rem;
}
.button {
  width: 100%;
  padding: 11px;
  border: none;
  border-radius: 8px;
  background: #6366f1;
  color: white;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
}
.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  background: #7f1d1d;
  color: #fecaca;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 16px;
}
.switch {
  margin-top: 20px;
  font-size: 0.85rem;
  text-align: center;
  color: #94a3b8;
}
.switch a {
  color: #a5b4fc;
}
```

- [ ] **Step 5: Create the LoginPage**

`front-end/src/pages/LoginPage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login as loginRequest } from '../api/authApi'
import { useAuth } from '../contexts/AuthContext'
import styles from './Auth.module.css'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { token, user } = await loginRequest(email, senha)
      login(token, user)
      navigate('/', { replace: true })
    } catch {
      setError('E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.title}>Mini CRM</div>
        <div className={styles.subtitle}>Entre para acessar o painel</div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <div className={styles.switch}>
          Não tem conta? <Link to="/register">Cadastre-se</Link>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Create the RegisterPage**

`front-end/src/pages/RegisterPage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register as registerRequest, login as loginRequest } from '../api/authApi'
import { useAuth } from '../contexts/AuthContext'
import styles from './Auth.module.css'

export function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await registerRequest(nome, email, senha)
      const { token, user } = await loginRequest(email, senha)
      login(token, user)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } }
      setError(
        axiosErr?.response?.status === 409
          ? 'E-mail já cadastrado.'
          : 'Não foi possível cadastrar. Verifique os dados (senha mínima 6 caracteres).',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.title}>Criar conta</div>
        <div className={styles.subtitle}>Cadastre-se para usar o Mini CRM</div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label htmlFor="nome">Nome</label>
          <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </button>

        <div className={styles.switch}>
          Já tem conta? <Link to="/login">Entrar</Link>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 7: Rewire App.tsx (public vs protected routes)**

Replace `front-end/src/App.tsx` with:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { MfaProvider } from './contexts/MfaContext'
import { ToastProvider } from './components/ui/Toast'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { StepUpModal } from './components/mfa/StepUpModal'
import { ProtectedRoute } from './components/routing/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { ClientesPage } from './pages/ClientesPage'
import { MfaSetupPage } from './pages/MfaSetupPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MfaProvider>
          <BrowserRouter>
            <StepUpModal />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/clientes" element={<ClientesPage />} />
                        <Route path="/mfa-setup" element={<MfaSetupPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </MfaProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
```

- [ ] **Step 8: Verify the front-end builds**

Run: `cd front-end && npm install && npm run build`
Expected: TypeScript compiles and Vite build succeeds (no type errors).

- [ ] **Step 9: Commit**

```bash
cd front-end && git add -A && git commit -m "feat(front): real auth flow (login/register pages, route guard, context)"
```

---

## Task 8: Front-end — unmock APIs, env, and full integration smoke test

**Files:**
- Modify: `front-end/src/api/mfaApi.ts` (`USE_MOCK → false`), `front-end/src/api/clientesApi.ts` (`USE_MOCK → false`)
- Modify: `front-end/src/hooks/useMfaSetup.ts` (call `setMfaEnabled(true)` on success)
- Create: `front-end/.env.local`

**Interfaces:**
- Consumes: all backend endpoints (Tasks 3–6) and `useAuth().setMfaEnabled` (Task 7).
- Produces: a fully integrated app where the front talks to the real backend.

- [ ] **Step 1: Turn off the MFA mock**

In `front-end/src/api/mfaApi.ts`, change:
```ts
const USE_MOCK = true
```
to:
```ts
const USE_MOCK = false
```

- [ ] **Step 2: Turn off the clientes mock**

In `front-end/src/api/clientesApi.ts`, change `const USE_MOCK = true` to `const USE_MOCK = false`.

- [ ] **Step 3: Reflect MFA activation in auth state**

In `front-end/src/hooks/useMfaSetup.ts`, import and use `useAuth`:

Add import near the top:
```ts
import { useAuth } from '../contexts/AuthContext'
```
Inside `useMfaSetup`, add after the state declarations:
```ts
  const { setMfaEnabled } = useAuth()
```
In `activateMfa`, after `setSuccess(true)`, add `setMfaEnabled(true)`:
```ts
      await enableMfa(code)
      setSuccess(true)
      setMfaEnabled(true)
      setCode('')
```

- [ ] **Step 4: Create the front-end env file**

`front-end/.env.local`:
```
VITE_API_URL=http://localhost:3000
```
(`.env.local` is already gitignored by the Vite template — confirm it is not committed.)

- [ ] **Step 5: Verify the front-end still builds**

Run: `cd front-end && npm run build`
Expected: build succeeds.

- [ ] **Step 6: Manual integration smoke test (both servers running)**

Prepare backend env once: `cd back-end && cp .env.example .env` (edit `JWT_SECRET`/`MFA_ENC_KEY` to any long random strings).

Terminal A: `cd back-end && npm run start:dev` (listens on `:3000`).
Terminal B: `cd front-end && npm run dev` (opens `:5173`).

Walk through and confirm each:
1. Visiting `http://localhost:5173/` while logged out → redirected to `/login`.
2. Register a new user → lands on the dashboard authenticated.
3. Go to **Segurança MFA**, click generate → a real QR Code renders; scan it with Google Authenticator.
4. Enter the 6-digit code → success; header/state reflects MFA enabled.
5. Go to **Clientes** → the 8 seeded clientes load from the backend.
6. Click delete on a row → Step-up modal appears. Enter the current Authenticator code → the row is removed (backend `200`).
7. Immediately click delete on another row and enter the **same** code → rejected with an "inválido" message (replay protection). Enter the next fresh code → succeeds.
8. Click logout → redirected to `/login`; refreshing keeps you logged out.

- [ ] **Step 7: Commit**

```bash
cd front-end && git add -A && git commit -m "feat(front): connect to real backend (unmock APIs, env, MFA state sync)"
```

---

## Self-Review Notes

- **Spec coverage:** Auth (§4) → Task 3; MFA generate/enable + TOTP + encryption + replay (§5) → Tasks 2, 4; step-up guard + DELETE (§5) → Task 6; clientes + seed + GET (§3) → Task 5; API contract (§6) → Tasks 3–6 (shapes verified in e2e); front integration (§7) → Tasks 7–8; testing (§9) → e2e specs in Tasks 3–6. All spec sections map to a task.
- **Replay + testability:** enrollment (`/mfa/enable`) intentionally does not persist `lastTotpStep`, so the first `DELETE` with a fresh code succeeds and starts replay tracking — this keeps the e2e deterministic (no 30s wait) while still blocking reuse of a code on critical actions.
- **Type consistency:** `TotpService.verify` returns `number | null` and is consumed identically by `MfaService.enable` and `StepUpMfaGuard`. Error bodies `{ code, message }` match what `clientesApi.ts` reads (`response.data.message` / `response.data.code`).
```
