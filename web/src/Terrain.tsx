import { memo, type ReactNode } from 'react';
import { dungeonLayout, placeLayout, seeded, townLayout, type Region, type TownKind } from '@masa/shared';
import { EXTRA_LOOKS, drawPlace, isExtra, type ExtraRegion } from './Looks';

const W = 1000;
type Rand = () => number;

/** Bir arazinin görünüşü: zemin renkleri ve üstüne serpiştirilen öğeler. */
interface Look {
  ground: [string, string];
  /** Zemindeki düzensiz lekeler: renk, adet, yarıçap aralığı. */
  patches: [string, number, number, number][];
  features: (r: Rand, h: number, ctx: { seed: number; aspect: number }) => ReactNode[];
}

const pick = (r: Rand, min: number, max: number): number => min + r() * (max - min);
const times = <T,>(n: number, make: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => make(i));

/** Düzensiz kaya: çevresindeki noktaları merkeze farklı uzaklıkta bir çokgen. */
function rock(r: Rand, key: string, x: number, y: number, size: number, fill: string, edge: string): ReactNode {
  const points = times(7, (i) => {
    const a = (i / 7) * Math.PI * 2;
    const d = size * pick(r, 0.65, 1);
    return `${(x + Math.cos(a) * d).toFixed(1)},${(y + Math.sin(a) * d * 0.8).toFixed(1)}`;
  }).join(' ');
  return <polygon key={key} points={points} fill={fill} stroke={edge} strokeWidth={3} strokeLinejoin="round" />;
}

/** Ağaç tepesi: üst üste binen birkaç daire ve bir ışık lekesi. */
function tree(r: Rand, key: string, x: number, y: number, size: number, dark: string, light: string): ReactNode {
  return (
    <g key={key}>
      <ellipse cx={x + size * 0.2} cy={y + size * 0.3} rx={size} ry={size * 0.8} fill="rgb(0 0 0 / 0.28)" />
      {times(4, (i) => (
        <circle key={i} cx={x + pick(r, -0.4, 0.4) * size} cy={y + pick(r, -0.4, 0.4) * size} r={size * pick(r, 0.55, 0.8)} fill={dark} />
      ))}
      <circle cx={x - size * 0.25} cy={y - size * 0.25} r={size * 0.42} fill={light} />
    </g>
  );
}

/** Kıvrılarak alanı boydan boya geçen şerit: yol, dere, çatlak. */
function ribbon(r: Rand, key: string, h: number, width: number, stroke: string, opacity = 1): ReactNode {
  const y0 = pick(r, 0.15, 0.85) * h;
  const y1 = pick(r, 0.15, 0.85) * h;
  const d = `M -40 ${y0.toFixed(0)} C ${pick(r, 200, 400).toFixed(0)} ${(pick(r, 0, 1) * h).toFixed(0)}, ${pick(r, 600, 800).toFixed(0)} ${(pick(r, 0, 1) * h).toFixed(0)}, ${W + 40} ${y1.toFixed(0)}`;
  return <path key={key} d={d} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" opacity={opacity} />;
}

function pool(r: Rand, key: string, x: number, y: number, size: number, fill: string, rim: string): ReactNode {
  return <ellipse key={key} cx={x} cy={y} rx={size * pick(r, 0.9, 1.5)} ry={size * pick(r, 0.6, 1)} fill={fill} stroke={rim} strokeWidth={5}
    transform={`rotate(${pick(r, -40, 40).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})`} />;
}

/** Öğeyi alanın içinde rastgele bir yere koyar. */
const scatter = (r: Rand, h: number, n: number, make: (x: number, y: number, i: number) => ReactNode): ReactNode[] =>
  times(n, (i) => make(pick(r, 30, W - 30), pick(r, 30, h - 30), i));

