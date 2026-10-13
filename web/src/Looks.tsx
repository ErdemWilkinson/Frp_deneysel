import type { ReactNode } from 'react';
import { dungeonLayout, type PlaceBuilding, type PlaceLayout, type Prop, type Rect, type Region } from '@masa/shared';

/** Kendi yapılarıyla çizilen yeni araziler. Zemin ve yapılar paylaşılan yerleşimden (places.ts) gelir. */
export type ExtraRegion =
  | 'castle' | 'ship' | 'camp' | 'graveyard' | 'temple' | 'farm' | 'river' | 'tavern' | 'market' | 'cavern' | 'sewer' | 'mine';

const W = 1000;
type Rand = () => number;
export interface ExtraLook {
  ground: [string, string];
  patches: [string, number, number, number][];
  features: (r: Rand, h: number, ctx: { seed: number; aspect: number }) => ReactNode[];
}

const pick = (r: Rand, min: number, max: number): number => min + r() * (max - min);
const times = <T,>(n: number, make: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => make(i));
const px = (v: number): number => v * W;
const scatter = (r: Rand, h: number, n: number, make: (x: number, y: number, i: number) => ReactNode): ReactNode[] =>
  times(n, (i) => make(pick(r, 30, W - 30), pick(r, 30, h - 30), i));

function bush(r: Rand, key: string, x: number, y: number, size: number, dark: string, light: string): ReactNode {
  return (
    <g key={key}>
      <ellipse cx={x + size * 0.2} cy={y + size * 0.3} rx={size} ry={size * 0.8} fill="rgb(0 0 0 / 0.28)" />
      {times(3, (i) => <circle key={i} cx={x + pick(r, -0.4, 0.4) * size} cy={y + pick(r, -0.4, 0.4) * size} r={size * pick(r, 0.55, 0.8)} fill={dark} />)}
      <circle cx={x - size * 0.2} cy={y - size * 0.2} r={size * 0.4} fill={light} />
    </g>
  );
}
const treesAround = (r: Rand, h: number, n: number): ReactNode[] =>
  times(n, (i) => {
    const edge = i % 4;
    const x = edge === 0 ? pick(r, 20, 90) : edge === 1 ? W - pick(r, 20, 90) : pick(r, 20, W - 20);
    const y = edge === 2 ? pick(r, 15, 60) : edge === 3 ? h - pick(r, 15, 60) : pick(r, 20, h - 20);
    return bush(r, `tree${i}`, x, y, pick(r, 22, 38), '#2c502b', '#4a7a3c');
  });

