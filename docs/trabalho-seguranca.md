## © Planejamento: Implementacdo MFA e Step- up Authentication

## @ Tema do Projeto: Mini CRM de Clientes)

Para dar um contexto pratico ao uso do Step-up Authentication, a aplicacdo sera um CRM bem simples e genérico, com poucas telas, focado em gerenciar uma carteira de clientes.

- \* O cenario comum: O usuario loga e visualiza a listagem de clientes cadastrados.

- A agao sensivel (Protegida por MFA): Excluir permanentemente o registro de um cliente da base de dados. Como deletar um cliente é uma critica e destrutiva, o servidor vai barrar o request e exigir o codigo do Google Authenticator.

## #8 Divisdo de Tarefas (Horizontal)

## Pessoa 1: Back-end & Banco de Dados (Tulio)

Stack: NestJS + TypeORM Fica responsavel por toda a geracdo, armazenamento, validagdo criptografica e rotas de negocio.

- \* Modelagem de Dados: Atualizar a entidade de usuario no banco de dados para incluir campos como totp_secret e is_mfa_enabled .

- \* Geragao do Segredo: Criar o endpoint que gera o segredo TOTP e a URI correspondente (usando otplib ).

- confirmar a Inicial (Setup): Criar o endpoint que recebe o primeiro codigo de 6 digitos para do app.

- Middlewares/Guards de Protecéo: O do projeto. Implementar um Guard no NestJS que intercepte as rotas sensiveis (ex: DELETE /clientes/:id ), verifique se a requisi¢do possui um token de step-up ou exija o codigo TOTP no header.

- \* Endpoints do Painel: Criar a rota de listagem ( GET /clientes ) exigindo apenas JWT, e aplicar o Guard na rota critica ( DELETE ).

## EJ Pessoa 2: Front-end & UX (Kaique)

Stack: React Fica responsavel pela jornada do usuario, painel administrativo e pela

de agdes na interface.

- Layout Base (Dashboard): Criar a estrutura principal com Sidebar e Header.

- « Tela de de MFA: Criar a interface onde o usuario visualiza 0 QR Code (usando


greode. react ), insere o codigo e vincula o autenticador.

- Pagina de Gestao (Lista de Clientes): Desenvolver uma tabela listando os clientes. Cada linha deve ter um de

- \* Interceptador de Agdes Sensiveis: Criar o fluxo de Ul para o Step-up. Ao clicar em "Excluir" na tabela, a interface pausa e abre o Modal exigindo os 6 digitos.

- \+ Gestdo de Estados e Loading: Lidar com cenarios de invalido, mostrar um spinner durante a requisicdo, e atualizar a tabela apds a

## = Contrato da API (O Acordo Front/Back)

- 1. Gerar o QR Code para configuracao inicial

- Endpoint: POST /mfa/generate

- \* Retorno ( 2ee ok ):

```
"secret": "JBSWY3DPEHPK3PXP",
"grCodeUrl": "otpauth://totp/MiniCRM:usuario@email.com?secret=IBSWY...&issuer=MiniCRM"
}
```

## 2. Validar e Ativar o MFA pela primeira vez

- \* Endpoint: POST /mfa/enable

- \* Body: { "code": "123456" }

- Retorno: 200 0K (Sucesso) ou 4@e Bad Request invélido).

- 3. Buscar Dados o Painel (Sem protecao Step-up) para

- Endpoint: GET /clientes

- \* Headers: Authorization: Bearer <token-jwt>

- « Retorno ( 2e@ oK ):

```
: 1, "nome": "Empresa Alpha", "email": "status": "Ativo" },
: 2, "nome": "Beta Servigos", "email": "financeiro@beta.com", "status": "Inativo"
```

- 4. Executar Agao Critica no Painel (Com Step-up)

- \* Endpoint: DELETE /clientes/:id


- \* Headers:

Authorization: Bearer <token-jwt-do-usuario> x-mfa-code: 123456

- \* Retorno:

- = 200 OK : Cliente excluido com sucesso.

- ° 401 Unauthorized ( MFA_REQUIRED ): Faltou o header x-mfa-code .

- © Unauthorized ( MFA INVALID ): TOTP errada.
