# Sistema Integrado de Atendimento e Execução de Serviços — Oficina Mecânica

Tech Challenge da **Fase 1 da Pós-Tech SOAT (Software Architecture) — FIAP**: MVP do back-end de gestão de uma oficina mecânica, construído com Domain-Driven Design.

## Sumário

- [Objetivo do projeto](#objetivo-do-projeto)
- [Descrição da solução](#descrição-da-solução)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Banco de dados: decisão e justificativa](#banco-de-dados-decisão-e-justificativa)
- [Pré-requisitos](#pré-requisitos)
- [Execução local via Docker](#execução-local-via-docker)
- [Documentação da API (Swagger)](#documentação-da-api-swagger)
- [Autenticação e credenciais de teste](#autenticação-e-credenciais-de-teste)
- [Testes](#testes)
- [Análise de qualidade e vulnerabilidades (SonarQube)](#análise-de-qualidade-e-vulnerabilidades-sonarqube)
- [Estrutura de diretórios](#estrutura-de-diretórios)
- [Documentação DDD](#documentação-ddd)
- [Vídeo da entrega](#vídeo-da-entrega)

## Objetivo do projeto

Uma oficina mecânica de médio porte controla atendimento, diagnóstico, execução e entrega dos veículos com anotações manuais e planilhas, o que causa erros na priorização dos atendimentos, falhas no controle de peças e insumos, dificuldade em acompanhar o status dos serviços, perda de histórico de clientes e veículos e um fluxo de orçamentos e autorizações ineficiente.

O objetivo deste projeto é entregar a primeira versão (MVP) do back-end do **Sistema Integrado de Atendimento e Execução de Serviços**, com foco em gestão de ordens de serviço, clientes e peças, aplicando DDD e boas práticas de qualidade de software e segurança.

## Descrição da solução

API REST monolítica em Node.js que cobre o ciclo de vida completo de uma Ordem de Serviço (OS):

- **Criação da OS:** identificação do cliente por CPF/CNPJ, vínculo com o veículo (placa, marca, modelo, ano) e registro da queixa inicial. A OS nasce com status **Recebida**.
- **Diagnóstico e orçamento:** o mecânico inclui serviços e peças/insumos na OS; o orçamento é gerado automaticamente a partir dos preços do catálogo e enviado ao cliente para aprovação.
- **Aprovação ou reprovação do orçamento:** enquanto aguarda resposta, o orçamento enviado reserva as peças/insumos; a aprovação dá baixa no estoque e a reprovação libera a reserva e encerra a OS.
- **Acompanhamento:** os status mudam automaticamente conforme as ações no sistema — **Recebida → Em diagnóstico → Aguardando aprovação → Em execução → Finalizada → Entregue** — respeitando as regras de transição do domínio.
- **Consulta pública do cliente:** `POST /api/ordens-servico/consulta` com o número da OS e o CPF/CNPJ, sem necessidade de token.
- **Gestão administrativa:** CRUD de clientes, veículos, serviços e peças/insumos (com entrada e controle de estoque), listagem e detalhamento de OS e cálculo do tempo médio de execução (`GET /api/ordens-servico/tempo-medio`).
- **Segurança:** autenticação JWT nas APIs administrativas e validação de dados sensíveis (CPF/CNPJ e placa) em Value Objects do domínio e DTOs Zod na borda HTTP.

## Arquitetura

**Monólito modular organizado em vertical slices** (`src/features/`). Cada slice corresponde a um agregado do event storming (ordem-servico, orcamento) ou a um cadastro de apoio (clientes, veículos, serviços, peças) e possui suas próprias camadas, isolando o domínio das regras de infraestrutura:

| Camada        | Responsabilidade                                                        |
|---------------|-------------------------------------------------------------------------|
| `domain`      | Entidades, Value Objects e regras de negócio — JavaScript puro          |
| `application` | Casos de uso (agregados) ou service (cadastros); orquestra o domínio    |
| `infra`       | Models Sequelize e repositories (persistência no PostgreSQL)            |
| `http`        | Rotas Express, controllers, DTOs Zod e documentação OpenAPI             |

O atendimento (cliente chegando à oficina) não é um agregado próprio: seu resultado é o comando **Cria OS**, implementado no slice `ordem-servico`.

### C4 Model

O modelo C4 (níveis de Contexto, Contêineres e Componentes) está em [`docs/ddd/modelC4.dsl`](docs/ddd/modelC4.dsl), escrito em Structurizr DSL. Para visualizar, cole o conteúdo em <https://structurizr.com/dsl>.

Resumo:

- **Atores:** Cliente (consulta status, aprova/reprova orçamento), Atendente (cadastros e abertura de OS) e Mecânico (diagnóstico e execução).
- **Contêineres:** API Back-end monolítica (Node.js/Express) → Banco de dados relacional (PostgreSQL).
- **Componentes da API:** Controllers (REST + DTOs) → Application (casos de uso) → Domain (entidades e VOs) ← Infrastructure (repositórios, JWT).

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
- **Agregados core** (ordem-servico, orcamento): um arquivo por caso de uso em `application/`, com o nome do comando do event storming (ex.: `application/criar-ordem-servico.js`, `application/aprovar-orcamento.js`). Policies, que reagem a eventos em vez de serem chamadas pela API, ficam em `application/policies/`.

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

## Tecnologias

| Categoria            | Tecnologia                                                     |
|----------------------|----------------------------------------------------------------|
| Linguagem / runtime  | JavaScript, Node.js                                            |
| Framework HTTP       | Express 5                                                      |
| Banco de dados       | PostgreSQL 16                                                  |
| ORM / migrations     | Sequelize + sequelize-cli                                      |
| Validação            | Zod (DTOs) + Value Objects do domínio                          |
| Autenticação         | JWT (jsonwebtoken) + bcryptjs                                  |
| Documentação da API  | Swagger / OpenAPI (swagger-jsdoc + swagger-ui-express)         |
| Testes               | Jest + Supertest                                               |
| Qualidade            | ESLint (+ eslint-plugin-boundaries), SonarQube                 |
| Infraestrutura       | Docker, Docker Compose                                         |

## Banco de dados: decisão e justificativa

O banco escolhido é o **PostgreSQL**, por dois motivos:

- **Natureza altamente relacional do domínio:** o domínio tem forte acoplamento estrutural e exige integridade referencial estrita entre as entidades fundamentais: um *Cliente* possui um ou mais *Veículos*; cada *Ordem de Serviço* está vinculada a um único *Veículo*; e a OS agrega múltiplos *Serviços* e *Peças/Insumos*. O modelo relacional representa esse mapeamento de forma natural e eficiente, com chaves estrangeiras e baixo custo de complexidade.
- **Garantia de transações ACID (consistência):** processos críticos do negócio — como a aprovação do orçamento, que exige ao mesmo tempo a mudança de status da OS e a baixa/reserva dos itens no estoque — precisam de atomicidade e isolamento. O PostgreSQL oferece transações ACID nativas, que evitam condições de corrida e garantem que o sistema nunca fique em estado inconsistente (por exemplo, uma OS aprovada sem o respectivo abatimento de estoque).

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) com Docker Compose
- Git

Não é necessário ter Node.js instalado na máquina: tudo roda em containers.

## Execução local via Docker

1. Clone o repositório e crie o arquivo de ambiente:

   ```bash
   git clone https://github.com/luanmarcosdev/fiap-pos-tech-18soat.git
   cd fiap-pos-tech-18soat
   cp .env.example .env
   ```

2. Suba o ambiente (API, PostgreSQL, Redis e SonarQube):

   ```bash
   docker compose up -d --build
   ```

3. Crie as tabelas e o usuário admin:

   ```bash
   docker compose exec api npm run db:migrate
   docker compose exec api npm run db:seed
   ```

| Serviço    | URL                                  |
|------------|--------------------------------------|
| API        | http://localhost:3000/api            |
| Swagger    | http://localhost:3000/api/docs       |
| SonarQube  | http://localhost:9000 (admin/admin)  |
| Postgres   | localhost:5432                       |
| Redis      | localhost:6379                       |

O código em `src/` é montado como volume no container da API e o `node --watch` reinicia o server a cada alteração — não é preciso rebuildar a imagem. Rebuild (`docker compose up -d --build`) só é necessário ao mudar dependências no `package.json`.

### Banco de dados

Migrations e seeders ficam em `src/infra/database/` e rodam via `sequelize-cli`:

```bash
docker compose exec api npm run db:migrate        # aplica as migrations
docker compose exec api npm run db:seed           # cria o usuário admin (idempotente)
docker compose exec api npm run db:migrate:undo   # desfaz a última migration
docker compose exec api npm run db:seed:undo      # remove os dados dos seeders
```

## Documentação da API (Swagger)

Com o ambiente no ar, acesse **http://localhost:3000/api/docs**. Todas as rotas estão documentadas (schemas, exemplos e respostas de erro). Para chamar as rotas administrativas, faça login, clique em **Authorize** e cole o token.

## Autenticação e credenciais de teste

| Usuário | Senha   |
|---------|---------|
| `admin` | `admin` |

O usuário é criado pelo seeder com `ADMIN_USUARIO` e `ADMIN_SENHA` do `.env` (valores padrão do `.env.example`).

Para obter o token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usuario":"admin","senha":"admin"}'
```

Envie o token no header `Authorization: Bearer <token>`. O segredo e a validade do token vêm de `JWT_SECRET` e `JWT_EXPIRES_IN`.

- **Rotas públicas:** `GET /api/health`, `POST /api/auth/login` e `POST /api/ordens-servico/consulta` (consulta da OS pelo cliente).
- **Rotas administrativas (JWT):** `/api/clientes`, `/api/veiculos`, `/api/servicos`, `/api/pecas`, `/api/ordens-servico` e `/api/orcamentos`.

## Testes

Testes unitários (domínio, casos de uso, services) e de integração (rotas HTTP com Supertest) ficam em `tests/`, espelhando `src/`:

```bash
docker compose exec api npm test                 # roda a suíte
docker compose exec api npm run test:coverage    # roda com relatório de cobertura
```

O relatório de cobertura é gerado em `coverage/` (abra `coverage/lcov-report/index.html` no navegador). A meta é de no mínimo 80% de cobertura nos domínios críticos.

## Análise de qualidade e vulnerabilidades (SonarQube)

O SonarQube sobe junto com o `docker compose up` em http://localhost:9000. A análise é feita pelo scanner, rodado sob demanda via container.

### 1. Criar o projeto e o token (uma vez)

1. Acesse http://localhost:9000 e faça login com `admin` / `admin` (no primeiro acesso ele pede para trocar a senha).
2. Clique em **Create a local project**, use `fiap-pos-tech-18soat` como **Project key** (precisa ser igual ao `sonar.projectKey` do `sonar-project.properties`) e `main` como branch principal.
3. No método de análise, escolha **Locally** e gere um token do tipo **Project Analysis Token**.
4. Copie o token (`sqp_...`) — ele só é exibido uma vez.

### 2. Rodar a análise

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

## Estrutura de diretórios

```
docs/
  ddd/                   # event storming (PDF e imagens), linguagem ubíqua e C4 model
src/
  app.js                 # app Express (rotas, Swagger, error handler)
  server.js              # bootstrap: conecta no Postgres e sobe o server
  shared/                # código sem dependências usado por todas as camadas (erros, paginação)
  infra/
    database/            # Sequelize (config, conexão, migrations, seeders)
    docs/                # spec OpenAPI
    http/                # error handler, validação Zod, DTO de paginação
  features/
    auth/                # login e middleware JWT
    clientes/            # cadastro de apoio
    veiculos/            # cadastro de apoio
    servicos/            # cadastro de apoio
    pecas/               # cadastro de apoio + controle de estoque
    ordem-servico/       # agregado core: ciclo de vida da OS
    orcamento/           # agregado core: aprovação/reprovação do orçamento
    health/              # health check
    <slice>/
      domain/            # value objects (*.vo.js) e entidades (*.entity.js) — JS puro
      application/       # service (cadastros) ou casos de uso (agregados)
      infra/             # model Sequelize e repository
      http/              # routes (+ @openapi), controller, DTOs Zod (*.dto.js)
      index.js           # composition root + interface pública do slice
tests/                   # espelha src/ (ex.: tests/features/health/health.test.js)
```

## Documentação DDD

- **Miro (Event Storming e diagramas):** <https://miro.com/app/board/uXjVHhXvUKg=/>
- **Event Storming exportado:** [`docs/ddd/event-storming/event-storming.pdf`](docs/ddd/event-storming/event-storming.pdf)
  - [Criação da OS](docs/ddd/event-storming/event-storming-criacao-os.jpg)
  - [Acompanhamento da OS](docs/ddd/event-storming/event-storming-acompanhamento-os.jpg)
  - [Gestão de peças e insumos](docs/ddd/event-storming/event-storming-gestao-pecas-insumos.jpg)
- **Linguagem ubíqua e glossário:** [`docs/ddd/linguagem-ubiqua.md`](docs/ddd/linguagem-ubiqua.md)
- **C4 Model:** [`docs/ddd/modelC4.dsl`](docs/ddd/modelC4.dsl)

A implementação segue o event storming: cada comando vira um caso de uso com o mesmo nome em `application/` (ex.: *Aprova Orçamento* → `orcamento/application/aprovar-orcamento.js`), e os termos da linguagem ubíqua são usados em entidades, eventos, tabelas e rotas.


