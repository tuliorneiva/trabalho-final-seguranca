# Design — Camada de MFA via TOTP com Step-up Authentication

**Data:** 2026-07-18
**Projeto:** Mini CRM com proteção de ações críticas via MFA/TOTP
**Integrantes:** Túlio Ribeiro Neiva (back-end), Kaique Bezerra Santos (front-end)

---

## 1. Fundamentação: MFA, TOTP e Step-up

Três conceitos em níveis diferentes sustentam o projeto. É importante não confundi-los:

- **MFA (Multi-Factor Authentication)** — é o *objetivo/propriedade* do sistema: exigir
  mais de um fator de identidade, de categorias distintas. Os fatores clássicos são
  "algo que você sabe" (senha), "algo que você tem" (dispositivo) e "algo que você é"
  (biometria). Usamos os dois primeiros.

- **TOTP (Time-based One-Time Password, RFC 6238)** — é o *mecanismo* que implementa o
  segundo fator ("algo que você tem"). Servidor e app autenticador compartilham um
  segredo (via QR Code) e, a cada 30s, ambos derivam o mesmo código de 6 dígitos a
  partir de `HMAC(segredo, tempo)`. O código expira sozinho e não precisa trafegar pela
  rede.

- **Step-up Authentication** — é a *estratégia* de *quando* exigir o segundo fator. Em
  vez de pedir TOTP no login, exigimos apenas na hora de uma ação crítica (o `DELETE`).

### Onde cada fator aparece no sistema

| Momento | O que exigimos | Fatores |
|---|---|---|
| Login | email + senha | 1 (algo que sabe) |
| Listar clientes (`GET /clientes`) | JWT do login | 1 |
| Deletar cliente (`DELETE /clientes/:id`) | JWT + código TOTP (`x-mfa-code`) | 2 (sabe + tem) |

O login isolado **não** é MFA — é single-factor por escolha de design. O sistema é MFA
porque, para chegar à ação crítica, o usuário provou os dois fatores: senha no login e
TOTP no delete. **MFA é a soma dos momentos; TOTP é o mecanismo do 2º fator; step-up é a
estratégia de onde aplicá-lo.** O `POST /mfa/enable` é o *cadastro* do segundo fator
(vínculo do autenticador), não um uso dele numa ação.

---

## 2. Arquitetura geral

Monorepo com duas pastas:

```
back-end/  →  NestJS + TypeORM + SQLite  →  porta 3000
front-end/ →  React 19 + Vite (já existe) →  porta 5173  →  chama a API via axios
```

- API REST com CORS liberado para a origem do front.
- Rotas protegidas usam JWT via `Authorization: Bearer <token>`.
- Ações críticas exigem **adicionalmente** o header `x-mfa-code`.
- Módulos NestJS: `AuthModule`, `MfaModule`, `ClientesModule`, + `CryptoService` compartilhado.

---

## 3. Modelo de dados

### Entidade `User`

| Campo | Tipo | Observação |
|---|---|---|
| id | uuid (PK) | |
| nome | string | |
| email | string (unique) | |
| passwordHash | string | bcrypt |
| totpSecret | string (nullable) | **criptografado (AES-256-GCM)** em repouso |
| isMfaEnabled | boolean | default `false` |
| lastTotpStep | integer (nullable) | usado na proteção contra replay |

### Entidade `Cliente`

| Campo | Tipo |
|---|---|
| id | uuid (PK) |
| nome | string |
| email | string |
| status | enum: `Ativo` \| `Inativo` \| `Pendente` |

Seed inicial de ~8 clientes, iguais aos do mock atual do front (continuidade visual).

---

## 4. Autenticação

- `POST /auth/register` — body `{ nome, email, senha }` → cria usuário (senha com bcrypt) → `201`.
- `POST /auth/login` — body `{ email, senha }` → `200 { token, user: { nome, email, mfaEnabled } }`
  (formato que o `AuthContext` do front já espera).
- `JwtAuthGuard` (Passport JWT) protege `/mfa/*` e `/clientes/*`.
- Segredo do JWT em `JWT_SECRET` (`.env`).

---

## 5. MFA + TOTP + Step-up (núcleo do projeto)

### `POST /mfa/generate` (JWT)
- Gera segredo com `otplib`.
- **Criptografa** e salva como `totpSecret` (ainda com `isMfaEnabled=false`).
- Retorna `{ secret, qrCodeUrl }`, onde `qrCodeUrl` é a URI `otpauth://totp/MiniCRM:<email>?secret=...&issuer=MiniCRM`.
  O front renderiza o QR com `qrcode.react`.

