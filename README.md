# 🚀 Fast News (NewsAI) - Agregador de Notícias Inteligente

O **Fast News** é um agregador de notícias moderno que utiliza Inteligência Artificial para resumir, classificar e enviar conteúdos relevantes diretamente para você. O projeto combina uma interface web elegante com um agente de automação poderoso. Construído com **Node.js / TypeScript** e orquestrado sob o protocolo Antigravity.

## ✨ Funcionalidades / Features

*   **Interface Web Moderna:** Layout responsivo com Sidebar, Dark Mode, Grid Masonry e transições suaves.
*   **IA Local (Ollama):** Resumos privados e classificados automaticamente (Tecnologia, Política, Esportes, etc.) rodando diretamente na sua máquina.
*   **Integração com Telegram:** Envie notícias resumidas e categorizadas (com emojis) diretamente para seu canal ou grupo.
*   **Agente Autônomo:** Backend Node.js que monitora feeds RSS, resume com IA e envia para o Telegram automaticamente.
*   **High Performance**: Otimizado para velocidade e baixo uso de recursos.

## 🛠️ Pré-requisitos & Tecnologias

1.  **Node.js** (v18 ou superior).
2.  **Ollama** instalado e rodando com o modelo gemma4:e2b (ou configurado para outro provedor).
3.  **PostgreSQL** e **Redis** para armazenamento de embeddings, RAG e cache.
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
