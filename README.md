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

Organizada em vertical slices, um por agregado do event storming (`docs/ddd/event-storming`):

```
src/
  app.js                 # app Express (rotas + Swagger)
  server.js              # bootstrap: conecta no Postgres e sobe o server
  infra/
    database/            # Sequelize (config, conexão, migrations, seeders)
    docs/                # spec OpenAPI
  features/
    health/
    atendimento/
    ordem-servico/
    orcamento/
    manutencao/
```

Cada slice concentra suas rotas, casos de uso, modelos e testes, com uma pasta por comando do event storming (ex.: `atendimento/iniciar-atendimento/`). Rotas são documentadas no Swagger via blocos `@openapi` em arquivos `*.routes.js`.

### Fronteiras entre slices

Cada slice expõe sua interface pública em um `index.js` (rotas e funções que outros slices podem usar). Importar arquivos internos de outro slice (`../atendimento/atendimento.model`) é proibido — o ESLint (`eslint-plugin-boundaries`) acusa erro:

```bash
docker compose exec api npm run lint
```

Funções expostas no `index.js` devem retornar objetos simples, nunca instâncias do Sequelize.
