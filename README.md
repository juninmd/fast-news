# NewsAI - Agregador de Notícias Inteligente

O **NewsAI** é um agregador de notícias moderno que utiliza Inteligência Artificial para resumir, classificar e enviar conteúdos relevantes diretamente para você. O projeto combina uma interface web elegante com um agente de automação poderoso.

## Funcionalidades

*   **Interface Web Moderna:** Layout responsivo com Sidebar, Dark Mode, Grid Masonry e transições suaves.
*   **IA Local (Ollama):** Resumos privados e classificados automaticamente (Tecnologia, Política, Esportes, etc.) rodando diretamente na sua máquina.
*   **Integração com Telegram:** Envie notícias resumidas e categorizadas (com emojis) diretamente para seu canal ou grupo.
*   **Agente Autônomo:** Script em Node.js (`scripts/news-agent.js`) que monitora feeds RSS, resume com IA e envia para o Telegram automaticamente.
*   **Mais de 100 Fontes:** Notícias de Tecnologia, Brasil, Mundo, Ciência, Finanças, Esportes e Entretenimento.

## Pré-requisitos

1.  **Node.js** (v18 ou superior).
2.  **Ollama** instalado e rodando.
    *   [Baixe o Ollama aqui](https://ollama.com/download).
    *   Baixe um modelo (recomendado: Llama 3): `ollama pull llama3`.

## Configuração

### 1. Variáveis de Ambiente (.env)

Crie um arquivo `.env` na raiz do projeto (ou copie de `.env.example`):

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```ini
# Configuração do Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Configuração do Telegram (Obrigatório para o Agente)
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=@seu_canal_ou_chat_id
```

> **Dica:** Para obter o `TELEGRAM_BOT_TOKEN`, fale com o [@BotFather](https://t.me/BotFather). Para obter o `TELEGRAM_CHAT_ID`, adicione o bot ao seu canal/grupo e use um bot como `@userinfobot` ou a API do Telegram.

### 2. Instalação

Instale as dependências do projeto:

```bash
npm install
```

---

## Como Usar

### Opção A: Interface Web (Frontend)

Para navegar, ler notícias e gerar resumos manualmente:

1.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
2.  Acesse `http://localhost:5173`.
3.  Vá em **Configurações** (ícone de engrenagem) para ajustar preferências locais, como tema e fontes personalizadas.

> **Nota:** Para que a interface Web consiga se comunicar com o Ollama, inicie o Ollama permitindo CORS:
> `OLLAMA_ORIGINS="*" ollama serve`

### Opção B: Agente de Notícias (Automação)

Para rodar o "robô" que monitora notícias e envia para o Telegram automaticamente em segundo plano:

1.  Certifique-se de que o `.env` está configurado corretamente.
2.  Execute o script do agente:

    **Modo Único (Executa uma vez e para):**
    ```bash
    node scripts/news-agent.js
    ```

    **Modo Contínuo (Loop a cada 15 minutos):**
    ```bash
    node scripts/news-agent.js --loop
    ```

    *O script irá verificar os feeds, classificar, resumir novas notícias com o Ollama e enviar para o Telegram. Ele salva o histórico em `scripts/history.json` para evitar duplicatas.*

---

## Tecnologias

*   [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [Lucide React](https://lucide.dev/) (Ícones)
*   [Ollama](https://ollama.com/) (IA Local)
*   [RSS Parser](https://www.npmjs.com/package/rss-parser)

## Licença

MIT