/** Yeraltı mekânı: zindanla aynı oda ve koridor düzeni, üç farklı görünümde. */
function halls(style: 'cavern' | 'sewer' | 'mine'): ExtraLook {
  const palette = {
    cavern: { ground: ['#2a2620', '#171410'] as [string, string], wall: '#100e0b', floor: '#5d5448', edge: '#2b261f', round: 22 },
    sewer: { ground: ['#222a25', '#131a16'] as [string, string], wall: '#0c110e', floor: '#5b655c', edge: '#2e3830', round: 3 },
    mine: { ground: ['#2b2218', '#17110a'] as [string, string], wall: '#0f0b07', floor: '#7b6749', edge: '#3a2d1b', round: 4 },
  }[style];
  return {
    ground: palette.ground,
    patches: [['#1e1b16', 12, 40, 110]],
    features: (r, _h, { seed, aspect }) => {
      const layout = dungeonLayout(seed, aspect);
      const floors = [...layout.rooms, ...layout.corridors];
      const wall = 11;
      const out: ReactNode[] = [
        <defs key="defs">
          <pattern id={`brick-${style}-${seed}`} width="36" height="18" patternUnits="userSpaceOnUse">
            <rect width="36" height="18" fill={palette.floor} />
            <path d="M 0 0 H 36 M 0 9 H 36 M 0 0 V 9 M 18 9 V 18" stroke={palette.edge} strokeWidth="1.6" fill="none" />
          </pattern>
        </defs>,
        ...floors.map((f, i) => (
          <rect key={`w${i}`} x={px(f.x) - wall} y={px(f.y) - wall} width={px(f.w) + wall * 2} height={px(f.h) + wall * 2} rx={palette.round + 8} fill={palette.wall} />
        )),
        ...floors.map((f, i) => (
          <rect key={`f${i}`} x={px(f.x)} y={px(f.y)} width={px(f.w)} height={px(f.h)} rx={palette.round}
            fill={style === 'sewer' ? `url(#brick-${style}-${seed})` : palette.floor} stroke={palette.edge} strokeWidth={style === 'cavern' ? 4 : 2} />
        )),
      ];
      if (style === 'sewer') {
        // Ortada akan kirli su kanalı ve ızgaralar.
        floors.forEach((f, i) => {
          const horizontal = f.w >= f.h;
          out.push(<rect key={`ch${i}`} x={px(f.x) + (horizontal ? 0 : px(f.w) * 0.32)} y={px(f.y) + (horizontal ? px(f.h) * 0.32 : 0)}
            width={horizontal ? px(f.w) : px(f.w) * 0.36} height={horizontal ? px(f.h) * 0.36 : px(f.h)} fill="#3c5a40" opacity={0.9} />);
        });
        layout.rooms.forEach((room, i) => out.push(<circle key={`grate${i}`} cx={px(room.x + room.w * 0.7)} cy={px(room.y + room.h * 0.3)} r={9} fill="#1a1f1b" stroke="#6e776f" strokeWidth={3} />));
      } else if (style === 'mine') {
        // Ray ve ahşap destekler.
        layout.corridors.forEach((c, i) => {
          const horizontal = c.w >= c.h;
          const lines = horizontal
            ? [[px(c.x), px(c.y + c.h * 0.35), px(c.x + c.w), px(c.y + c.h * 0.35)], [px(c.x), px(c.y + c.h * 0.65), px(c.x + c.w), px(c.y + c.h * 0.65)]]
            : [[px(c.x + c.w * 0.35), px(c.y), px(c.x + c.w * 0.35), px(c.y + c.h)], [px(c.x + c.w * 0.65), px(c.y), px(c.x + c.w * 0.65), px(c.y + c.h)]];
          lines.forEach((l, k) => out.push(<line key={`rail${i}-${k}`} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="#8d8d8d" strokeWidth={3} />));
        });
        layout.rooms.forEach((room, i) => {
          out.push(<rect key={`post${i}a`} x={px(room.x) + 4} y={px(room.y) + 4} width={14} height={14} fill="#6a4a2a" stroke="#2c1d0e" strokeWidth={2} />);
          out.push(<rect key={`post${i}b`} x={px(room.x + room.w) - 18} y={px(room.y) + 4} width={14} height={14} fill="#6a4a2a" stroke="#2c1d0e" strokeWidth={2} />);
          out.push(<g key={`ore${i}`}>{times(4, (k) => <circle key={k} cx={px(room.x) + pick(r, 14, px(room.w) - 14)} cy={px(room.y) + pick(r, 14, px(room.h) - 14)} r={pick(r, 3, 6)} fill="#e8c14a" />)}</g>);
        });
      } else {
        layout.rooms.forEach((room, i) => {
          times(3, (k) => out.push(<polygon key={`st${i}-${k}`} points={`${px(room.x) + pick(r, 20, px(room.w) - 20)},${px(room.y) + 10} ${px(room.x) + pick(r, 20, px(room.w) - 20)},${px(room.y) + 34} ${px(room.x) + pick(r, 20, px(room.w) - 20)},${px(room.y) + 10}`} fill="#3a342b" />));
          out.push(<ellipse key={`pool${i}`} cx={px(room.x + room.w * 0.6)} cy={px(room.y + room.h * 0.6)} rx={px(room.w) * 0.14} ry={px(room.h) * 0.14} fill="#23323e" stroke="#4a5a66" strokeWidth={3} />);
          times(3, (k) => out.push(<circle key={`m${i}-${k}`} cx={px(room.x) + pick(r, 14, px(room.w) - 14)} cy={px(room.y) + pick(r, 14, px(room.h) - 14)} r={5} fill="#7de6c8" />));
        });
      }
      return out;
    },
  };
}

