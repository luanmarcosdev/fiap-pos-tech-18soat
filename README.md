# fiap-pos-tech-18soat

## Como rodar (dev)

Pré-requisito: Docker com Docker Compose.

```bash
cp .env.example .env
docker compose up -d --build
```

O código em `src/` é montado como volume no container da API e o `node --watch` reinicia o server a cada alteração — não é preciso rebuildar a imagem. Rebuild (`docker compose up -d --build`) só é necessário ao mudar dependências no `package.json`.

| Serviço    | URL                          |
|------------|------------------------------|
| API        | http://localhost:3000/api    |
| Swagger    | http://localhost:3000/api/docs |
| SonarQube  | http://localhost:9000 (admin/admin) |
| Postgres   | localhost:5432               |
| Redis      | localhost:6379               |

### Banco de dados

Migrations e seeders ficam em `src/infra/database/` e rodam via `sequelize-cli`:

```bash
docker compose exec api npm run db:migrate        # aplica as migrations
docker compose exec api npm run db:seed           # cria o usuário admin (idempotente)
docker compose exec api npm run db:migrate:undo   # desfaz a última migration
docker compose exec api npm run db:seed:undo      # remove os dados dos seeders
```

O usuário admin é criado com `ADMIN_USUARIO` e `ADMIN_SENHA` do `.env` (padrão do `.env.example`: `admin` / `admin`).

### Autenticação

Todas as rotas de cadastro exigem um token JWT. Para obter o token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usuario":"admin","senha":"admin"}'
```

Envie o token no header `Authorization: Bearer <token>`. No Swagger, use o botão **Authorize**. O segredo e a validade do token vêm de `JWT_SECRET` e `JWT_EXPIRES_IN`.

### Testes

```bash
docker compose exec api npm test
docker compose exec api npm run test:coverage
```

### SonarQube

O SonarQube sobe junto com o `docker compose up` em http://localhost:9000. A análise é feita pelo scanner, rodado sob demanda via container.

#### 1. Criar o projeto e o token (uma vez)

1. Acesse http://localhost:9000 e faça login com `admin` / `admin` (no primeiro acesso ele pede para trocar a senha).
2. Clique em **Create a local project**, use `fiap-pos-tech-18soat` como **Project key** (precisa ser igual ao `sonar.projectKey` do `sonar-project.properties`) e `main` como branch principal.
3. No método de análise, escolha **Locally** e gere um token do tipo **Project Analysis Token**.
4. Copie o token (`sqp_...`) — ele só é exibido uma vez.

#### 2. Rodar a análise

Na raiz do projeto, gere a cobertura e rode o scanner, **substituindo `<SEU_TOKEN>` pelo token gerado no passo anterior**:

```bash
docker compose exec api npm run test:coverage

docker run --rm \
  --network fiap-pos-tech-18soat_default \
  -e SONAR_HOST_URL=http://sonarqube:9000 \
  -e SONAR_TOKEN=<SEU_TOKEN> \
  -v "$(pwd):/app" \
  sonarsource/sonar-scanner-cli \
  -Dsonar.projectBaseDir=/app
```

O resultado aparece em http://localhost:9000 ao final da execução.

## Estrutura

Monólito modular organizado em vertical slices: um por agregado do event storming (`docs/ddd/event-storming`) e um por cadastro de apoio (clientes, veículos, serviços, peças).

```
src/
  app.js                 # app Express (rotas, Swagger, error handler)
  server.js              # bootstrap: conecta no Postgres e sobe o server
  shared/                # código sem dependências usado por todas as camadas (erros, paginação)
  infra/
    database/            # Sequelize (config, conexão, migrations, seeders)
    docs/                # spec OpenAPI
    http/                # error handler, validação Zod, DTO de paginação
  features/
    <slice>/
      domain/            # value objects (*.vo.js) e entidades (*.entity.js) — JS puro
      application/       # service (cadastros) ou casos de uso (agregados)
      infra/             # model Sequelize e repository
      http/              # routes (+ @openapi), controller, DTOs Zod (*.dto.js)
      index.js           # composition root + interface pública do slice
tests/                   # espelha src/ (ex.: tests/features/health/health.test.js)
```

### Camadas e injeção de dependência

As dependências apontam para dentro: `http` e `infra` conhecem `domain`; `application` conhece só `domain` e `shared`; `domain` não conhece ninguém. `domain` e `application` não importam pacotes externos (express, sequelize, zod...).

`application` nunca faz `require` de `infra`: recebe o repository pelo **construtor**, e o `index.js` do slice faz a fiação:

```js
// index.js
const clientesRepository = require('./infra/clientes.repository');
const clientesService = new ClientesService({ clientesRepository });
const clientesController = new ClientesController({ clientesService });

module.exports = {
  routes: createClientesRouter({ clientesController }),
};
```

Nos testes unitários basta injetar um fake (`{ create: jest.fn() }`), sem `jest.mock`.

Convenções de cada peça:

- **Service e controller são classes**, com as dependências em campos privados (`#clientesRepository`). Regras auxiliares viram métodos privados com nome de regra (`#ensureDocumentoIsAvailable`), para que cada método público se leia como a regra de negócio.
- **Handlers do controller são arrow functions** (`create = async (req, res) => { ... }`), porque o Express recebe o método solto (`router.post('/', clientesController.create)`) e uma arrow function mantém o `this`. Cada handler obtém o resultado numa linha e responde na seguinte.
- **Rotas e middlewares são funções `createX`** (`createClientesRouter`, `createAuthenticateMiddleware`): só montam e devolvem algo do Express, sem estado.

### Service único × casos de uso

- **Cadastros de apoio** (clientes, veículos, serviços, peças, auth): operações simétricas de CRUD, então uma única classe em `application/<slice>.service.js` com `create`, `getById`, `list`, `update`, `remove`.
- **Agregados core** (atendimento, ordem-servico, orcamento, manutencao): um arquivo por caso de uso em `application/`, com o nome do comando do event storming (ex.: `application/iniciar-atendimento.js`). Policies, que reagem a eventos em vez de serem chamadas pela API, ficam em `application/policies/`.

### Nomenclatura

O critério é: **se o termo aparece num post-it do event storming, fica em português.**

- **Português (linguagem ubíqua):** entidades, value objects e os métodos de regra deles (`peca.baixarEstoque()`, `orcamento.aprovar()`), eventos (`OrcamentoAprovado`), casos de uso dos agregados (`aprovar-orcamento.js`), a interface pública entre slices (`verificarEstoquePeca`, `baixarEstoquePeca`), tabelas, campos e rotas.
- **Inglês (encanamento técnico):** métodos de repository (`findById`, `findAll`), o CRUD dos services de cadastro (`create`, `getById`, `list`, `update`, `remove`), helpers genéricos (`normalize`, `equals`, `isValid`) e tudo que conversa com Express e Sequelize.

### Fronteiras

Cada slice expõe sua interface pública em um `index.js`. Importar arquivos internos de outro slice (`../clientes/infra/clientes.repository`) é proibido, assim como violar a direção das camadas — o ESLint (`eslint-plugin-boundaries`) acusa erro:

```bash
docker compose exec api npm run lint
```

Funções expostas no `index.js` devem retornar objetos simples, nunca instâncias do Sequelize.
