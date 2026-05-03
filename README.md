# 🚀 Fast News (NewsAI) - Agregador de Notícias Inteligente

O **Fast News** é um agregador de notícias moderno que utiliza Inteligência Artificial para resumir, classificar e enviar conteúdos relevantes diretamente para você. O projeto combina uma interface web elegante com um agente de automação poderoso. Construído com **Node.js / TypeScript** e orquestrado sob o protocolo Antigravity.

## ✨ Funcionalidades / Features

### 🧠 NeoPulse Intelligence Interface
Uma experiência de leitura imersiva e orientada a dados:
*   **SignalBoard**: Monitoramento de sinais e tendências em tempo real.
*   **InsightRail**: Painel lateral com insights profundos gerados por IA sobre as notícias.
*   **ReaderPanel**: Ambiente de leitura focado, livre de distrações e altamente legível.
*   **ArticleGrid**: Layout dinâmico e otimizado para consumo rápido de informação.

### ✍️ NeoEditorial System
Curadoria avançada e navegação intuitiva:
*   **SearchModal**: Busca global poderosa com filtros inteligentes.
*   **CategoryTabs**: Organização temática fluida para acesso rápido aos seus tópicos favoritos.
*   **Refined Sidebar**: Navegação lateral aprimorada para uma gestão de contexto superior.

### 💰 Financial Intelligence (Novo!)
Extração automatizada de oportunidades de investimento:
*   **Market Monitoring**: Identificação de tendências em Ações (BR/Global), Commodities, Cripto e Forex.
*   **AI Reasoning**: Justificativas técnicas e horizontes de tempo (curto, médio, longo prazo).
*   **Confidence Scoring**: Classificação de oportunidades baseada na força dos sinais detectados.

### 🎯 Dynamic Topic Tracking (Novo!)
Monitoramento personalizado de temas específicos:
*   **RAG-Powered Pipelines**: Análise profunda de tópicos rastreados usando Retrieval-Augmented Generation.
*   **Historical Analysis**: Acompanhamento da evolução de temas ao longo do tempo com memória persistente.

### 🔌 Fast News MCP Server (Novo!)
Integração via **Model Context Protocol**:
*   **AI Agent Ready**: Permite que ferramentas como Claude Desktop consumam e pesquisem notícias do sistema nativamente.
*   **Semantic Search**: Ferramentas de busca e sumarização expostas via MCP.

### 🤖 AI Backend & Automation
O "cérebro" autônomo do sistema:
*   **Autonomous Ingestion**: `ingestionJob` monitora e processa feeds RSS e outras fontes 24/7.
*   **Continuous Learning**: `learningJob` refina continuamente o entendimento do contexto e relevância.
*   **Daily Digests**: `digestJob` gera resumos inteligentes e personalizados automaticamente.
*   **Semantic RAG**: Utiliza **pgvector** para buscas semânticas ultra-rápidas e análise de contexto precisa.

### 📱 Telegram Integration
*   **Automated Delivery**: Bot dedicado para envio de notícias resumidas e categorizadas diretamente para canais ou grupos.
*   **Smart Formatting**: Notificações ricas com emojis, sumários e links diretos.

## 🛠️ Pré-requisitos & Tecnologias

1.  **Node.js** (v18 ou superior).
2.  **Ollama** instalado e rodando com o modelo gemma4:e2b (ou configurado para outro provedor via AI SDK).
3.  **PostgreSQL (com pgvector)** e **Redis** para armazenamento de embeddings, RAG e cache.
4.  **React + Vite + Tailwind** no Frontend.

## ⚙️ Configuração

### 1. Variáveis de Ambiente (.env)

Crie um arquivo `.env` no backend (ou copie de `.env.example`):

```bash
cd backend
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações (Telegram, DB, Ollama, etc).

### 2. Instalação

```bash
# Na raiz para o frontend (se aplicável)
npm install

# No diretório backend
cd backend
pnpm install
```

## 🛡️ Antigravity Protocol

Este projeto segue os padrões de código **Antigravity**:
- **Limite de 180 Linhas**: Aplicado a todos os módulos lógicos.
- **Strict Typing**: Evitando tipos dinâmicos/any sempre que possível (TypeScript).
- **Clean Code**: DRY, KISS e SOLID aplicados rigorosamente.

## Licença

MIT
