const { CalcularTempoMedio } = require('@src/features/ordem-servico/application/calcular-tempo-medio');

const setup = ({ total = { quantidade: 0, media_segundos: null }, porStatus = [] } = {}) => {
  const ordensServicoRepository = { findAverageTimes: jest.fn().mockResolvedValue({ total, porStatus }) };
  return { useCase: new CalcularTempoMedio({ ordensServicoRepository }), ordensServicoRepository };
};

describe('CalcularTempoMedio', () => {
  it('devolve o tempo total e o tempo em cada status na ordem do fluxo, com a média legível', async () => {
    const { useCase, ordensServicoRepository } = setup({
      total: { quantidade: 3, media_segundos: 187_230.6 },
      porStatus: [
        { status: 'EM_EXECUCAO', quantidade: 3, media_segundos: 5400 },
        { status: 'RECEBIDA', quantidade: 4, media_segundos: 45 },
      ],
    });

    const result = await useCase.execute({ de: '2026-10-01', ate: '2026-10-31' });

    expect(ordensServicoRepository.findAverageTimes).toHaveBeenCalledWith({ de: '2026-10-01', ate: '2026-10-31' });
    expect(result).toEqual({
      periodo: { de: '2026-10-01', ate: '2026-10-31' },
      tempo_total: {
        descricao: 'Da abertura da OS à entrega do veículo',
        quantidade: 3,
        media_segundos: 187231,
        media: '2d 4h',
      },
      por_status: [
        { status: 'RECEBIDA', quantidade: 4, media_segundos: 45, media: '45s' },
        { status: 'EM_DIAGNOSTICO', quantidade: 0, media_segundos: null, media: null },
        { status: 'AGUARDANDO_APROVACAO', quantidade: 0, media_segundos: null, media: null },
        { status: 'EM_EXECUCAO', quantidade: 3, media_segundos: 5400, media: '1h 30min' },
        { status: 'FINALIZADA', quantidade: 0, media_segundos: null, media: null },
      ],
    });
  });

  it('sem período nem histórico, as médias vêm null em vez de zero', async () => {
    const { useCase, ordensServicoRepository } = setup();

    const result = await useCase.execute();

    expect(ordensServicoRepository.findAverageTimes).toHaveBeenCalledWith({ de: null, ate: null });
    expect(result.periodo).toEqual({ de: null, ate: null });
    expect(result.tempo_total).toMatchObject({ quantidade: 0, media_segundos: null, media: null });
    expect(result.por_status.every(({ media }) => media === null)).toBe(true);
  });

  it.each([
    [60, '1min'],
    [3600, '1h'],
    [86_400, '1d'],
    [90_061, '1d 1h 1min'],
  ])('formata %i segundos como "%s"', async (segundos, esperado) => {
    const { useCase } = setup({ total: { quantidade: 1, media_segundos: segundos } });

    await expect(useCase.execute()).resolves.toMatchObject({ tempo_total: { media: esperado } });
  });
});
