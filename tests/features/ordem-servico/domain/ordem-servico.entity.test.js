const { OrdemServico, STATUS } = require('@src/features/ordem-servico/domain/ordem-servico.entity');
const { ConflictError } = require('@src/shared/errors');
const { buildOrdemServico } = require('../ordem-servico.fixtures');

const ordemServico = (overrides = {}) => new OrdemServico(buildOrdemServico(overrides));

describe('OrdemServico', () => {
  it('recusa status desconhecido', () => {
    expect(() => ordemServico({ status: 'CANCELADA' })).toThrow('Status inválido');
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
});
