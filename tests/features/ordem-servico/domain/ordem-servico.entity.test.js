const { OrdemServico, STATUS } = require('@src/features/ordem-servico/domain/ordem-servico.entity');
const { ConflictError, ValidationError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const ordemServico = (overrides = {}) => new OrdemServico(buildOrdemServico(overrides));

describe('OrdemServico', () => {
  it('recusa status desconhecido', () => {
    expect(() => ordemServico({ status: 'CANCELADA' })).toThrow('Status inválido');
  });

  it.each([
    [STATUS.RECEBIDA, false],
    [STATUS.EM_DIAGNOSTICO, false],
    [STATUS.AGUARDANDO_APROVACAO, true],
    [STATUS.EM_EXECUCAO, true],
    [STATUS.FINALIZADA, true],
    [STATUS.ENTREGUE, true],
  ])('diagnosticoConcluido com a OS %s é %s', (status, esperado) => {
    expect(ordemServico({ status }).diagnosticoConcluido).toBe(esperado);
  });

  describe('criar (Cria Ordem de Serviço)', () => {
    const dados = { cliente_id: 'cliente', veiculo_id: 'veiculo', queixa: '  Barulho ao frear ' };

    it('devolve os dados da OS RECEBIDA com a queixa sem espaços', () => {
      expect(OrdemServico.criar(dados)).toEqual({
        cliente_id: 'cliente',
        veiculo_id: 'veiculo',
        queixa: 'Barulho ao frear',
        status: STATUS.RECEBIDA,
      });
    });

    it.each([
      ['ausente', undefined],
      ['vazia', '   '],
      ['não texto', 42],
    ])('gera ValidationError com queixa %s', (_, queixa) => {
      expect(() => OrdemServico.criar({ ...dados, queixa })).toThrow(ValidationError);
    });
  });

  describe('criada (Ordem de Serviço Criada)', () => {
    it('devolve o evento OrdemServicoCriada da OS gravada', () => {
      expect(ordemServico().criada()).toEqual({
        tipo: 'OrdemServicoCriada',
        ordemServicoId: '3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a',
        numero: 42,
        clienteId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      });
    });

    it('lança quando a OS já saiu de RECEBIDA', () => {
      expect(() => ordemServico({ status: STATUS.EM_DIAGNOSTICO }).criada()).toThrow('não está recebida');
    });
  });

  describe('iniciarDiagnostico (Inicia Diagnóstico)', () => {
    it('passa de RECEBIDA para EM_DIAGNOSTICO e devolve o evento DiagnosticoIniciado', () => {
      const os = ordemServico();

      const evento = os.iniciarDiagnostico();

      expect(os.status).toBe(STATUS.EM_DIAGNOSTICO);
      expect(evento).toEqual({
        tipo: 'DiagnosticoIniciado',
        ordemServicoId: '3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a',
        numero: 42,
        clienteId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      });
    });

    it.each(Object.values(STATUS).filter((status) => status !== STATUS.RECEBIDA))(
      'gera ConflictError com a OS em %s',
      (status) => {
        const os = ordemServico({ status });

        expect(() => os.iniciarDiagnostico()).toThrow(
          new ConflictError('Só é possível iniciar o diagnóstico de uma ordem de serviço recebida'),
        );
        expect(os.status).toBe(status);
      },
    );
  });

  describe('adicionarServico (Adiciona Serviço)', () => {
    it('vale durante o diagnóstico, sem mudar o status, e devolve o evento ServicoAdicionado', () => {
      const os = ordemServico({ status: STATUS.EM_DIAGNOSTICO });

      expect(os.adicionarServico()).toMatchObject({ tipo: 'ServicoAdicionado', numero: 42 });
      expect(os.status).toBe(STATUS.EM_DIAGNOSTICO);
    });

    it.each(Object.values(STATUS).filter((status) => status !== STATUS.EM_DIAGNOSTICO))(
      'gera ConflictError com a OS em %s',
      (status) => {
        expect(() => ordemServico({ status }).adicionarServico()).toThrow(
          new ConflictError('Só é possível adicionar serviços durante o diagnóstico'),
        );
      },
    );
  });

  describe('concluirDiagnostico (Conclui Diagnóstico)', () => {
    it('registra o diagnóstico sem espaços nas pontas, passa a AGUARDANDO_APROVACAO e devolve DiagnosticoConcluido', () => {
      const os = ordemServico({ status: STATUS.EM_DIAGNOSTICO });

      const evento = os.concluirDiagnostico('  Pastilhas gastas  ');

      expect(os.status).toBe(STATUS.AGUARDANDO_APROVACAO);
      expect(os.diagnostico).toBe('Pastilhas gastas');
      expect(evento).toMatchObject({ tipo: 'DiagnosticoConcluido', numero: 42 });
    });

    it.each(['', '   ', null, undefined, 42])('gera ValidationError com diagnóstico %p', (diagnostico) => {
      const os = ordemServico({ status: STATUS.EM_DIAGNOSTICO });

      expect(() => os.concluirDiagnostico(diagnostico)).toThrow(ValidationError);
      expect(os.status).toBe(STATUS.EM_DIAGNOSTICO);
    });

    it.each(Object.values(STATUS).filter((status) => status !== STATUS.EM_DIAGNOSTICO))(
      'gera ConflictError com a OS em %s',
      (status) => {
        expect(() => ordemServico({ status }).concluirDiagnostico('ok')).toThrow(
          new ConflictError('Só é possível concluir o diagnóstico de uma ordem de serviço em diagnóstico'),
        );
      },
    );

    it('começa sem diagnóstico quando ele não é informado', () => {
      expect(new OrdemServico({ id: 'os', status: STATUS.RECEBIDA }).diagnostico).toBeNull();
    });
  });

  describe('finalizarSemExecucao (Finalizar Ordem de Serviço)', () => {
    it('passa de AGUARDANDO_APROVACAO para FINALIZADA e devolve o evento OrdemServicoFinalizada', () => {
      const os = ordemServico({ status: STATUS.AGUARDANDO_APROVACAO });

      expect(os.finalizarSemExecucao()).toMatchObject({ tipo: 'OrdemServicoFinalizada', numero: 42 });
      expect(os.status).toBe(STATUS.FINALIZADA);
    });

    it('já finalizada, não muda nada e devolve null (retomada depois de uma falha)', () => {
      const os = ordemServico({ status: STATUS.FINALIZADA });

      expect(os.finalizarSemExecucao()).toBeNull();
      expect(os.status).toBe(STATUS.FINALIZADA);
    });

    it.each([STATUS.RECEBIDA, STATUS.EM_DIAGNOSTICO, STATUS.EM_EXECUCAO, STATUS.ENTREGUE])(
      'gera ConflictError com a OS em %s',
      (status) => {
        expect(() => ordemServico({ status }).finalizarSemExecucao()).toThrow(
          new ConflictError('Só é possível finalizar sem execução uma ordem de serviço aguardando aprovação'),
        );
      },
    );
  });

  describe('adicionarPeca (Adiciona Peças/Insumos)', () => {
    it('vale durante o diagnóstico, sem mudar o status, e devolve o evento PecasInsumosAdicionados', () => {
      const os = ordemServico({ status: STATUS.EM_DIAGNOSTICO });

      expect(os.adicionarPeca()).toMatchObject({ tipo: 'PecasInsumosAdicionados', numero: 42 });
      expect(os.status).toBe(STATUS.EM_DIAGNOSTICO);
    });

    it.each(Object.values(STATUS).filter((status) => status !== STATUS.EM_DIAGNOSTICO))(
      'gera ConflictError com a OS em %s',
      (status) => {
        expect(() => ordemServico({ status }).adicionarPeca()).toThrow(
          new ConflictError('Só é possível adicionar peças e insumos durante o diagnóstico'),
        );
      },
    );
  });
});