### `POST /mfa/enable` (JWT) — body `{ code }`
- Descriptografa o segredo, valida o TOTP.
- Sucesso → `isMfaEnabled=true`, grava `lastTotpStep`, retorna `200`.
- Falha → `400`.

### `DELETE /clientes/:id` — `JwtAuthGuard` + `StepUpMfaGuard`

O `StepUpMfaGuard` executa, em ordem:

1. Sem header `x-mfa-code` → `401 { code: "MFA_REQUIRED" }`.
2. Usuário sem MFA ativo → `401 { code: "MFA_REQUIRED", message: "Ative o MFA antes de ações críticas." }`.
3. Código TOTP inválido → `401 { code: "MFA_INVALID" }`.
4. **Replay** — código cujo time-step ≤ `lastTotpStep` → `401 { code: "MFA_INVALID" }`.
5. Sucesso → atualiza `lastTotpStep`, deleta o cliente, retorna `200`.

### Extras de segurança

- **Criptografia em repouso (`CryptoService`)** — AES-256-GCM, chave de `MFA_ENC_KEY`
  (`.env`). Formato armazenado: `iv:authTag:ciphertext`. O segredo TOTP nunca fica em
  texto puro no banco.
- **Proteção contra replay** — cada código TOTP tem um índice de "time-step" (`floor(epoch/30)`).
  Guardamos o último step consumido em `lastTotpStep` e rejeitamos qualquer código com
  step ≤ ao armazenado, impedindo reuso do mesmo código de 6 dígitos dentro da janela.

---

## 6. Contrato da API (resumo)

| Método | Rota | Auth | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/auth/register` | — | `201` | `400` email em uso |
| POST | `/auth/login` | — | `200 { token, user }` | `401` credenciais inválidas |
| POST | `/mfa/generate` | JWT | `200 { secret, qrCodeUrl }` | `401` |
| POST | `/mfa/enable` | JWT | `200` | `400` código inválido |
| GET | `/clientes` | JWT | `200 Cliente[]` | `401` |
| DELETE | `/clientes/:id` | JWT + step-up | `200` | `401 MFA_REQUIRED` / `401 MFA_INVALID` |

---

## 7. Integração do front-end

- Desligar mocks (`USE_MOCK = false`) em `mfaApi.ts` e `clientesApi.ts`.
- Novo `authApi.ts` (`register`, `login`).
- Nova tela de **Login** (+ Registro), rota `/login`, e `ProtectedRoute` que redireciona
  para `/login` quando não há token.
- `AuthContext`: remover `MOCK_TOKEN`/`MOCK_USER`; `login()` real preenche token+user;
  `logout()` já existe.
- `.env` do back com `JWT_SECRET`, `MFA_ENC_KEY` e caminho do SQLite.

O fluxo de step-up no front (promise suspension via `MfaContext` + `StepUpModal`) já está
pronto e envia `x-mfa-code` no `DELETE` — não muda.

---

## 8. Estrutura de pastas do back-end

```
back-end/
  src/
    main.ts
    app.module.ts
    common/
      crypto/crypto.service.ts
    auth/
      auth.module.ts  auth.service.ts  auth.controller.ts
      jwt.strategy.ts  jwt-auth.guard.ts
      dto/  entities/user.entity.ts
    mfa/
      mfa.module.ts  mfa.service.ts  mfa.controller.ts
      step-up-mfa.guard.ts
    clientes/
      clientes.module.ts  clientes.service.ts  clientes.controller.ts
      entities/cliente.entity.ts
    database/  (seed dos clientes)
  test/  (e2e)
  .env.example
```

---

## 9. Testes (TDD, e2e com Jest + Supertest)

Foco nos fluxos de segurança críticos:

- Login com senha correta / incorreta.
- `/mfa/enable` com código válido / inválido.
- `DELETE` sem `x-mfa-code` → `MFA_REQUIRED`.
- `DELETE` com código inválido → `MFA_INVALID`.
- `DELETE` com código válido → `200`.
- **Replay:** mesmo código usado duas vezes → segunda tentativa falha.

---

## 10. Decisões registradas

| Decisão | Escolha | Motivo |
|---|---|---|
| Autenticação | Login real (register + login) + tela no front | Cenário realista, reforça o tema |
| Banco | SQLite | Zero-config, ideal para demo de faculdade |
| Step-up | Código TOTP por request (`x-mfa-code`) | Simples e já é o contrato do front |
| Segredo em repouso | Criptografado (AES-256-GCM) | Proteção de dado sensível at rest |
| Replay | Bloqueio por `lastTotpStep` | Impede reuso do mesmo código na janela de 30s |
| Rate limiting | Fora do escopo | YAGNI para o tamanho do trabalho |
