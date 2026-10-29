const mockTransaction = { LOCK: { UPDATE: 'UPDATE', NO_KEY_UPDATE: 'NO KEY UPDATE' } };

jest.mock('@src/infra/database/sequelize', () => ({
  sequelize: { transaction: jest.fn((callback) => callback(mockTransaction)), query: jest.fn() },
}));
jest.mock('@src/features/ordem-servico/infra/ordens-servico.model', () => ({
  OrdemServico: { create: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), findAndCountAll: jest.fn() },
  OrdemServicoHistorico: { create: jest.fn() },
}));

const { sequelize } = require('@src/infra/database/sequelize');
const { OrdemServico, OrdemServicoHistorico } = require('@src/features/ordem-servico/infra/ordens-servico.model');
const ordensServicoRepository = require('@src/features/ordem-servico/infra/ordens-servico.repository');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const os = buildOrdemServico();

beforeEach(() => jest.clearAllMocks());

describe('ordensServicoRepository.create', () => {
  it('grava, registra RECEBIDA no histórico na mesma transação e devolve objeto simples', async () => {
    OrdemServico.create.mockResolvedValue({ toJSON: () => os });
    const dados = { cliente_id: os.cliente_id, veiculo_id: os.veiculo_id, queixa: os.queixa, status: 'RECEBIDA' };

    await expect(ordensServicoRepository.create(dados)).resolves.toEqual(os);
    expect(OrdemServico.create).toHaveBeenCalledWith(dados, { transaction: mockTransaction });
    expect(OrdemServicoHistorico.create).toHaveBeenCalledWith(
      { ordem_servico_id: os.id, status_anterior: null, status: 'RECEBIDA', alterado_em: os.updated_at },
      { transaction: mockTransaction },
    );
  });
});

describe('ordensServicoRepository.findByNumero', () => {
  it('devolve objeto simples ou null', async () => {
    OrdemServico.findOne.mockResolvedValueOnce({ toJSON: () => os }).mockResolvedValueOnce(null);

    await expect(ordensServicoRepository.findByNumero(42)).resolves.toEqual(os);
    await expect(ordensServicoRepository.findByNumero(43)).resolves.toBeNull();
    expect(OrdemServico.findOne).toHaveBeenCalledWith({ where: { numero: 42 } });
  });
});

describe('ordensServicoRepository.findAll', () => {
  it('aplica todos os filtros, pagina e ordena das mais recentes', async () => {
    OrdemServico.findAndCountAll.mockResolvedValue({ rows: [{ toJSON: () => os }], count: 1 });

    const result = await ordensServicoRepository.findAll({
      page: 2,
      limit: 10,
      filtros: { status: 'RECEBIDA', cliente_id: os.cliente_id, veiculo_id: os.veiculo_id },
    });

    expect(OrdemServico.findAndCountAll).toHaveBeenCalledWith({
      where: { status: 'RECEBIDA', cliente_id: os.cliente_id, veiculo_id: os.veiculo_id },
      offset: 10,
      limit: 10,
      order: [
        ['created_at', 'DESC'],
        ['numero', 'DESC'],
      ],
    });
    expect(result).toEqual({ rows: [os], count: 1 });
  });

  it('sem filtros', async () => {
    OrdemServico.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await ordensServicoRepository.findAll({ page: 1, limit: 20 });

    expect(OrdemServico.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ where: {}, offset: 0 }));
  });
});

