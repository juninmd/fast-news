# NewsAI - Notícias Inteligentes

O **NewsAI** é um agregador de notícias moderno desenvolvido em React que reúne os principais portais do Brasil e do mundo em um único lugar. Além de organizar as notícias em cards visuais, o projeto utiliza a inteligência artificial do Google Gemini para criar resumos rápidos e objetivos das matérias.

## Funcionalidades

*   **Agregação de Notícias:** Coleta notícias de mais de 50 fontes RSS confiáveis, incluindo G1, UOL, CNN Brasil, TechCrunch, ESPN, entre outros.
*   **Resumos com IA:** Integração com a API Google Gemini (modelo `gemini-1.5-flash`) para resumir notícias longas em 2-3 frases essenciais.
*   **Interface Moderna:** Layout em cards responsivos com imagens, transições suaves e suporte completo a **Modo Escuro** (Dark Mode).
*   **Top Tópicos:** Exibe os assuntos mais comentados do momento no topo da página.
*   **Personalização:**
    *   Adicione seus próprios feeds RSS personalizados.
    *   Filtre notícias por categorias (Tecnologia, Brasil, Mundo, Esportes, etc.).
    *   Gerenciamento local da Chave de API (salva no navegador).

## Tecnologias

*   [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   [Tailwind CSS](https://tailwindcss.com/)
*   [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai)
*   [Lucide React](https://lucide.dev/) (Ícones)
*   RSS2JSON API (para converter feeds XML em JSON)

## Instalação e Execução

1.  Clone o repositório.
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
4.  Acesse `http://localhost:5173` no seu navegador.

## Configuração da API Gemini

Para utilizar a funcionalidade de **Resumir**, você precisa de uma chave de API do Google Gemini.

1.  Acesse o [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Crie uma nova chave de API (é gratuito dentro dos limites de uso).
3.  No NewsAI, clique no ícone de **Configurações** (engrenagem) no canto superior direito.
4.  Cole sua chave no campo "Token da API Gemini" e clique em **Salvar**.
5.  Pronto! O botão "Resumir" agora funcionará nos cards de notícias.

> **Nota:** A chave é armazenada apenas no `localStorage` do seu navegador e nunca é enviada para nenhum servidor intermediário, apenas diretamente para a API do Google.

## Licença

Este projeto é de código aberto e destinado a fins educacionais e de demonstração.
