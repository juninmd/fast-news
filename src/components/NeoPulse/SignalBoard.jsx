import { Activity, BadgeCheck, Radio, ShieldAlert } from 'lucide-react';

const stat = (label, value, Icon, tone) => (
  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
    <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-md ${tone}`}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="text-2xl font-black text-white">{value}</p>
    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
  </div>
);

export function SignalBoard({ articles, analyzed, totalSources }) {
  const useful = articles.filter((item) => item.isUseful).length;
  const hot = articles.slice(0, 8).map((item) => item.category);
  const lead = articles.find((item) => item.usefulScore > 70) || articles[0];

  return (
    <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="min-h-80 overflow-hidden rounded-lg border border-cyan-400/20 bg-zinc-900">
        <div className="relative h-full p-6">
          {lead?.imageUrl && <img src={lead.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/30" />
          <div className="relative max-w-2xl">
            <p className="mb-3 text-xs uppercase tracking-[0.32em] text-cyan-200">Sinal principal</p>
            <h2 className="text-3xl font-black leading-tight text-white sm:text-5xl">{lead?.title || 'Carregando fontes'}</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300">{lead?.excerpt || 'Lendo RSS, cruzando sinais e preparando triagem.'}</p>
            {lead && <p className="mt-5 text-sm text-cyan-200">{lead.source} · score {lead.usefulScore}</p>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stat('lidas', articles.length, Radio, 'bg-cyan-400 text-zinc-950')}
        {stat('uteis', useful, BadgeCheck, 'bg-emerald-400 text-zinc-950')}
        {stat('ollama', analyzed, Activity, 'bg-fuchsia-400 text-zinc-950')}
        {stat('fontes', totalSources, ShieldAlert, 'bg-amber-300 text-zinc-950')}
        <div className="col-span-2 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">Radar</p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(hot)].map((item) => <span key={item} className="rounded-md bg-white/10 px-2 py-1 text-xs text-zinc-200">{item}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}
