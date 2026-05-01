import { ExternalLink, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

export function SourcesModal({ sources, onClose }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    return sources.filter((item) => !needle ||
      `${item.url} ${item.category}`.toLowerCase().includes(needle));
  }, [query, sources]);

  const grouped = useMemo(() => filtered.reduce((acc, item) => {
    const key = item.category || 'Geral';
    acc[key] = [...(acc[key] || []), item];
    return acc;
  }, {}), [filtered]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 p-4" onClick={onClose}>
      <section className="mx-auto flex h-full max-w-5xl flex-col rounded-lg border border-white/10 bg-zinc-950" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-3 border-b border-white/10 p-4">
          <div>
            <h2 className="text-xl font-black text-white">Fontes monitoradas</h2>
            <p className="text-sm text-zinc-400">{filtered.length} de {sources.length} feeds RSS</p>
          </div>
          <label className="ml-auto hidden min-w-72 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 md:flex">
            <Search className="h-4 w-4 text-zinc-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar fontes" className="w-full bg-transparent text-sm text-white outline-none" />
          </label>
          <button onClick={onClose} className="neo-icon" title="Fechar"><X className="h-5 w-5" /></button>
        </header>
        <div className="border-b border-white/10 p-4 md:hidden">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar fontes" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
        </div>
        <div className="overflow-y-auto p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-3 font-black text-cyan-100">{category} <span className="text-sm text-zinc-500">{items.length}</span></h3>
                <div className="space-y-2">
                  {items.map((item) => (
                    <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:text-cyan-200">
                      <span className="truncate">{item.url.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink className="ml-auto h-4 w-4 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
