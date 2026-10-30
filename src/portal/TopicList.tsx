import { Button } from '@/components/ui/button';
import { AREA_COLOR, type TopicUnit } from './videoTopics';
import { MORE, type Video } from './TopicMap';

/** A topic's key in the page address (?topic=…): its book number, or "more" for the videos outside the 26 topics. */
export const unitKey = (u: { n: number | null }) => String(u.n ?? 'more');

/** Every topic as a collapsed card in its area's colour; picking one shows its map. */
export function TopicList({ units, selected, onPick }: { units: TopicUnit<Video>[]; selected: string | null; onPick: (key: string) => void }) {
  return (
    <nav aria-label="Topics" className="space-y-3 p-1">
      {units.map(u => {
        const key = unitKey(u), c = u.area ? AREA_COLOR[u.area] : MORE, active = key === selected;
        return (
          <div key={key} className="sky-unit" style={{ '--unit-light': c.light, '--unit-dark': c.dark } as React.CSSProperties}>
            <Button variant="ghost" data-topic={key} data-active={active} aria-current={active ? 'true' : undefined} onClick={() => onPick(key)}
              className="sky-unit-banner sky-topic-card h-auto w-full justify-start whitespace-normal rounded-2xl px-4 py-3 text-left hover:bg-[var(--unit)] hover:text-[color:var(--unit-ink)]">
              <span className="block min-w-0 flex-1">
                {u.area && <span className="block text-[11px] font-semibold uppercase tracking-wide">{u.area}</span>}
                <span className="block text-base font-bold leading-snug">{u.n ? `Topic ${u.n} · ${u.name}` : u.name}</span>
                <span className="block text-sm font-medium mt-0.5">{`${u.watched}/${u.total} watched`}</span>
              </span>
            </Button>
          </div>
        );
      })}
    </nav>
  );
}
