import { Database, Moon, RefreshCcw, Search, Settings, Sun, Zap } from 'lucide-react';

export function TopBar({ query, setQuery, theme, toggleTheme, refresh, loading, settings, sources }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400 text-zinc-950">
          <Zap className="h-5 w-5" />
        </div>
        <div className="mr-auto">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Fast News</p>
          <h1 className="text-lg font-black text-white">Intelligence Desk</h1>
        </div>
        <label className="hidden min-w-72 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 md:flex">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar tema, fonte ou sinal"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          />
        </label>
        <button onClick={refresh} className="neo-icon" title="Atualizar fontes">
          <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={sources} className="neo-icon" title="Ver todas as fontes">
          <Database className="h-5 w-5" />
        </button>
        <button onClick={toggleTheme} className="neo-icon" title="Alternar tema">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button onClick={settings} className="neo-icon" title="Configuracoes">
          <Settings className="h-5 w-5" />
        </button>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar noticias"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        />
      </div>
    </header>
  );
}
