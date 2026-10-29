# Glossário de Linguagem Ubíqua - Sistema de Oficina Mecânica

Este documento define o vocabulário oficial compartilhado entre a equipe de desenvolvimento e as regras de negócio do domínio da oficina mecânica, alinhado aos conceitos de Domain-Driven Design (DDD).

---

## 1. Atores (Papéis no Sistema)
* **Atendente (ou Recepcionista):** Profissional responsável pelo acolhimento do Cliente, realização dos cadastros iniciais (clientes e veículos), abertura da Ordem de Serviço (OS) e interface com o cliente para envio de orçamentos e atualizações.
* **Mecânico (ou Técnico):** Profissional responsável pela execução técnica. Atua diretamente na fase de Diagnóstico das falhas, realiza os Reparos, registra os serviços prestados e indica o uso de peças e insumos.
* **Cliente:** Pessoa física ou jurídica cadastrada no sistema, identificada obrigatoriamente por CPF ou CNPJ, que solicita serviços para seus veículos e acompanha o status da OS.

## 2. Entidades Centrais e Domínio
* **Veículo:** Bem móvel (carro ou moto) vinculado a um cliente, caracterizado obrigatoriamente por placa, marca, modelo e ano.
* **Ordem de Serviço (OS):** Documento central e transacional do sistema que formaliza a solicitação de atendimento. Agrupa a queixa inicial, o diagnóstico técnico, a relação de serviços, a alocação de peças do estoque, o orçamento gerado automaticamente e o controle de status.
* **Queixa:** Descrição do problema ou sintoma relatado pelo cliente que motivou a ida à oficina.
* **Diagnóstico:** Análise técnica da queixa realizada pelo mecânico, levantando os serviços necessários e as peças/insumos requeridos.
* **Orçamento:** Demonstrativo de custos detalhando serviços (mão de obra), peças, insumos e o tempo estimado para a execução.
* **Reparo/Manutenção:** Conjunto de intervenções técnicas corretivas executadas pelo mecânico no veículo, baseadas nos itens autorizados na OS.

## 3. Gestão de Peças e Estoque
* **Peça (Partnumber):** Componente durável necessário para a substituição de itens desgastados ou em mau funcionamento no veículo.
* **Insumo:** Item de consumo necessário para o funcionamento do motor e sistemas (ex: óleo de motor, fluido de freio, gás de ar-condicionado).
* **Estoque:** Inventário central de peças e insumos disponíveis no sistema.
* **Reserva de Estoque:** Separação temporária de itens em estoque correspondentes a um orçamento gerado, aguardando a resposta do cliente.
* **Baixa de Estoque:** Retirada definitiva de uma quantidade específica de peças ou insumos do estoque, refletindo o consumo real aplicado nos reparos.
* **Liberação de Estoque:** Ação que cancela a reserva e devolve os itens ao estoque disponível caso o orçamento seja rejeitado ou a OS cancelada.

## 4. Ciclo de Vida da Ordem de Serviço (Status)
* **Recebida:** Status inicial após a abertura da OS pelo atendente.
* **Em Diagnóstico:** Status que indica a inspeção técnica do veículo pelo mecânico.
* **Aguardando Aprovação:** Status em que o orçamento foi gerado e aguarda a decisão do cliente.
* **Em Execução:** Status ativado após a aprovação do orçamento, fase em que os reparos e baixas de estoque ocorrem.
* **Finalizada:** Status indicando que todos os serviços foram concluídos e o veículo está pronto.
* **Entregue:** Status final e encerrado, após a retirada do veículo e confirmação do pagamento pelo cliente.

## 5. Termos Gerais
* **Serviço:** Descrição da atividade realizada pelo profissional.
* **Mão de Obra:** Valor relacionado ao serviço.
* **Revisão:** Análise de desgastes/mal funcionamento para manutenção preventiva.
* **Placa:** Identificação alfanumérica de um veículo.
* **Chassi:** Identificação alfanumérica do motor de um veículo.
* **Tempo Médio de Execução:** Métrica monitorada pelo sistema que calcula o tempo médio despendido entre o início da execução do serviço e a sua finalização, servindo de indicador de eficiência operacional da oficina.
* **Notificação:** Mecanismo de comunicação utilizado para enviar o orçamento ao cliente para aprovação ou informá-lo sobre mudanças de status da OS.