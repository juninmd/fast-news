import { Activity, BadgeCheck, Radio, ShieldAlert, TrendingUp } from 'lucide-react';

const stat = (label, value, Icon, tone) => (
  <div className="rounded-lg border border-ink bg-panel p-3">
    <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-md ${tone}`}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-2xl font-black text-strong">{value}</p>
    <p className="text-xs uppercase tracking-[0.18em] text-faint">{label}</p>
  </div>
);

export function SignalBoard({ articles, analyzed, totalSources }) {
  const useful = articles.filter((item) => item.isUseful).length;
  const hot = articles.slice(0, 8).map((item) => item.category);
  const lead = articles.find((item) => item.usefulScore > 70) || articles[0];
  const score = lead?.usefulScore || 0;

  return (
    <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="min-h-80 overflow-hidden rounded-lg border border-cyan-400/25 bg-zinc-950 text-white shadow-[0_28px_80px_rgba(8,47,73,0.28)]">
        <div className="relative h-full p-6">
          {lead?.imageUrl && <img src={lead.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />}
          <div className="absolute inset-0 bg-[linear-gradient(110deg,#09090b_0%,rgba(9,9,11,0.92)_42%,rgba(9,9,11,0.36)_100%)]" />
          <div className="relative grid h-full content-between gap-8">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs uppercase tracking-[0.32em] text-cyan-200">Sinal principal</p>
              <h2 className="text-3xl font-black leading-tight text-white sm:text-5xl">{lead?.title || 'Carregando fontes'}</h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300">{lead?.excerpt || 'Lendo RSS, cruzando sinais e preparando triagem.'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{lead?.source || 'Fast News'}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: `${score}%` }} />
                </div>
              </div>
              <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">prioridade</p>
                <p className="text-3xl font-black text-white">{score}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stat('lidas', articles.length, Radio, 'bg-cyan-400 text-zinc-950')}
        {stat('uteis', useful, BadgeCheck, 'bg-emerald-400 text-zinc-950')}
        {stat('ollama', analyzed, Activity, 'bg-fuchsia-400 text-zinc-950')}
        {stat('fontes', totalSources, ShieldAlert, 'bg-amber-300 text-zinc-950')}
        <div className="col-span-2 rounded-lg border border-ink bg-panel p-4">
          <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-faint">
            <TrendingUp className="h-4 w-4" /> Radar
          </p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(hot)].map((item) => (
              <span key={item} className="rounded-md bg-cyan-300/10 px-2 py-1 text-xs text-cyan-700 dark:text-cyan-100">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
