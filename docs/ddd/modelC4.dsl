workspace "Oficina Mecânica - Tech Challenge Fase 1" "Arquitetura do MVP do Sistema de Atendimento e Execução de Serviços" {

    model {
        # --- ATORES (USUÁRIOS) ---
        cliente = person "Cliente" "Pessoa física ou jurídica que consulta status da OS, aprova ou rejeita orçamentos."
        atendente = person "Atendente" "Profissional responsável pelo acolhimento, cadastro de clientes, veículos, peças/insumos, serviços e abertura de OS."
        mecanico = person "Mecânico" "Profissional responsável pelo diagnóstico, execução e inclusão de peças/serviços na OS."

        # --- SISTEMA PRINCIPAL ---
        sistemaOficina = softwareSystem "Sistema Integrado da Oficina Mecânica" "Gerencia o ciclo de vida de OS, clientes, veículos e controle de estoque." {
            
            # --- NÍVEL 2: CONTÊINERES ---
            apiMonolito = container "API Back-end (Monólito)" "Processa regras de negócio, autenticação JWT, validações, documentação Swagger e rotas públicas/privadas." "Node.js / Express" {
                
                # --- NÍVEL 3: COMPONENTES (CAMADAS/DDD) ---
                controllers = component "Controllers Layer (API)" "Expõe endpoints REST (públicos para cliente e administrativos com JWT) e DTOs." "Express Router / Controllers"
                useCases = component "Application Layer (Use Cases)" "Orquestra os fluxos e regras da aplicação (Criar OS, Aprovar/Rejeitar Orçamento, Consultar Status, etc)." "Application Services"
                domain = component "Domain Layer (DDD Core)" "Contém Entidades, Objetos de Valor e Regras de Negócio do domínio." "Entities & Value Objects"
                infra = component "Infrastructure Layer" "Implementa a persistência, repositórios e serviços de autenticação." "JWT"
            }

            database = container "Banco de Dados Relacional" "Armazena dados persitidos de Clientes, Veículos, OS, Peças/Insumos e Estoque." "PostgreSQL" "Database"
        }

        # --- RELACIONAMENTOS (CONTEXTO E CONTÊINERES) ---
        cliente -> sistemaOficina "Consulta status da OS, aprova ou rejeita orçamentos via API"
        atendente -> sistemaOficina "Gerencia cadastros (clientes, veículos, peças, serviços) e abre Ordens de Serviço"
        mecanico -> sistemaOficina "Realiza diagnósticos, inclui peças/serviços/insumos e finaliza a OS"

        cliente -> controllers "Faz chamadas REST públicas para consultar status da OS, aprovar e rejeitar orçamentos" "HTTP/REST"
        atendente -> controllers "Faz chamadas REST administrativas com JWT (cadastros e abertura de OS)" "HTTP/REST"
        mecanico -> controllers "Faz chamadas REST administrativas com JWT (diagnóstico e execução)" "HTTP/REST"

        # --- RELACIONAMENTOS INTERNOS (COMPONENTES - NÍVEL 3) ---
        controllers -> useCases "Delega as requisições para"
        useCases -> domain "Executa as regras de negócio de"
        useCases -> infra "Persiste e recupera dados através de"
        infra -> database "Lê e escreve dados em" "TCP/IP - Port 5432"
    }

    views {
        # 1. VISÃO DE CONTEXTO (NÍVEL 1)
        systemContext sistemaOficina "Contexto" {
            include *
            autolayout tb
            description "Diagrama de Contexto (Nível 1) - Atores (Cliente, Atendente, Mecânico) e o Sistema da Oficina."
        }

        # 2. VISÃO DE CONTÊINERES (NÍVEL 2)
        container sistemaOficina "Conteineres" {
            include *
            autolayout tb
            description "Diagrama de Contêineres (Nível 2) - Monólito Node.js e PostgreSQL."
        }

        # 3. VISÃO DE COMPONENTES (NÍVEL 3)
        component apiMonolito "Componentes" {
            include *
            autolayout tb
            description "Diagrama de Componentes (Nível 3) - Camadas da API em Node.js (DDD)."
        }

        styles {
            element "Software System" {
                background #1168bd
                color #ffffff
            }
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Container" {
                background #438dd5
                color #ffffff
            }
            element "Database" {
                shape Cylinder
                background #228B22
                color #ffffff
            }
            element "Component" {
                background #85bbf0
                color #000000
            }
        }
    }
}