/** Merkezi (cx, cy) olan düzensiz, yumuşak köşeli leke: göl gövdesi, kum bankı. */
function blob(r: Rand, cx: number, cy: number, rx: number, ry: number, n = 10): { d: string; at: (i: number) => [number, number] } {
  const pts = times(n, (i) => {
    const a = (i / n) * Math.PI * 2;
    const k = pick(r, 0.78, 1.08);
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k] as [number, number];
  });
  const mid = (a: [number, number], b: [number, number]): string => `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  const d = `M ${mid(pts[n - 1]!, pts[0]!)} ${pts.map((p, i) => `Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mid(p, pts[(i + 1) % n]!)}`).join(' ')} Z`;
  return { d, at: (i) => pts[i % n]! };
}

const crest = (key: string, x: number, y: number, s: number, opacity: number): ReactNode =>
  <path key={key} d={`M ${x} ${y} q ${s / 4} ${-s / 3} ${s / 2} 0 t ${s / 2} 0`} fill="none" stroke="#e4f3f8" strokeWidth={3} strokeLinecap="round" opacity={opacity} />;


/** Yerleşim: sokaklar zemin, arsalar bahçe ya da kaldırım, yapılar kuşbakışı odalarıyla çizilir. */
function settlement(kind: TownKind): Look {
  const town = kind === 'town';
  return {
    ground: town ? ['#a99b7a', '#8d805f'] : ['#8d887d', '#6f6a60'],
    patches: town ? [['#988a69', 14, 30, 90], ['#b8aa88', 10, 20, 60]] : [['#7b766c', 20, 20, 60], ['#9a958a', 16, 16, 50]],
    features: (r, h, { seed, aspect }) => {
      const layout = townLayout(seed, aspect, kind);
      const px = (v: number): number => v * W;
      const wood = `planks-${kind}-${seed}`;
      const out: ReactNode[] = [
        <defs key="defs">
          <pattern id={wood} width="40" height="22" patternUnits="userSpaceOnUse">
            <rect width="40" height="22" fill="#94714a" />
            <path d="M 0 0 H 40 M 0 11 H 40 M 20 0 V 11 M 8 11 V 22" stroke="#6d5233" strokeWidth="1.6" fill="none" />
          </pattern>
        </defs>,
        // Arsalar: kasabada otlu bahçe, şehirde kaldırım taşı.
        ...layout.plots.map((plot, i) => (
          <rect key={`plot${i}`} x={px(plot.x)} y={px(plot.y)} width={px(plot.w)} height={px(plot.h)} rx={town ? 10 : 3}
            fill={town ? '#6f8f4a' : '#aaa59a'} stroke={town ? '#4f6b34' : '#5f5a51'} strokeWidth={3} />
        )),
      ];
      if (town) {
        layout.plots.forEach((plot, i) => {
          for (let k = 0; k < 4; k += 1) {
            const x = px(plot.x) + pick(r, 0.1, 0.9) * px(plot.w);
            const y = px(plot.y) + pick(r, 0.1, 0.9) * px(plot.h);
            out.push(tree(r, `tree${i}-${k}`, x, y, pick(r, 14, 24), '#2f5a2c', '#4a7c3c'));
          }
        });
      }
      layout.buildings.forEach((b, i) => {
        const rect = b.rect;
        out.push(
          <rect key={`shadow${i}`} x={px(rect.x) + 6} y={px(rect.y) + 7} width={px(rect.w)} height={px(rect.h)} fill="rgb(0 0 0 / 0.28)" />,
          <rect key={`floor${i}`} x={px(rect.x)} y={px(rect.y)} width={px(rect.w)} height={px(rect.h)} fill={`url(#${wood})`} />,
        );
        b.rooms.forEach((room, k) => {
          const cx = px(room.x + room.w / 2);
          const cy = px(room.y + room.h / 2);
          const pieces = Math.floor(r() * 3);
          if (pieces === 0) out.push(<g key={`bed${i}-${k}`}><rect x={px(room.x) + 8} y={px(room.y) + 8} width={30} height={16} fill="#c9c2b4" stroke="#4a4036" strokeWidth={2} /><rect x={px(room.x) + 9} y={px(room.y) + 9} width={9} height={14} fill="#e8e1d2" /></g>);
          else if (pieces === 1) out.push(<g key={`table${i}-${k}`}><circle cx={cx} cy={cy} r={Math.min(12, px(Math.min(room.w, room.h)) / 3)} fill="#6a4a2a" stroke="#34200f" strokeWidth={2} /></g>);
          else out.push(<g key={`crate${i}-${k}`}><rect x={px(room.x + room.w) - 24} y={px(room.y + room.h) - 24} width={16} height={16} fill="#7a5a34" stroke="#3d2a14" strokeWidth={2} /></g>);
        });
      });
      out.push(
        ...layout.walls.map((w, i) => (
          <rect key={`wall${i}`} x={px(w.x)} y={px(w.y)} width={Math.max(px(w.w), 1)} height={Math.max(px(w.h), 1)} fill="#2b221b" stroke="#100b08" strokeWidth={1.5} />
        )),
        ...layout.doors.map((d, i) => (
          <rect key={`door${i}`} x={px(d.x)} y={px(d.y)} width={Math.max(px(d.w), 3)} height={Math.max(px(d.h), 3)} fill="#b98a4c" opacity={0.85} />
        )),
      );
      // Ana caddenin ortasında kuyu ya da çeşme.
      const mid = layout.areas[0];
      if (mid) {
        out.push(
          <g key="well"><circle cx={W / 2} cy={px(mid.y + mid.h / 2)} r={town ? 20 : 26} fill="#5d5850" stroke="#3a3631" strokeWidth={5} /><circle cx={W / 2} cy={px(mid.y + mid.h / 2)} r={town ? 11 : 16} fill="#2a4a5c" /></g>,
        );
      }
      return out;
    },
  };
}

