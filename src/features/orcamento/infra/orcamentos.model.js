const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../infra/database/sequelize');
const { STATUS } = require('../domain/orcamento.entity');

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
    quantidade: { type: DataTypes.INTEGER, allowNull: false },
    valor_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  { tableName: 'orcamento_pecas', ...timestamps },
);

Orcamento.hasMany(OrcamentoServico, { as: 'servicos', foreignKey: 'orcamento_id' });
Orcamento.hasMany(OrcamentoPeca, { as: 'pecas', foreignKey: 'orcamento_id' });

function itemToJSON() {
  const values = { ...this.get() };
  values.valor_unitario = toNumber(values.valor_unitario);
  return values;
}

OrcamentoServico.prototype.toJSON = itemToJSON;
OrcamentoPeca.prototype.toJSON = itemToJSON;

Orcamento.prototype.toJSON = function toJSON() {
  const values = { ...this.get() };
  values.valor_total = toNumber(values.valor_total);
  if (values.servicos) values.servicos = values.servicos.map((servico) => servico.toJSON());
  if (values.pecas) values.pecas = values.pecas.map((peca) => peca.toJSON());
  return values;
};

module.exports = { Orcamento, OrcamentoServico, OrcamentoPeca };
