import React from 'react';
import type { TimelineEvent } from '../../hooks/useStories';

const EVENT_STYLES: Record<string, { color: string; icon: string }> = {
  new_development: { color: 'bg-blue-400', icon: '●' },
  escalation: { color: 'bg-red-400', icon: '▲' },
  contradiction: { color: 'bg-yellow-400', icon: '⚡' },
  resolution: { color: 'bg-green-400', icon: '✓' },
  impact_update: { color: 'bg-purple-400', icon: '◆' },
};

interface Props {
  events: TimelineEvent[];
}

export function StoryTimeline({ events }: Props) {
  if (!events.length) return (
    <p className="text-xs text-text-secondary text-center py-6">Sem eventos na linha do tempo</p>
  );

  return (
    <div className="relative pl-6">
      {/* vertical line */}
      <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {events.map((event, i) => {
          const style = EVENT_STYLES[event.eventType] ?? EVENT_STYLES.new_development;
          const date = new Date(event.occurredAt);
          return (
            <div key={event.id} className="relative">
              {/* dot */}
              <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full ${style.color} flex items-center justify-center`} />

              <div className="bg-surface rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-surface-elevated text-text-secondary capitalize">
                    {event.eventType.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-text-secondary ml-auto">
                    {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm font-medium text-text-primary line-clamp-2">{event.headline}</p>
                {event.whatChanged && (
                  <p className="text-xs text-text-secondary mt-1 italic border-l-2 border-accent/50 pl-2">
                    {event.whatChanged}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