const LOOKS: Record<Exclude<Region, ExtraRegion>, Look> = {
  forest: {
    ground: ['#46633b', '#34502f'],
    patches: [['#2c4428', 16, 40, 110], ['#587a45', 10, 30, 80]],
    features: (r, h) => [
      ribbon(r, 'path', h, 46, '#8c7a4c', 0.9),
      ...scatter(r, h, 5, (x, y, i) => rock(r, `r${i}`, x, y, pick(r, 14, 26), '#7d7f76', '#4a4c46')),
      ...scatter(r, h, 26, (x, y, i) => tree(r, `t${i}`, x, y, pick(r, 26, 46), '#2a4a2a', '#3f6a38')),
    ],
  },
  grassland: {
    ground: ['#86a352', '#6f8c45'],
    patches: [['#93b05c', 14, 50, 130], ['#627d3c', 10, 30, 90]],
    features: (r, h) => [
      ribbon(r, 'path', h, 38, '#b09a62', 0.85),
      ...scatter(r, h, 60, (x, y, i) => <path key={`g${i}`} d={`M ${x} ${y} l -5 -14 M ${x} ${y} l 2 -17 M ${x} ${y} l 8 -12`} stroke="#4f6b30" strokeWidth={2.5} fill="none" />),
      ...scatter(r, h, 5, (x, y, i) => rock(r, `r${i}`, x, y, pick(r, 12, 24), '#8b8c80', '#55564e')),
      ...scatter(r, h, 5, (x, y, i) => tree(r, `t${i}`, x, y, pick(r, 28, 42), '#3a6230', '#5b8a44')),
    ],
  },
  desert: {
    ground: ['#d9b877', '#c39c5a'],
    patches: [['#e6c98a', 12, 60, 150], ['#b58c4c', 8, 40, 110]],
    features: (r, h) => [
      ...times(9, (i) => ribbon(r, `d${i}`, h, pick(r, 5, 12), i % 2 ? '#a9813f' : '#eed59a', 0.55)),
      ...scatter(r, h, 9, (x, y, i) => rock(r, `r${i}`, x, y, pick(r, 14, 40), '#a17a4e', '#6e5030')),
      ...scatter(r, h, 6, (x, y, i) => (
        <g key={`c${i}`} stroke="#3f6b3a" strokeWidth={9} strokeLinecap="round" fill="none">
          <path d={`M ${x} ${y} v -34 M ${x - 13} ${y - 10} v -12 h 13 M ${x + 13} ${y - 16} v -10 h -13`} />
        </g>
      )),
    ],
  },
  mountain: {
    ground: ['#8a857b', '#6e6a62'],
    patches: [['#5a5750', 12, 50, 130], ['#a39d90', 10, 30, 90], ['#e4e8ea', 5, 30, 80]],
    features: (r, h) => [
      ...times(3, (i) => ribbon(r, `c${i}`, h, pick(r, 4, 8), '#3d3b37', 0.7)),
      ...scatter(r, h, 16, (x, y, i) => rock(r, `r${i}`, x, y, pick(r, 22, 62), '#77736a', '#3f3d38')),
      ...scatter(r, h, 5, (x, y, i) => tree(r, `t${i}`, x, y, pick(r, 20, 30), '#2f4a35', '#44664a')),
    ],
  },
  arctic: {
    ground: ['#eef3f6', '#d3e0e8'],
    patches: [['#ffffff', 14, 50, 140], ['#c2d3de', 10, 40, 100]],
    features: (r, h) => [
      ...scatter(r, h, 3, (x, y, i) => pool(r, `p${i}`, x, y, pick(r, 50, 100), '#a9cde0', '#e9f4fa')),
      ...times(6, (i) => ribbon(r, `c${i}`, h, pick(r, 2, 4), '#8fb0c4', 0.8)),
      ...scatter(r, h, 8, (x, y, i) => rock(r, `r${i}`, x, y, pick(r, 14, 36), '#9aa9b3', '#5f6f7a')),
      ...scatter(r, h, 4, (x, y, i) => tree(r, `t${i}`, x, y, pick(r, 20, 30), '#3c5a52', '#dfeaec')),
    ],
  },
  swamp: {
    ground: ['#56613c', '#414b30'],
    patches: [['#343d28', 14, 40, 120], ['#6a7446', 8, 30, 80]],
    features: (r, h) => [
      ...scatter(r, h, 8, (x, y, i) => pool(r, `p${i}`, x, y, pick(r, 40, 95), '#33473f', '#5d6b3f')),
      ...scatter(r, h, 40, (x, y, i) => <path key={`s${i}`} d={`M ${x} ${y} v -22 M ${x + 6} ${y} v -16`} stroke="#8a9450" strokeWidth={3} />),
      ...scatter(r, h, 8, (x, y, i) => (
        <g key={`d${i}`} stroke="#3a2f24" strokeWidth={7} strokeLinecap="round" fill="none">
          <path d={`M ${x} ${y} v -30 M ${x} ${y - 20} l -14 -12 M ${x} ${y - 14} l 15 -14`} />
        </g>
      )),
      ...scatter(r, h, 6, (x, y, i) => tree(r, `t${i}`, x, y, pick(r, 26, 40), '#2e3f27', '#4a5c34')),
    ],
  },
  coast: {
    ground: ['#e0c88e', '#cfb277'],
    patches: [['#ecd9a4', 10, 40, 120]],
    features: (r, h) => {
      const shore = pick(r, 0.4, 0.6) * W;
      const wave = (offset: number): string =>
        `M ${shore + offset} -20 ${times(6, (i) => `Q ${shore + offset + (i % 2 ? 60 : -60)} ${((i + 0.5) / 6) * h} ${shore + offset} ${((i + 1) / 6) * h + 4}`).join(' ')}`;
      return [
        <path key="sea" d={`${wave(0)} L ${W + 40} ${h + 20} L ${W + 40} -20 Z`} fill="#3f7fa3" />,
        <path key="deep" d={`${wave(170)} L ${W + 40} ${h + 20} L ${W + 40} -20 Z`} fill="#2f6688" />,
        <path key="foam" d={wave(0)} fill="none" stroke="#f3f8f6" strokeWidth={9} opacity={0.85} />,
        <path key="foam2" d={wave(60)} fill="none" stroke="#bfe0ea" strokeWidth={4} opacity={0.6} />,
        ...scatter(r, h, 9, (x, y, i) => rock(r, `r${i}`, x, y, pick(r, 12, 34), '#8d8778', '#565043')),
        ...times(5, (i) => tree(r, `t${i}`, pick(r, 40, shore - 80), pick(r, 40, h - 40), pick(r, 24, 36), '#2f6a3f', '#58a05a')),
      ];
    },
  },
  sea: {
    ground: ['#2f78a3', '#17476e'],
    patches: [['#1f5f8b', 14, 70, 170], ['#4b92b8', 12, 40, 120], ['#14405f', 6, 60, 140]],
    features: (r, h) => [
      // Dalga sırtları: derin suyun üstünde kısa beyaz yaylar.
      ...times(5, (i) => ribbon(r, `sw${i}`, h, pick(r, 10, 24), '#8fc6dc', 0.13)),
      ...scatter(r, h, 44, (x, y, i) => crest(`c${i}`, x, y, pick(r, 22, 50), pick(r, 0.35, 0.8))),
      // Su altı kayalıkları: köpük halkalı kayalar.
      ...scatter(r, h, 4, (x, y, i) => (
        <g key={`reef${i}`}>
          <circle cx={x} cy={y} r={46} fill="#5ea7c4" opacity={0.45} />
          <circle cx={x} cy={y} r={34} fill="none" stroke="#f3f8f6" strokeWidth={4} opacity={0.7} />
          {rock(r, `rk${i}`, x, y, pick(r, 14, 26), '#4d5a5e', '#26323a')}
        </g>
      )),
      // Sürüklenen bir tekne ve ardında dalga izi.
      ...scatter(r, h, 1, (x, y) => (
        <g key="boat" transform={`translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${pick(r, -25, 25).toFixed(0)})`}>
          <path d="M -90 8 Q -50 12 -10 6" stroke="#e4f3f8" strokeWidth={4} fill="none" opacity={0.5} />
          <path d="M -26 0 L 34 0 L 24 18 L -18 18 Z" fill="#7a4b2a" stroke="#3b2414" strokeWidth={3} />
          <line x1={4} y1={0} x2={4} y2={-42} stroke="#3b2414" strokeWidth={3} />
          <path d="M 6 -40 L 6 -6 L 30 -6 Z" fill="#efe6cf" stroke="#8c7d5c" strokeWidth={2} />
        </g>
      )),
    ],
  },
  lake: {
    ground: ['#7f9a52', '#5e7a3e'],
    patches: [['#8fae5c', 12, 40, 110], ['#506b34', 10, 30, 80]],
    features: (r, h) => {
      const body = blob(r, W / 2 + pick(r, -60, 60), h / 2 + pick(r, -20, 20), W * 0.36, h * 0.34);
      const deep = blob(r, W / 2, h / 2, W * 0.22, h * 0.2, 8);
      return [
        <path key="sand" d={body.d} fill="#dcc88e" stroke="#dcc88e" strokeWidth={34} strokeLinejoin="round" />,
        <path key="water" d={body.d} fill="#3f86a8" />,
        <path key="deep" d={deep.d} fill="#2c6988" opacity={0.75} />,
        ...times(14, (i) => crest(`c${i}`, pick(r, W * 0.2, W * 0.75), pick(r, h * 0.25, h * 0.75), pick(r, 18, 34), pick(r, 0.25, 0.55))),
        // Su zambakları ve kamışlar kıyıda toplanır.
        ...times(8, (i) => <ellipse key={`l${i}`} cx={pick(r, W * 0.25, W * 0.7)} cy={pick(r, h * 0.3, h * 0.7)} rx={pick(r, 10, 18)} ry={pick(r, 7, 12)} fill="#4f9a55" stroke="#2d6234" strokeWidth={2} />),
        ...times(10, (i) => {
          const [x, y] = body.at(i);
          return (
            <g key={`reed${i}`} stroke="#6f7f35" strokeWidth={4} strokeLinecap="round">
              <path d={`M ${x} ${y} v -30 M ${x + 8} ${y + 2} v -24 M ${x - 8} ${y + 3} v -20`} />
              <circle cx={x} cy={y - 32} r={4} fill="#5a3c22" stroke="none" />
            </g>
          );
        }),
        ...scatter(r, h, 3, (x, y, i) => (W * 0.15 < x && x < W * 0.85 && h * 0.2 < y && y < h * 0.8 ? <g key={`o${i}`} /> : rock(r, `r${i}`, x, y, pick(r, 14, 26), '#8b8c80', '#55564e'))),
        ...times(9, (i) => {
          const left = i % 2 === 0;
          return tree(r, `t${i}`, left ? pick(r, 30, W * 0.12) : pick(r, W * 0.88, W - 30), pick(r, 30, h - 30), pick(r, 26, 42), '#2f5a2c', '#4a7c3c');
        }),
      ];
    },
  },
  underwater: {
    ground: ['#2b6584', '#1a4560'],
    patches: [['#1a4560', 12, 50, 140], ['#3b7c98', 10, 40, 110]],
    features: (r, h) => [
      ...times(6, (i) => ribbon(r, `l${i}`, h, pick(r, 14, 30), '#7fc0d6', 0.14)),
      ...scatter(r, h, 10, (x, y, i) => rock(r, `r${i}`, x, y, pick(r, 16, 44), '#4f6b72', '#2b3f45')),
      ...scatter(r, h, 14, (x, y, i) => (
        <g key={`c${i}`} fill={['#e2725b', '#e8a04c', '#c85a8a'][i % 3]}>
          {times(5, (k) => <circle key={k} cx={x + pick(r, -16, 16)} cy={y + pick(r, -16, 16)} r={pick(r, 6, 12)} />)}
        </g>
      )),
      ...scatter(r, h, 26, (x, y, i) => <path key={`w${i}`} d={`M ${x} ${y} q 10 -14 0 -28 q -10 -14 0 -28`} stroke="#3f9a6b" strokeWidth={5} fill="none" strokeLinecap="round" />),
      ...scatter(r, h, 30, (x, y, i) => <circle key={`b${i}`} cx={x} cy={y} r={pick(r, 2, 6)} fill="none" stroke="#cfeaf2" strokeWidth={1.5} opacity={0.6} />),
    ],
  },
  underground: {
    ground: ['#4a4450', '#322e38'],
    patches: [['#26232b', 14, 50, 140], ['#5b5461', 8, 30, 90]],
    features: (r, h) => [
      // Mağara duvarı: kenarlar boyunca karanlık kaya kütleleri.
      ...times(26, (i) => {
        const side = i % 4;
        const along = pick(r, 0, 1);
        const x = side === 0 ? along * W : side === 1 ? along * W : side === 2 ? pick(r, -20, 40) : W - pick(r, -20, 40);
        const y = side === 0 ? pick(r, -20, 40) : side === 1 ? h - pick(r, -20, 40) : along * h;
        return rock(r, `w${i}`, x, y, pick(r, 50, 100), '#1c1a20', '#0f0e12');
      }),
      ...scatter(r, h, 12, (x, y, i) => rock(r, `r${i}`, x, y, pick(r, 12, 30), '#6a6370', '#2b2830')),
      ...scatter(r, h, 2, (x, y, i) => pool(r, `p${i}`, x, y, pick(r, 40, 70), '#23323e', '#4a5a66')),
      ...scatter(r, h, 10, (x, y, i) => (
        <g key={`m${i}`}>
          <circle cx={x} cy={y} r={20} fill="rgb(120 230 200 / 0.12)" />
          <circle cx={x} cy={y} r={6} fill="#7de6c8" />
          <circle cx={x + 10} cy={y + 5} r={4} fill="#7de6c8" />
        </g>
      )),
    ],
  },
  urban: {
    ground: ['#928b80', '#7c766c'],
    patches: [['#857e73', 30, 14, 34], ['#9c958a', 30, 12, 30]],
    features: (r, h) => [
      ribbon(r, 'street', h, 120, '#6a655d', 0.6),
      // Yapılar kenarlara yaslanır; ortası meydan olarak boş kalır.
      ...times(8, (i) => {
        const top = i % 2 === 0;
        const bw = pick(r, 130, 220);
        const bh = pick(r, 90, 150);
        const x = (i / 8) * W + pick(r, 0, 20);
        const y = top ? pick(r, -30, 10) : h - bh - pick(r, -30, 10);
        const roof = ['#8a4a3a', '#6b4c3a', '#5a5f6b'][i % 3]!;
        return (
          <g key={`b${i}`}>
            <rect x={x + 8} y={y + 10} width={bw} height={bh} fill="rgb(0 0 0 / 0.3)" />
            <rect x={x} y={y} width={bw} height={bh} fill={roof} stroke="#2f2620" strokeWidth={4} />
            <line x1={x} y1={y + bh / 2} x2={x + bw} y2={y + bh / 2} stroke="#2f2620" strokeWidth={3} opacity={0.5} />
          </g>
        );
      }),
      ...scatter(r, h, 10, (x, y, i) => <rect key={`c${i}`} x={x} y={y} width={pick(r, 22, 34)} height={pick(r, 22, 34)} fill="#8b6a3e" stroke="#4d3a20" strokeWidth={3} transform={`rotate(${pick(r, 0, 45).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})`} />),
      <g key="well"><circle cx={W / 2} cy={h / 2} r={36} fill="#5d5850" stroke="#3a3631" strokeWidth={6} /><circle cx={W / 2} cy={h / 2} r={20} fill="#2a4a5c" /></g>,
    ],
  },
  ruins: {
    ground: ['#7d776a', '#676254'],
    patches: [['#59614a', 12, 40, 110], ['#8f8878', 24, 16, 40]],
    features: (r, h) => [
      // Yıkık duvarlar: kopuk kopuk taş parçaları.
      ...times(10, (i) => {
        const x = pick(r, 60, W - 200);
        const y = pick(r, 60, h - 80);
        const horizontal = r() > 0.5;
        const len = pick(r, 80, 220);
        return (
          <g key={`w${i}`}>
            <rect x={x + 6} y={y + 8} width={horizontal ? len : 30} height={horizontal ? 30 : len} fill="rgb(0 0 0 / 0.3)" />
            <rect x={x} y={y} width={horizontal ? len : 30} height={horizontal ? 30 : len} fill="#a9a290" stroke="#4c483d" strokeWidth={4} strokeDasharray={`${pick(r, 30, 60).toFixed(0)} 6`} />
          </g>
        );
      }),
      ...scatter(r, h, 9, (x, y, i) => <g key={`c${i}`}><circle cx={x + 4} cy={y + 5} r={18} fill="rgb(0 0 0 / 0.3)" /><circle cx={x} cy={y} r={18} fill="#bdb6a3" stroke="#4c483d" strokeWidth={4} /><circle cx={x} cy={y} r={8} fill="#8f8878" /></g>),
      ...scatter(r, h, 18, (x, y, i) => rock(r, `r${i}`, x, y, pick(r, 8, 20), '#96907f', '#4c483d')),
      ...scatter(r, h, 4, (x, y, i) => tree(r, `t${i}`, x, y, pick(r, 22, 34), '#35502f', '#547a45')),
    ],
  },
  dungeon: {
    // Duvarlar koyu kayadır; odalar ve koridorlar taş döşemeli zemin olarak üstüne çizilir.
    ground: ['#27232d', '#15131a'],
    patches: [['#1e1b24', 12, 40, 110]],
    features: (r, h, { seed, aspect }) => {
      const layout = dungeonLayout(seed, aspect);
      const floors = [...layout.rooms, ...layout.corridors];
      const px = (v: number): number => v * W;
      const wall = 11;
      return [
        <defs key="tiles">
          <pattern id={`flags-${seed}`} width="48" height="48" patternUnits="userSpaceOnUse">
            <rect width="48" height="48" fill="#6d6874" />
            <path d="M 0 0 H 48 M 0 24 H 48 M 0 0 V 24 M 24 24 V 48" stroke="#4d4955" strokeWidth="2" fill="none" />
          </pattern>
        </defs>,
        ...floors.map((f, i) => (
          <rect key={`wall${i}`} x={px(f.x) - wall} y={px(f.y) - wall} width={px(f.w) + wall * 2} height={px(f.h) + wall * 2}
            fill="#0c0b10" stroke="#0c0b10" strokeWidth={4} strokeLinejoin="round" />
        )),
        ...floors.map((f, i) => (
          <rect key={`floor${i}`} x={px(f.x)} y={px(f.y)} width={px(f.w)} height={px(f.h)} fill={`url(#flags-${seed})`} />
        )),
        // Oda içi: sandıklar, fıçılar ve dökülmüş taşlar.
        ...layout.rooms.flatMap((room, ri) => times(2 + Math.floor(r() * 3), (k) => {
          const x = px(room.x) + pick(r, 0.12, 0.88) * px(room.w);
          const y = px(room.y) + pick(r, 0.15, 0.85) * px(room.h);
          const kind = Math.floor(r() * 3);
          return kind === 0
            ? <g key={`crate${ri}-${k}`}><rect x={x - 14} y={y - 14} width={28} height={28} fill="#7a5a34" stroke="#3d2a14" strokeWidth={3} /><path d={`M ${x - 14} ${y - 14} L ${x + 14} ${y + 14} M ${x + 14} ${y - 14} L ${x - 14} ${y + 14}`} stroke="#3d2a14" strokeWidth={2} /></g>
            : kind === 1
              ? <g key={`barrel${ri}-${k}`}><circle cx={x} cy={y} r={15} fill="#6a4a2a" stroke="#34200f" strokeWidth={3} /><circle cx={x} cy={y} r={9} fill="none" stroke="#34200f" strokeWidth={2} /></g>
              : rock(r, `rubble${ri}-${k}`, x, y, pick(r, 8, 15), '#8a8592', '#3f3b46');
        })),
        // Odaların kapıları: koridorun odaya girdiği yerde kalın bir eşik.
        ...layout.rooms.map((room, i) => (
          <rect key={`sill${i}`} x={px(room.x) - 4} y={px(room.y) - 4} width={px(room.w) + 8} height={px(room.h) + 8}
            fill="none" stroke="#2a2630" strokeWidth={5} />
        )),
      ];
    },
  },
  town: settlement('town'),
  city: settlement('city'),
  planar: {
    ground: ['#3a2452', '#1f1330'],
    patches: [['#55307a', 10, 60, 160], ['#160d22', 10, 40, 120]],
    features: (r, h) => [
      ...times(5, (i) => ribbon(r, `g${i}`, h, pick(r, 4, 10), ['#c77dff', '#5ce1e6', '#ff9e6b'][i % 3]!, 0.75)),
      ...scatter(r, h, 5, (x, y, i) => (
        <g key={`o${i}`} fill="none" stroke="#c77dff" opacity={0.5}>
          {times(3, (k) => <circle key={k} cx={x} cy={y} r={30 + k * 22} strokeWidth={3 - k * 0.7} />)}
        </g>
      )),
      ...scatter(r, h, 14, (x, y, i) => {
        const s = pick(r, 14, 34);
        return <polygon key={`k${i}`} points={`${x},${y - s} ${x + s * 0.5},${y} ${x},${y + s * 0.6} ${x - s * 0.5},${y}`} fill={['#9b5de5', '#5ce1e6'][i % 2]} stroke="#f1e4ff" strokeWidth={2} />;
      }),
      ...scatter(r, h, 50, (x, y, i) => <circle key={`s${i}`} cx={x} cy={y} r={pick(r, 1, 3)} fill="#f1e4ff" opacity={pick(r, 0.3, 0.9)} />),
    ],
  },
};