export const EXTRA_LOOKS: Record<ExtraRegion, ExtraLook> = {
  castle: { ground: ['#6a8c46', '#55743a'], patches: [['#78994f', 10, 40, 100], ['#4c6a33', 8, 30, 80]], features: (r, h) => treesAround(r, h, 14) },
  ship: {
    ground: ['#2f78a3', '#17476e'],
    patches: [['#1f5f8b', 14, 70, 170], ['#4b92b8', 12, 40, 120]],
    features: (r, h) => scatter(r, h, 50, (x, y, i) => (
      <path key={`c${i}`} d={`M ${x} ${y} q 8 -10 16 0 t 16 0`} fill="none" stroke="#e4f3f8" strokeWidth={3} strokeLinecap="round" opacity={pick(r, 0.3, 0.75)} />
    )),
  },
  camp: { ground: ['#7d9150', '#657c3d'], patches: [['#8aa05a', 12, 40, 100], ['#576d33', 10, 30, 80]], features: (r, h) => treesAround(r, h, 18) },
  graveyard: {
    ground: ['#56644a', '#3f4a36'],
    patches: [['#2f382a', 14, 40, 110], ['#667559', 8, 30, 80]],
    features: (r, h) => [
      ...treesAround(r, h, 8),
      ...scatter(r, h, 5, (x, y, i) => <ellipse key={`mist${i}`} cx={x} cy={y} rx={pick(r, 90, 160)} ry={pick(r, 24, 40)} fill="#dfe8e0" opacity={0.1} />),
    ],
  },
  temple: { ground: ['#6f8c4a', '#58743a'], patches: [['#7d9a55', 10, 40, 100], ['#4c6a33', 10, 30, 80]], features: (r, h) => treesAround(r, h, 12) },
  farm: {
    ground: ['#8aa653', '#6f8c45'],
    patches: [['#98b45f', 14, 50, 130], ['#627d3c', 10, 30, 90]],
    features: (r, h) => [
      ...scatter(r, h, 40, (x, y, i) => <path key={`g${i}`} d={`M ${x} ${y} l -5 -13 M ${x} ${y} l 2 -16 M ${x} ${y} l 8 -11`} stroke="#4f6b30" strokeWidth={2.5} fill="none" />),
      ...treesAround(r, h, 8),
    ],
  },
  river: {
    ground: ['#6f9a4e', '#587f3c'],
    patches: [['#7eaa59', 12, 40, 110], ['#4a6b32', 10, 30, 80]],
    features: (r, h) => [
      ...treesAround(r, h, 14),
      ...scatter(r, h, 22, (x, y, i) => <path key={`g${i}`} d={`M ${x} ${y} l -5 -12 M ${x} ${y} l 3 -15`} stroke="#3f5f28" strokeWidth={2.5} fill="none" />),
    ],
  },
  tavern: { ground: ['#4a3a2a', '#2d2318'], patches: [['#3a2d20', 10, 40, 100]], features: () => [] },
  market: { ground: ['#9a9387', '#7d776c'], patches: [['#8c8579', 16, 20, 60], ['#a8a195', 12, 16, 50]], features: () => [] },
  cavern: halls('cavern'),
  sewer: halls('sewer'),
  mine: halls('mine'),
};

export const isExtra = (terrain: Region): terrain is ExtraRegion => terrain in EXTRA_LOOKS;

const STRIPES = ['#c0463a', '#d4a53c', '#4f7fa8'];
const GROUND_FIRST = new Set(['paving', 'deck', 'field', 'stream', 'water', 'ford', 'bridge', 'boardwalk', 'pier', 'oasis', 'steps', 'hole', 'cave', 'log', 'bones']);