describe('ordensServicoRepository.updateWithLock', () => {
  it('trava a linha, aplica a mudança e grava na mesma transação', async () => {
    const updated = { ...os, status: 'EM_DIAGNOSTICO' };
    const row = { toJSON: jest.fn().mockReturnValueOnce(os).mockReturnValueOnce(updated), update: jest.fn() };
    OrdemServico.findByPk.mockResolvedValue(row);
    const change = jest.fn().mockReturnValue({ status: 'EM_DIAGNOSTICO' });

    const result = await ordensServicoRepository.updateWithLock(os.id, change);

    // NO KEY UPDATE para não bloquear quem grava um orçamento com FK para a OS
    expect(OrdemServico.findByPk).toHaveBeenCalledWith(os.id, { transaction: mockTransaction, lock: 'NO KEY UPDATE' });
    expect(change).toHaveBeenCalledWith(os);
    expect(row.update).toHaveBeenCalledWith({ status: 'EM_DIAGNOSTICO' }, { transaction: mockTransaction });
    expect(result).toEqual(updated);
  });

  it('registra a mudança de status no histórico, na mesma transação', async () => {
    const updated = { ...os, status: 'EM_DIAGNOSTICO', updated_at: '2026-10-29T12:00:00.000Z' };
    const row = { toJSON: jest.fn().mockReturnValueOnce(os).mockReturnValueOnce(updated), update: jest.fn() };
    OrdemServico.findByPk.mockResolvedValue(row);

    await ordensServicoRepository.updateWithLock(os.id, () => ({ status: 'EM_DIAGNOSTICO' }));

    expect(OrdemServicoHistorico.create).toHaveBeenCalledWith(
      {
        ordem_servico_id: os.id,
        status_anterior: 'RECEBIDA',
        status: 'EM_DIAGNOSTICO',
        alterado_em: '2026-10-29T12:00:00.000Z',
      },
      { transaction: mockTransaction },
    );
  });

  it('usa a data gravada pela mudança (lida depois do update), não a anterior', async () => {
    // fake no formato do Sequelize: o update altera os valores que o toJSON devolve
    const row = {
      dataValues: { ...os },
      toJSON() {
        return { ...this.dataValues };
      },
      update: jest.fn(async function update(data) {
        Object.assign(this.dataValues, data, { updated_at: '2026-10-29T15:00:00.000Z' });
      }),
    };
    OrdemServico.findByPk.mockResolvedValue(row);

    await ordensServicoRepository.updateWithLock(os.id, () => ({ status: 'EM_DIAGNOSTICO' }));

    expect(OrdemServicoHistorico.create.mock.calls[0][0].alterado_em).toBe('2026-10-29T15:00:00.000Z');
  });

  it('não registra histórico quando o status não muda', async () => {
    const row = { toJSON: jest.fn().mockReturnValue(os), update: jest.fn() };
    OrdemServico.findByPk.mockResolvedValue(row);

    await ordensServicoRepository.updateWithLock(os.id, () => ({ status: os.status }));

    expect(OrdemServicoHistorico.create).not.toHaveBeenCalled();
  });

  it('devolve null sem chamar a mudança quando a OS não existe', async () => {
    OrdemServico.findByPk.mockResolvedValue(null);
    const change = jest.fn();

    await expect(ordensServicoRepository.updateWithLock(os.id, change)).resolves.toBeNull();
    expect(change).not.toHaveBeenCalled();
  });

  it('não grava quando a mudança lança erro', async () => {
    const row = { toJSON: () => os, update: jest.fn() };
    OrdemServico.findByPk.mockResolvedValue(row);

    await expect(
      ordensServicoRepository.updateWithLock(os.id, () => {
        throw new Error('Transição inválida');
      }),
    ).rejects.toThrow('Transição inválida');
    expect(row.update).not.toHaveBeenCalled();
  });
});

describe('ordensServicoRepository.findById', () => {
  it('devolve objeto simples ou null', async () => {
    OrdemServico.findByPk.mockResolvedValueOnce({ toJSON: () => os }).mockResolvedValueOnce(null);

    await expect(ordensServicoRepository.findById(os.id)).resolves.toEqual(os);
    await expect(ordensServicoRepository.findById(os.id)).resolves.toBeNull();
    expect(OrdemServico.findByPk).toHaveBeenCalledWith(os.id);
  });
});

describe('ordensServicoRepository.findAverageTimes', () => {
  it('agrega no banco o tempo total (abertura → entrega) e o tempo em cada status, com o período', async () => {
    const total = { quantidade: 2, media_segundos: 7200 };
    const porStatus = [{ status: 'EM_EXECUCAO', quantidade: 2, media_segundos: 3600 }];
    sequelize.query.mockResolvedValueOnce([total]).mockResolvedValueOnce(porStatus);

    const result = await ordensServicoRepository.findAverageTimes({ de: '2026-10-01', ate: '2026-10-31' });

    expect(result).toEqual({ total, porStatus });
    const [[sqlTotal, opcoes], [sqlPorStatus]] = sequelize.query.mock.calls;
    expect(sqlTotal).toContain("h.status = 'ENTREGUE'");
    expect(sqlPorStatus).toContain('OVER (PARTITION BY ordem_servico_id ORDER BY alterado_em, sequencia)');
    expect(opcoes).toMatchObject({ replacements: { de: '2026-10-01', ate: '2026-10-31' }, type: 'SELECT' });
  });

  it('sem período, passa as datas como null', async () => {
    sequelize.query.mockResolvedValueOnce([{ quantidade: 0, media_segundos: null }]).mockResolvedValueOnce([]);

    await ordensServicoRepository.findAverageTimes();

    expect(sequelize.query.mock.calls[0][1].replacements).toEqual({ de: null, ate: null });
  });
});
