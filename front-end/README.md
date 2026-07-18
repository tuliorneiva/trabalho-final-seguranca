# Mini CRM 

## Estrutura de Arquivos

```text
front-end/src/
├── api/
│   ├── axios.ts          # Instância Axios + interceptor Bearer token
│   ├── clientesApi.ts    # GET /clientes + DELETE /clientes/:id (com mock)
│   └── mfaApi.ts         # POST /mfa/generate + POST /mfa/enable (com mock)
│
├── contexts/
│   ├── AuthContext.tsx   # Token JWT + usuário mockado
│   └── MfaContext.tsx    # Promise Suspension Pattern (step-up)
│
├── hooks/
│   ├── useClientes.ts    # Fetch + delete reativo + step-up integrado
│   └── useMfaSetup.ts    # Geração QR + ativação MFA
│
├── components/
│   ├── layout/           # Sidebar, Header, DashboardLayout
│   ├── ui/               # Modal, Spinner, Badge, Toast
│   └── mfa/              # StepUpModal, MfaSetupCard
│
├── pages/
│   ├── DashboardPage     # Home com cards de acesso rápido
│   ├── ClientesPage      # Tabela reativa com Step-up
│   └── MfaSetupPage      # Setup Google Authenticator
│
└── types/index.ts        # Interfaces TypeScript centralizadas
```

## Fluxo Step-up MFA implementado

```text
Usuário clica "Excluir"
    │
    ▼
useClientes.handleDelete(id)
    │ await requestStepUp()     ← Promise suspensa
    ▼
MfaContext abre StepUpModal   ← Globalmente, sem acoplamento
    │
    ▼ Usuário digita 6 dígitos + Enter
confirmCode(code) resolve Promise
    │
    ▼
DELETE /clientes/:id + header x-mfa-code
    │
   ┌─────────┬──────────────┐
  200        401 MFA_INVALID
   │          │
 Remove       Toast de erro
 da lista     (modal já fechou)
```

## Princípios SOLID aplicados

| Princípio | Como foi aplicado |
| :--- | :--- |
| **S** | `api/` = HTTP apenas; `hooks` = lógica; `components` = render |
| **O** | `Modal.tsx` extensível sem modificação (`children` genéricos) |
| **L** | Componentes `ui/` são substituíveis por qualquer similar |
| **I** | `clientesApi.ts` e `mfaApi.ts` expõem só seu domínio |
| **D** | Hooks dependem das abstrações `api/`, não de fetch direto |

## Como executar

```bash
cd front-end

# Instale as dependência
npm install

# Desenvolvimento
npm run dev        # http://localhost:5173/

# Build de produção
npm run build      # Gera dist/

# Deploy Vercel
# Defina VITE_API_URL nas Environment Variables do projeto
```

## Para conectar ao backend real

1. Renomeie `.env.example` para `.env.local`
2. Defina `VITE_API_URL=http://seu-backend.com`
3. Nos arquivos `src/api/clientesApi.ts` e `src/api/mfaApi.ts`, mude `const USE_MOCK = false`

As chamadas passarão a usar o backend real com todos os headers corretos.

> **TIP**
> O Axios interceptor já injeta `Authorization: Bearer <token>` em TODAS as requisições automaticamente. O `x-mfa-code` é passado como header extra no `deleteCliente(id, mfaCode)`.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