function drawProp(p: Prop, i: number, seed: number): ReactNode {
  const x = px(p.x);
  const y = px(p.y);
  const w = px(p.w);
  const h = px(p.h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const k = `${p.type}${i}`;
  const rad = Math.min(w, h) / 2;
  switch (p.type) {
    case 'paving':
      return <rect key={k} x={x} y={y} width={w} height={h} fill={`url(#pave-${seed})`} />;
    case 'stonewall': case 'ruinwall':
      return <rect key={k} x={x} y={y} width={w} height={h} fill="#78746c" stroke="#26231f" strokeWidth={2.5} strokeDasharray={p.type === 'ruinwall' ? '14 5' : undefined} />;
    case 'fence':
      return <rect key={k} x={x} y={y} width={Math.max(w, 3)} height={Math.max(h, 3)} fill="#7a5a34" stroke="#3d2a14" strokeWidth={1.5} />;
    case 'tower': case 'watchtower':
      return (
        <g key={k}>
          <rect x={x + 5} y={y + 6} width={w} height={h} fill="rgb(0 0 0 / 0.3)" />
          <rect x={x} y={y} width={w} height={h} fill="#6b6860" stroke="#25231f" strokeWidth={3} />
          <rect x={x + w * 0.2} y={y + h * 0.2} width={w * 0.6} height={h * 0.6} fill="#8a867d" stroke="#25231f" strokeWidth={2} />
        </g>
      );
    case 'well':
      return <g key={k}><circle cx={cx} cy={cy} r={rad} fill="#5d5850" stroke="#3a3631" strokeWidth={4} /><circle cx={cx} cy={cy} r={rad * 0.58} fill="#2a4a5c" /></g>;
    case 'crate':
      return <g key={k}><rect x={x} y={y} width={w} height={h} fill="#7a5a34" stroke="#3d2a14" strokeWidth={2.5} /><path d={`M ${x} ${y} L ${x + w} ${y + h} M ${x + w} ${y} L ${x} ${y + h}`} stroke="#3d2a14" strokeWidth={2} /></g>;
    case 'barrel':
      return <g key={k}><circle cx={cx} cy={cy} r={rad} fill="#6a4a2a" stroke="#34200f" strokeWidth={2.5} /><circle cx={cx} cy={cy} r={rad * 0.6} fill="none" stroke="#34200f" strokeWidth={2} /></g>;
    case 'deck':
      return <rect key={k} x={x} y={y} width={w} height={h} fill={`url(#deck-${seed})`} stroke="#3a2614" strokeWidth={6} rx={10} />;
    case 'mast':
      return <g key={k}><circle cx={cx} cy={cy} r={rad} fill="#5a3b1c" stroke="#24150a" strokeWidth={3} /><circle cx={cx} cy={cy} r={rad * 0.4} fill="#8a6234" /></g>;
    case 'campfire':
      return (
        <g key={k}>
          <circle cx={cx} cy={cy} r={rad * 1.9} fill="rgb(255 190 80 / 0.18)" />
          {times(7, (n) => <circle key={n} cx={cx + Math.cos((n / 7) * Math.PI * 2) * rad} cy={cy + Math.sin((n / 7) * Math.PI * 2) * rad} r={rad * 0.32} fill="#7b766c" stroke="#3a3631" strokeWidth={1.5} />)}
          <circle cx={cx} cy={cy} r={rad * 0.62} fill="#e8742a" />
          <circle cx={cx} cy={cy} r={rad * 0.32} fill="#ffd25a" />
        </g>
      );
    case 'tent':
      return (
        <g key={k}>
          <rect x={x + 4} y={y + 5} width={w} height={h} fill="rgb(0 0 0 / 0.28)" />
          <rect x={x} y={y} width={w} height={h} fill={p.variant === 1 ? '#c9a35a' : p.variant === 2 ? '#6f8a5b' : '#b8473b'} stroke="#2a1d14" strokeWidth={2.5} />
          <line x1={x} y1={cy} x2={x + w} y2={cy} stroke="#2a1d14" strokeWidth={2.5} />
        </g>
      );
    case 'wagon':
      return (
        <g key={k}>
          <rect x={x} y={y} width={w} height={h} fill="#8a6234" stroke="#34200f" strokeWidth={3} />
          <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} fill="#d8c9a0" opacity={0.8} />
          <circle cx={x + 8} cy={y} r={7} fill="#3a2614" /><circle cx={x + w - 8} cy={y} r={7} fill="#3a2614" />
          <circle cx={x + 8} cy={y + h} r={7} fill="#3a2614" /><circle cx={x + w - 8} cy={y + h} r={7} fill="#3a2614" />
        </g>
      );
    case 'gravestone':
      return <g key={k}><rect x={x} y={y} width={w} height={h} rx={w * 0.4} fill="#9ea09b" stroke="#3a3c38" strokeWidth={2} /><path d={`M ${cx} ${y + h * 0.2} v ${h * 0.5} M ${cx - w * 0.25} ${y + h * 0.4} h ${w * 0.5}`} stroke="#4e504b" strokeWidth={1.8} /></g>;
    case 'deadtree':
      return <g key={k} stroke="#3a2f24" strokeWidth={5} strokeLinecap="round" fill="none"><path d={`M ${cx} ${y + h} V ${cy} M ${cx} ${cy} l -${w * 0.35} -${h * 0.3} M ${cx} ${cy + 6} l ${w * 0.35} -${h * 0.35}`} /></g>;
    case 'column':
      return <g key={k}><circle cx={cx + 3} cy={cy + 4} r={rad} fill="rgb(0 0 0 / 0.28)" /><circle cx={cx} cy={cy} r={rad} fill="#bdb6a3" stroke="#4c483d" strokeWidth={3} /><circle cx={cx} cy={cy} r={rad * 0.5} fill="#8f8878" /></g>;
    case 'altar':
      return <g key={k}><rect x={x} y={y} width={w} height={h} fill="#8f8878" stroke="#3f3b33" strokeWidth={3} /><rect x={x + w * 0.2} y={y + h * 0.15} width={w * 0.6} height={h * 0.7} fill="#c8a94a" stroke="#6a5a1e" strokeWidth={2} /></g>;
    case 'steps':
      return <g key={k} stroke="#4c483d" strokeWidth={3}>{times(4, (n) => <line key={n} x1={x + (w / 4) * n} y1={y} x2={x + (w / 4) * n} y2={y + h} />)}</g>;
    case 'field':
      return (
        <g key={k}>
          <rect x={x} y={y} width={w} height={h} fill="#7a5a34" opacity={0.55} />
          {times(Math.max(2, Math.floor(h / 14)), (n) => <line key={n} x1={x + 4} y1={y + 8 + n * 14} x2={x + w - 4} y2={y + 8 + n * 14} stroke="#5f8f3a" strokeWidth={5} strokeLinecap="round" />)}
        </g>
      );
    case 'haystack':
      return <g key={k}><circle cx={cx + 3} cy={cy + 4} r={rad} fill="rgb(0 0 0 / 0.25)" /><circle cx={cx} cy={cy} r={rad} fill="#d8b85a" stroke="#8a6f22" strokeWidth={2.5} /><path d={`M ${cx - rad * 0.6} ${cy} h ${rad * 1.2} M ${cx - rad * 0.4} ${cy - rad * 0.4} h ${rad * 0.8}`} stroke="#a58a30" strokeWidth={2} /></g>;
    case 'water':
      return (
        <g key={k}>
          <rect x={x - 6} y={y} width={w + 12} height={h} fill="#c9b987" />
          <rect x={x} y={y} width={w} height={h} fill="#3f86a8" />
          {times(Math.max(1, Math.floor(h / 40)), (n) => <path key={n} d={`M ${x + 8} ${y + 14 + n * 40} q ${w * 0.25} -9 ${w * 0.5} 0 t ${w * 0.4} 0`} fill="none" stroke="#bfe0ea" strokeWidth={3} opacity={0.6} />)}
        </g>
      );
    case 'bridge':
      return (
        <g key={k}>
          <rect x={x} y={y} width={w} height={h} fill="#8a6234" stroke="#34200f" strokeWidth={3} />
          {times(Math.floor(w / 16), (n) => <line key={n} x1={x + 8 + n * 16} y1={y} x2={x + 8 + n * 16} y2={y + h} stroke="#5a3b1c" strokeWidth={2} />)}
          <rect x={x} y={y} width={w} height={5} fill="#3a2614" /><rect x={x} y={y + h - 5} width={w} height={5} fill="#3a2614" />
        </g>
      );
    case 'ford':
      return <g key={k}><rect x={x} y={y} width={w} height={h} fill="#5fa2bc" opacity={0.8} />{times(5, (n) => <circle key={n} cx={x + (w / 5) * (n + 0.5)} cy={cy + (n % 2 ? 6 : -6)} r={7} fill="#8f8a80" stroke="#4a463f" strokeWidth={2} />)}</g>;
    case 'bar':
      return <g key={k}><rect x={x} y={y} width={w} height={h} fill="#4a2f1a" stroke="#1d1209" strokeWidth={3} /><rect x={x + 4} y={y + 4} width={w - 8} height={h * 0.3} fill="#7a5230" /></g>;
    case 'table':
      return <g key={k}><circle cx={cx} cy={cy} r={rad} fill="#6a4a2a" stroke="#34200f" strokeWidth={3} />{times(4, (n) => <circle key={n} cx={cx + Math.cos((n / 4) * Math.PI * 2) * (rad + 8)} cy={cy + Math.sin((n / 4) * Math.PI * 2) * (rad + 8)} r={5} fill="#4a3220" />)}</g>;
    case 'stall':
      return (
        <g key={k}>
          <rect x={x + 3} y={y + 4} width={w} height={h} fill="rgb(0 0 0 / 0.28)" />
          <rect x={x} y={y} width={w} height={h} fill="#e8dcc0" stroke="#3a2d1c" strokeWidth={2.5} />
          {times(Math.floor(w / 12), (n) => <rect key={n} x={x + n * 12} y={y} width={6} height={h} fill={STRIPES[(p.variant + n) % 3]} opacity={0.9} />)}
        </g>
      );
    case 'fountain':
      return <g key={k}><circle cx={cx} cy={cy} r={rad} fill="#aaa59a" stroke="#4a463f" strokeWidth={4} /><circle cx={cx} cy={cy} r={rad * 0.78} fill="#3f86a8" /><circle cx={cx} cy={cy} r={rad * 0.25} fill="#c9d4d8" stroke="#4a463f" strokeWidth={2} /></g>;
    case 'stream':
      return <path key={k} d={`M ${x} ${cy} C ${x + w * 0.25} ${cy - 30} ${x + w * 0.5} ${cy + 30} ${x + w} ${cy - 8}`} fill="none" stroke="#4f93b3" strokeWidth={14} strokeLinecap="round" opacity={0.85} />;
    case 'windmill':
      return <g key={k}><rect x={x} y={y} width={w} height={h} fill="#b9a98a" stroke="#4a3f2a" strokeWidth={3} />{[0, 1, 2, 3].map((n) => <line key={n} x1={cx} y1={cy} x2={cx + Math.cos((n * Math.PI) / 2 + 0.6) * w * 1.1} y2={cy + Math.sin((n * Math.PI) / 2 + 0.6) * w * 1.1} stroke="#e8dcc0" strokeWidth={6} strokeLinecap="round" />)}</g>;
    case 'menhir':
      return <rect key={k} x={x} y={y} width={w} height={h} rx={4} fill="#8d8f88" stroke="#3a3c38" strokeWidth={2} />;
    case 'boulder':
      return <ellipse key={k} cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill="#7d7f76" stroke="#3a3c38" strokeWidth={3} />;
    case 'cave':
      return <g key={k}><ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill="#8a857b" stroke="#3a3731" strokeWidth={4} /><ellipse cx={cx} cy={cy + h * 0.08} rx={w * 0.3} ry={h * 0.28} fill="#0d0b0a" /></g>;
    case 'obelisk':
      return <polygon key={k} points={`${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`} fill="#3f3c44" stroke="#1d1b21" strokeWidth={3} />;
    case 'oasis':
      return (
        <g key={k}>
          <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill="#d9c98f" />
          <ellipse cx={cx} cy={cy} rx={w * 0.38} ry={h * 0.36} fill="#3f86a8" />
          {[0, 1, 2].map((n) => <circle key={n} cx={x + w * (0.15 + n * 0.35)} cy={y + h * 0.1} r={10} fill="#3f7a3a" stroke="#254a22" strokeWidth={2} />)}
        </g>
      );
    case 'bones':
      return <g key={k} stroke="#ece6d2" strokeWidth={4} strokeLinecap="round"><path d={`M ${x} ${cy} h ${w} M ${x + w * 0.2} ${y} l ${w * 0.5} ${h}`} /></g>;
    case 'boardwalk': case 'pier':
      return (
        <g key={k}>
          <rect x={x} y={y} width={w} height={h} fill="#8a6a42" stroke="#3a2614" strokeWidth={3} />
          {times(Math.floor(w / 14), (n) => <line key={n} x1={x + 7 + n * 14} y1={y} x2={x + 7 + n * 14} y2={y + h} stroke="#5a4226" strokeWidth={2} />)}
        </g>
      );
    case 'lighthouse':
      return <g key={k}><circle cx={cx} cy={cy} r={rad} fill="#e8e4d8" stroke="#3a3631" strokeWidth={3} /><circle cx={cx} cy={cy} r={rad * 0.62} fill="#c0463a" /><circle cx={cx} cy={cy} r={rad * 0.25} fill="#ffd25a" /></g>;
    case 'igloo':
      return <g key={k}><circle cx={cx} cy={cy} r={rad} fill="#f2f7fa" stroke="#9fb4c0" strokeWidth={3} /><rect x={cx - rad * 0.2} y={cy + rad * 0.55} width={rad * 0.4} height={rad * 0.45} fill="#7f9fb0" /></g>;
    case 'hole':
      return <ellipse key={k} cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill="#2f6688" stroke="#e9f4fa" strokeWidth={5} />;
    case 'rubble':
      return <g key={k}><ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill="#96907f" stroke="#4c483d" strokeWidth={2} /></g>;
    case 'log':
      return <rect key={k} x={x} y={y} width={w} height={h} rx={h / 2} fill="#6a4a2a" stroke="#34200f" strokeWidth={2} />;
    default:
      return <rect key={k} x={x} y={y} width={w} height={h} fill="#8a8a8a" opacity={0.6} />;
  }
}

