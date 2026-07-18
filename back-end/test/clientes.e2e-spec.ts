process.env.DB_PATH = ':memory:'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { authenticator } from 'otplib'
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
