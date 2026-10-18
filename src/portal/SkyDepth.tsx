import sky from '@/assets/sky/01-sky.svg';
import glow from '@/assets/sky/02-glow-lilac.svg';
import light from '@/assets/sky/03-light.svg';
import streak from '@/assets/sky/04-streak.svg';
import far from '@/assets/sky/05-clouds-far.svg';
import mid from '@/assets/sky/06-clouds-mid.svg';
import near from '@/assets/sky/07-clouds-near.svg';
import aurora from '@/assets/sky/08-aurora.svg';
import waveBlue from '@/assets/sky/09-card-wave-blue.svg';
import waveViolet from '@/assets/sky/09-card-wave-violet.svg';
import wavePink from '@/assets/sky/09-card-wave-pink.svg';
import waveOrange from '@/assets/sky/09-card-wave-orange.svg';

/** Back-to-front sky layers. Clouds anchor to the bottom; the rest cover the page. */
const LAYERS = [
  { src: sky, fit: 'cover' }, { src: glow, fit: 'cover' }, { src: light, fit: 'cover' }, { src: streak, fit: 'cover' },
  { src: far, fit: 'cloud' }, { src: mid, fit: 'cloud' }, { src: near, fit: 'cloud' },
] as const;

/** Soft washes that live inside cards (depth collection, "layers that go inside cards"). */
export const AURORA = aurora;
export const CARD_WAVES = {
  blue: waveBlue, violet: waveViolet, pink: wavePink, orange: waveOrange,
} as const;

/** Decorative fixed sky behind the customer student portal; never interactive. */
export function SkyDepth() {
  return (
    <div aria-hidden className="sky-depth">
      {LAYERS.map((l, i) => (
        <div key={i} className={`sky-depth-layer sky-depth-${l.fit}`} style={{ backgroundImage: `url(${l.src})` }} />
      ))}
    </div>
  );
}