const furniture = (b: PlaceBuilding, r: Rand, bi: number): ReactNode[] =>
  b.rooms.flatMap((room: Rect, k) => {
    const cx = px(room.x + room.w / 2);
    const cy = px(room.y + room.h / 2);
    const kind = Math.floor(r() * 3);
    const key = `fn${bi}-${k}`;
    if (kind === 0) return [<g key={key}><rect x={px(room.x) + 8} y={px(room.y) + 8} width={30} height={16} fill="#c9c2b4" stroke="#4a4036" strokeWidth={2} /><rect x={px(room.x) + 9} y={px(room.y) + 9} width={9} height={14} fill="#e8e1d2" /></g>];
    if (kind === 1) return [<circle key={key} cx={cx} cy={cy} r={Math.min(12, px(Math.min(room.w, room.h)) / 3)} fill="#6a4a2a" stroke="#34200f" strokeWidth={2} />];
    return [<rect key={key} x={px(room.x + room.w) - 24} y={px(room.y + room.h) - 24} width={16} height={16} fill="#7a5a34" stroke="#3d2a14" strokeWidth={2} />];
  });

/** Yerleşimin çizimi: önce zemin süsleri, sonra odalı yapılar, en üstte katı yapılar. */
export function drawPlace(layout: PlaceLayout, seed: number, r: Rand): ReactNode[] {
  const ground = layout.props.filter((p) => GROUND_FIRST.has(p.type) || p.type === 'paving' || p.type === 'deck');
  const solid = layout.props.filter((p) => !GROUND_FIRST.has(p.type) && p.type !== 'paving' && p.type !== 'deck');
  const out: ReactNode[] = [
    <defs key="place-defs">
      <pattern id={`pave-${seed}`} width="44" height="44" patternUnits="userSpaceOnUse">
        <rect width="44" height="44" fill="#9a958a" />
        <path d="M 0 0 H 44 M 0 22 H 44 M 0 0 V 22 M 22 22 V 44" stroke="#6f6a60" strokeWidth="2" fill="none" />
      </pattern>
      <pattern id={`deck-${seed}`} width="60" height="18" patternUnits="userSpaceOnUse">
        <rect width="60" height="18" fill="#9a7448" />
        <path d="M 0 0 H 60 M 0 9 H 60 M 12 0 V 9 M 40 9 V 18" stroke="#6d5233" strokeWidth="1.6" fill="none" />
      </pattern>
      <pattern id={`planks-place-${seed}`} width="40" height="22" patternUnits="userSpaceOnUse">
        <rect width="40" height="22" fill="#94714a" />
        <path d="M 0 0 H 40 M 0 11 H 40 M 20 0 V 11 M 8 11 V 22" stroke="#6d5233" strokeWidth="1.6" fill="none" />
      </pattern>
    </defs>,
    ...ground.map((p, i) => drawProp(p, i, seed)),
  ];
  layout.buildings.forEach((b, i) => {
    out.push(
      <rect key={`bs${i}`} x={px(b.rect.x) + 6} y={px(b.rect.y) + 7} width={px(b.rect.w)} height={px(b.rect.h)} fill="rgb(0 0 0 / 0.28)" />,
      <rect key={`bf${i}`} x={px(b.rect.x)} y={px(b.rect.y)} width={px(b.rect.w)} height={px(b.rect.h)} fill={`url(#planks-place-${seed})`} />,
      ...furniture(b, r, i),
      ...b.walls.map((w, k) => <rect key={`bw${i}-${k}`} x={px(w.x)} y={px(w.y)} width={Math.max(px(w.w), 1)} height={Math.max(px(w.h), 1)} fill="#2b221b" stroke="#100b08" strokeWidth={1.5} />),
      ...b.doors.map((d, k) => <rect key={`bd${i}-${k}`} x={px(d.x)} y={px(d.y)} width={Math.max(px(d.w), 3)} height={Math.max(px(d.h), 3)} fill="#b98a4c" opacity={0.85} />),
    );
  });
  out.push(...solid.map((p, i) => drawProp(p, i + ground.length, seed)));
  return out;
}
