# AGENTS.md - Fast News

## Tech Stack
- **Language**: TypeScript
- **Frontend**: React 19 + Vite 8 + Tailwind CSS 3
- **AI**: Google Generative AI (Gemini)
- **Testing**: Vitest + Testing Library
- **Linting**: Biome
- **Monorepo**: pnpm workspaces
- **Deploy**: Netlify
- **Scraping**: RSS Parser
- **Scripts**: Node.js agent scripts

## Project Structure
```
src/                  # Main app source
  components/         # React components
  pages/              # Page components
  styles/             # Tailwind styles
  utils/              # Utilities
packages/             # Monorepo packages
  api/                # API package
  mcp/                # MCP server package
scripts/              # Agent scripts
  news-agent.js       # AI news curation agent
public/               # Static assets
data/                 # Data files
docs/                 # Documentation
```

## Key Commands
```bash
pnpm dev             # Vite dev server
pnpm build           # Production build
pnpm test            # Vitest
pnpm lint            # Biome lint
pnpm news-agent      # Run news agent once
pnpm start-agent     # Run news agent in loop
pnpm preview         # Preview production build
pnpm coverage        # Test coverage report
```

## Conventions
- pnpm monorepo with workspaces
- React 19 with Server Components
- Biome for linting/formatting
- Tailwind CSS for styling
- ESM modules

## Environment Variables
- `GEMINI_API_KEY` - Google Gemini API key
- `PUBLIC_URL` - Deployment URL
- `NETLIFY_SITE_ID` - Netlify site ID
