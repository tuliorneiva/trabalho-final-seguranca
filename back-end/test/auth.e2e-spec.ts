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
