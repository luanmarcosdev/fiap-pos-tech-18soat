const { STATUS } = require('../domain/ordem-servico.entity');

// ENTREGUE é o último status: a OS não sai dele, então não tem tempo de permanência
const ETAPAS = Object.values(STATUS).filter((status) => status !== STATUS.ENTREGUE);

/** "1d 4h 30min" a partir de segundos; abaixo de um minuto, "45s". */
function formatarDuracao(segundos) {
  if (segundos < 60) return `${segundos}s`;
  const minutosTotais = Math.floor(segundos / 60);
  const partes = [
    [Math.floor(minutosTotais / 1440), 'd'],
    [Math.floor((minutosTotais % 1440) / 60), 'h'],
    [minutosTotais % 60, 'min'],
  ];
  return partes
    .filter(([valor]) => valor > 0)
    .map(([valor, unidade]) => `${valor}${unidade}`)
    .join(' ');
}

/**
 * "Monitoramento do tempo médio de execução dos serviços" (gestão administrativa): quanto tempo a OS leva da
 * abertura à entrega do veículo (todo o atendimento, inclusive OS com orçamento reprovado) e quanto fica em cada
 * status — EM_EXECUCAO é a execução dos serviços.
 * Calculado a partir do histórico de status, que só existe para mudanças feitas depois de ele ser criado.
 */
class CalcularTempoMedio {
  #ordensServicoRepository;

  constructor({ ordensServicoRepository }) {
    this.#ordensServicoRepository = ordensServicoRepository;
  }

  async execute({ de = null, ate = null } = {}) {
    const { total, porStatus } = await this.#ordensServicoRepository.findAverageTimes({ de, ate });
    return {
      periodo: { de, ate },
      tempo_total: { descricao: 'Da abertura da OS à entrega do veículo', ...this.#media(total) },
      por_status: ETAPAS.map((status) => ({
        status,
        ...this.#media(porStatus.find((etapa) => etapa.status === status)),
      })),
    };
  }

  /** Sem etapas encerradas no período, a média não existe (null), em vez de um zero enganoso. */
  #media(resultado) {
    if (!resultado || resultado.quantidade === 0) return { quantidade: 0, media_segundos: null, media: null };
    const segundos = Math.round(resultado.media_segundos);
    return { quantidade: resultado.quantidade, media_segundos: segundos, media: formatarDuracao(segundos) };
  }
}

module.exports = { CalcularTempoMedio };
