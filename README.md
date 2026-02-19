# NewsAI - Agregador de Notícias Inteligente

O **NewsAI** é um agregador de notícias moderno que utiliza Inteligência Artificial para resumir e classificar conteúdos. O projeto foi reformulado para integrar **Ollama (IA Local)** e **Telegram**, permitindo que você tenha um assistente de notícias pessoal e privado.

## Funcionalidades

*   **Interface Moderna:** Layout responsivo com Sidebar, Dark Mode e Grid Masonry.
*   **IA Local (Ollama):** Resumos privados e rápidos rodando diretamente na sua máquina, sem depender de APIs pagas.
*   **Integração com Telegram:** Envie notícias resumidas e classificadas (com emojis) diretamente para seu canal ou grupo.
*   **Agente Autônomo:** Script robusto (`news-agent.js`) que monitora mais de 100 feeds RSS e envia novidades automaticamente.
*   **Mais de 100 Fontes:** Notícias de Tecnologia, Brasil, Mundo, Ciência, Finanças, Cripto, Games e mais.
*   **Interface Moderna:** Layout responsivo com Sidebar, Dark Mode, Grid Masonry e transições suaves.
*   **IA Local (Ollama):** Resumos privados e classificados automaticamente (Tecnologia, Política, Esportes, etc.) rodando diretamente na sua máquina.
*   **Integração com Telegram:** Envie notícias resumidas e categorizadas (com emojis) diretamente para seu canal ou grupo.
*   **Agente Autônomo:** Script em Node.js (`scripts/news-agent.js`) que monitora feeds RSS, resume com IA e envia para o Telegram automaticamente.
*   **Mais de 60 Fontes:** Notícias de Tecnologia, Brasil, Mundo, Ciência, Finanças, Esportes e Entretenimento.

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

### 2. Configurando Variáveis de Ambiente (.env)
Crie um arquivo `.env` na raiz do projeto (copie de `.env.example` se existir) com o seguinte conteúdo:

```ini
# Configuração do Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Configuração do Telegram (necessário para o agente)
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=@seu_canal_ou_chat_id
```

## Instalação e Execução
### 2. Configurando o Agente de Notícias (Backend)

Para rodar o "robô" que monitora notícias e envia para o Telegram automaticamente:

1.  Crie um arquivo `.env` na raiz do projeto (use `.env.example` como base):
    ```bash
    cp .env.example .env
    ```
2.  Edite o arquivo `.env` com suas credenciais:
    ```ini
    OLLAMA_URL=http://localhost:11434
    OLLAMA_MODEL=llama3
    TELEGRAM_BOT_TOKEN=seu_token_aqui
    TELEGRAM_CHAT_ID=seu_chat_id_aqui
    ```
3.  Execute o agente:
    ```bash
    node scripts/news-agent.js
    ```
4.  Acesse `http://localhost:5173`.

### Agente de Automação (Backend/Script)

## Instalação e Execução (Frontend)

1.  Certifique-se de ter configurado o arquivo `.env`.
2.  Execute o agente:
1.  Instale as dependências:
    ```bash
    npm install
    ```
2.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
    *O script irá verificar os feeds, resumir novas notícias com o Ollama e enviar para o Telegram.*
3.  Acesse `http://localhost:5173`.
4.  Vá em **Configurações** (ícone de engrenagem) para ajustar preferências locais.

## Contribuição

Sinta-se à vontade para abrir Issues e Pull Requests.

## Licença

MIT
