const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../infra/database/sequelize');
const { STATUS, subtotal } = require('../domain/orcamento.entity');

// underscored só renomeia as colunas; aqui os atributos (e o JSON da API) também ficam em snake_case
const timestamps = { underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' };

// o driver do Postgres devolve DECIMAL como string para não perder precisão
const toNumber = (value) => (value != null ? Number(value) : value);

const Orcamento = sequelize.define(
  'Orcamento',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ordem_servico_id: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.ENUM(...Object.values(STATUS)), allowNull: false, defaultValue: STATUS.EM_DIAGNOSTICO },
    valor_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    expira_em: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'orcamentos', ...timestamps },
);

const OrcamentoServico = sequelize.define(
  'OrcamentoServico',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orcamento_id: { type: DataTypes.UUID, allowNull: false },
    servico_id: { type: DataTypes.UUID, allowNull: false },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    valor_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  { tableName: 'orcamento_servicos', ...timestamps },
);

const OrcamentoPeca = sequelize.define(
  'OrcamentoPeca',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orcamento_id: { type: DataTypes.UUID, allowNull: false },
    peca_id: { type: DataTypes.UUID, allowNull: false },
    codigo: { type: DataTypes.STRING(30), allowNull: false },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    tipo: { type: DataTypes.STRING(10), allowNull: false },
    unidade_medida: { type: DataTypes.STRING(10), allowNull: false },
    quantidade: { type: DataTypes.INTEGER, allowNull: false },
    valor_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  { tableName: 'orcamento_pecas', ...timestamps },
);

Orcamento.hasMany(OrcamentoServico, { as: 'servicos', foreignKey: 'orcamento_id' });
Orcamento.hasMany(OrcamentoPeca, { as: 'pecas', foreignKey: 'orcamento_id' });
// usado para somar as reservas de peças dos orçamentos enviados
OrcamentoPeca.belongsTo(Orcamento, { foreignKey: 'orcamento_id' });

function itemToJSON() {
  const values = { ...this.get() };
  values.valor_unitario = toNumber(values.valor_unitario);
  return values;
}

OrcamentoServico.prototype.toJSON = itemToJSON;

// calculado, não gravado: todo orçamento que sai do slice passa por aqui e usa a mesma conta do valor total
OrcamentoPeca.prototype.toJSON = function toJSON() {
  const values = itemToJSON.call(this);
  if (values.quantidade != null && values.valor_unitario != null) values.subtotal = subtotal(values);
  return values;
};

Orcamento.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  values.valor_total = toNumber(values.valor_total);
  if (values.servicos) values.servicos = values.servicos.map((servico) => servico.toJSON());
  if (values.pecas) values.pecas = values.pecas.map((peca) => peca.toJSON());
  return values;
};

module.exports = { Orcamento, OrcamentoServico, OrcamentoPeca };
