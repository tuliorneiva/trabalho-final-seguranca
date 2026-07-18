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
