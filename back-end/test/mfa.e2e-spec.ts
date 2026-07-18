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

  it('rejects generate once MFA is already enabled', async () => {
    await request(app.getHttpServer())
      .post('/mfa/generate')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('rejects disable without x-mfa-code (MFA_REQUIRED)', async () => {
    const res = await request(app.getHttpServer())
      .post('/mfa/disable')
      .set('Authorization', `Bearer ${token}`)
      .expect(401)
    expect(res.body.code).toBe('MFA_REQUIRED')
  })

  it('rejects disable with an invalid code (MFA_INVALID)', async () => {
    const res = await request(app.getHttpServer())
      .post('/mfa/disable')
      .set('Authorization', `Bearer ${token}`)
      .set('x-mfa-code', '000000')
      .expect(401)
    expect(res.body.code).toBe('MFA_INVALID')
  })

  it('disables MFA with a valid code, then allows generate again', async () => {
    await request(app.getHttpServer())
      .post('/mfa/disable')
      .set('Authorization', `Bearer ${token}`)
      .set('x-mfa-code', authenticator.generate(secret))
      .expect(200)

    // Com o MFA desativado, /mfa/generate volta a funcionar (não é mais 403).
    await request(app.getHttpServer())
      .post('/mfa/generate')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
  })
})
