const path = require('node:path');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    servers: [{ url: '/api' }],
    info: {
      title: 'FIAP Pós Tech 18SOAT - Mecânica API',
      version: '1.0.0',
    },
    // o Swagger UI mostra os grupos nesta ordem; os comandos seguem os blocos do event storming
    tags: [
      { name: 'Público · Autenticação', description: 'Login do usuário da oficina (sem token)' },
      { name: 'Público · Consulta de OS', description: 'Cliente acompanha a OS com o número e o CPF/CNPJ (sem token)' },
      { name: 'Cadastros · Clientes', description: 'CRUD de clientes' },
      { name: 'Cadastros · Veículos', description: 'CRUD de veículos' },
      { name: 'Cadastros · Serviços', description: 'CRUD do catálogo de serviços' },
      { name: 'Cadastros · Peças/Insumos', description: 'CRUD do catálogo de peças/insumos e entradas de estoque' },
      { name: 'Fluxo da OS · Atendimento', description: 'Atendente abre a OS (status RECEBIDA)' },
      { name: 'Fluxo da OS · Diagnóstico', description: 'Mecânico diagnostica e monta o orçamento' },
      { name: 'Fluxo da OS · Orçamento', description: 'Atendente registra a aprovação ou reprovação do cliente' },
      { name: 'Gestão · Ordens de Serviço', description: 'Listagem e detalhamento das ordens de serviço' },
      { name: 'Sistema · Health', description: 'Disponibilidade da API' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      responses: {
        NaoAutenticado: {
          description: 'Token ausente, inválido ou expirado',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
        },
        DadosInvalidos: {
          description: 'Dados inválidos',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroValidacao' } } },
        },
      },
      schemas: {
        Erro: {
          type: 'object',
          properties: {
            erro: { type: 'string', example: 'Recurso não encontrado' },
          },
        },
        ErroValidacao: {
          type: 'object',
          properties: {
            erro: { type: 'string', example: 'Dados inválidos' },
            detalhes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  campo: { type: 'string', example: 'nome' },
                  mensagem: { type: 'string', example: 'Campo obrigatório' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, '../../features/**/*.routes.js')],
});

module.exports = { swaggerSpec };
