# NewsAI - Agregador de Notícias Inteligente

O **NewsAI** é um agregador de notícias moderno que utiliza Inteligência Artificial para resumir e classificar conteúdos. O projeto foi reformulado para integrar **Ollama (IA Local)** e **Telegram**, permitindo que você tenha um assistente de notícias pessoal e privado.

![Preview](https://via.placeholder.com/800x400?text=NewsAI+Preview)

## Funcionalidades

*   **Interface Moderna:** Layout responsivo com Sidebar, Dark Mode e Grid Masonry.
*   **IA Local (Ollama):** Resumos privados e rápidos rodando diretamente na sua máquina, sem depender de APIs pagas.
*   **Integração com Telegram:** Envie notícias resumidas diretamente para seu canal ou grupo do Telegram com um clique ou via automação.
*   **Agente Autônomo:** Script em Node.js (`news-agent.js`) que monitora feeds RSS e envia novidades automaticamente para o Telegram.
*   **Mais de 60 Fontes:** Notícias de Tecnologia, Brasil, Mundo, Ciência, Finanças e mais.

## Tecnologias

*   [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [Ollama](https://ollama.com/) (Llama 3, Mistral, etc.)
*   [Telegram Bot API](https://core.telegram.org/bots/api)
*   [RSS Parser](https://www.npmjs.com/package/rss-parser)

## Pré-requisitos

1.  **Node.js** (v18 ou superior).
2.  **Ollama** instalado e rodando.
    *   [Baixe o Ollama aqui](https://ollama.com/download).
    *   Baixe um modelo (ex: Llama 3): `ollama pull llama3`.

## Configuração do Ambiente

### 1. Configurando o Ollama (CORS)
Para que a interface Web consiga se comunicar com o Ollama, é necessário permitir requisições de outras origens (CORS).

**No Mac/Linux:**
```bash
OLLAMA_ORIGINS="*" ollama serve
```

**No Windows (PowerShell):**
```powershell
$env:OLLAMA_ORIGINS="*"; ollama serve
```

### 2. Configurando o Telegram (Opcional)
Para enviar notícias para o Telegram:
1.  Crie um bot com o [@BotFather](https://t.me/BotFather) e obtenha o **Token**.
2.  Crie um Canal ou Grupo e adicione o bot como administrador.
3.  Obtenha o **Chat ID** (ex: `@meucanal` ou `-100...`).

## Instalação e Execução

### Interface Web (Frontend)

1.  Clone o repositório.
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
4.  Acesse `http://localhost:5173`.
5.  Vá em **Configurações** (ícone de engrenagem) e configure:
    *   URL do Ollama: `http://localhost:11434`
    *   Modelo: `llama3`
    *   Telegram Token e Chat ID.

### Agente de Automação (Backend/Script)

Para rodar o "robô" que monitora notícias e envia para o Telegram automaticamente:

1.  Configure as variáveis de ambiente (ou edite o arquivo `scripts/news-agent.js` se preferir, mas variáveis são mais seguras):
    ```bash
    export TELEGRAM_BOT_TOKEN="seu_token_aqui"
    export TELEGRAM_CHAT_ID="@seu_canal"
    ```
2.  Execute o agente:
    ```bash
    node scripts/news-agent.js
    ```
    *Dica: Você pode agendar este script no `cron` para rodar a cada hora.*

## Contribuição

Sinta-se à vontade para abrir Issues e Pull Requests.

## Licença

MIT