interface Props { terrain: Region; seed: number; aspect: number }

/** Arazi türüne ve tohuma göre çizilen savaş alanı zemini. Aynı tohum her ekranda aynı alanı verir. */
export const Terrain = memo(function Terrain({ terrain, seed, aspect }: Props) {
  const look: Look = isExtra(terrain) ? EXTRA_LOOKS[terrain] : LOOKS[terrain];
  const h = Math.round(W * aspect);
  const r = seeded(seed);
  const id = `ground-${terrain}-${seed}`;
  // Dedicated places and the single structures scattered over open terrains share one layout.
  const placed = ['dungeon', 'cavern', 'sewer', 'mine', 'town', 'city'].includes(terrain) ? null : placeLayout(terrain, seed, aspect);
  return (
    <svg className="terrain" data-terrain={terrain} data-seed={seed} viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor={look.ground[0]} />
          <stop offset="100%" stopColor={look.ground[1]} />
        </radialGradient>
      </defs>
      <rect width={W} height={h} fill={`url(#${id})`} />
      {look.patches.flatMap(([fill, count, min, max], p) =>
        scatter(r, h, count, (x, y, i) => (
          <ellipse key={`p${p}-${i}`} cx={x} cy={y} rx={pick(r, min, max)} ry={pick(r, min, max) * 0.7} fill={fill} opacity={0.45}
            transform={`rotate(${pick(r, 0, 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})`} />
        )))}
      {look.features(r, h, { seed, aspect })}
      {placed && drawPlace(placed, seed, r)}
    </svg>
  );
});
