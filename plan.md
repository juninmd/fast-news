1. **Adicionar novos feeds RSS ao arquivo `src/services/newsService.js`**.
   - Inserir a URL `https://noticiasdatv.uol.com.br/feed` do portal "Notícias da TV" na seção `// --- EXPANSÃO CONTÍNUA ---`.
2. **Adicionar novos feeds RSS ao arquivo `backend/src/services/sources.ts`**.
   - Inserir a mesma URL `https://noticiasdatv.uol.com.br/feed` na seção `// ── EXPANSÃO CONTÍNUA ─────────────────────────────────────────────────────────────`.
3. **Rodar `pnpm lint` e `pnpm test`**.
   - Verificar se não há problemas de formatação e de regras antes do commit.
4. **Completar os passos pré-commit**.
   - Utilizando a tool `pre_commit_instructions` para finalizar o processo de validação, revisão e reflexão.
5. **Submeter as alterações (`submit`)**.
