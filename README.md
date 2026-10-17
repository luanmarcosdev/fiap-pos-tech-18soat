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

`application` nunca faz `require` de `infra`: recebe o repository por **factory**, e o `index.js` do slice faz a fiação:

```js
// index.js
const clientesRepository = require('./infra/clientes.repository');
const clientesService = makeClientesService({ clientesRepository });
```

Nos testes unitários basta injetar um fake (`{ create: jest.fn() }`), sem `jest.mock`.

### Service único × casos de uso

- **Cadastros de apoio** (clientes, veículos, serviços, peças, auth): operações simétricas de CRUD, então um único `application/<slice>.service.js` com `create`, `getById`, `list`, `update`, `remove`.
- **Agregados core** (atendimento, ordem-servico, orcamento, manutencao): um arquivo por caso de uso, com o nome do comando do event storming (ex.: `application/iniciar-atendimento.js` exportando `makeIniciarAtendimento`).

### Nomenclatura

Métodos e verbos em inglês (`create`, `getById`, `findById`, `update`, `remove`); termos de domínio, tabelas, campos e rotas em português (linguagem ubíqua).

### Fronteiras

Cada slice expõe sua interface pública em um `index.js`. Importar arquivos internos de outro slice (`../clientes/infra/clientes.repository`) é proibido, assim como violar a direção das camadas — o ESLint (`eslint-plugin-boundaries`) acusa erro:

```bash
docker compose exec api npm run lint
```

Funções expostas no `index.js` devem retornar objetos simples, nunca instâncias do Sequelize.
