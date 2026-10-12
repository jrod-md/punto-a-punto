// Small hand-drawn pieces that give the app its wool-and-garden character.
// They are decorative: every one is hidden from assistive technology.

const WOOL: readonly (readonly [number, number, number])[] = [
  [62, 54, 26],
  [36, 52, 14],
  [45, 38, 14],
  [61, 32, 15],
  [78, 36, 14],
  [90, 50, 14],
  [85, 65, 13],
  [64, 71, 14],
  [43, 67, 13],
  [99, 56, 6],
];
const TUFT: readonly (readonly [number, number, number])[] = [
  [24, 37, 6],
  [31, 34, 6.5],
  [37, 38, 5.5],
];

export function Sheep({
  className,
  asleep = false,
}: {
  className?: string;
  asleep?: boolean;
}) {
  return (
    <svg
      className={className ? `art ${className}` : 'art'}
      viewBox="0 0 120 100"
      aria-hidden="true"
      focusable="false"
    >
      {[42, 54, 71, 83].map((x) => (
        <rect
          key={x}
          x={x}
          y={74}
          width={6}
          height={17}
          rx={3}
          fill="var(--ink)"
        />
      ))}
      {WOOL.map(([cx, cy, r]) => (
        <circle
          key={`o${cx}`}
          cx={cx}
          cy={cy}
          r={r + 2}
          fill="var(--line-strong)"
        />
      ))}
      {WOOL.map(([cx, cy, r]) => (
        <circle key={`w${cx}`} cx={cx} cy={cy} r={r} fill="var(--surface)" />
      ))}
      <ellipse
        cx={15}
        cy={47}
        rx={7}
        ry={3.6}
        fill="var(--ink)"
        transform="rotate(-24 15 47)"
      />
      <ellipse
        cx={41}
        cy={46}
        rx={7}
        ry={3.6}
        fill="var(--ink)"
        transform="rotate(24 41 46)"
      />
      <ellipse cx={28} cy={52} rx={12.5} ry={14.5} fill="var(--ink)" />
      {TUFT.map(([cx, cy, r]) => (
        <circle
          key={`to${cx}`}
          cx={cx}
          cy={cy}
          r={r + 1.6}
          fill="var(--line-strong)"
        />
      ))}
      {TUFT.map(([cx, cy, r]) => (
        <circle key={`t${cx}`} cx={cx} cy={cy} r={r} fill="var(--surface)" />
      ))}
      {asleep ? (
        <>
          <path
            d="M21 52q2.5 2.4 5 0M30 52q2.5 2.4 5 0"
            fill="none"
            stroke="var(--surface)"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <text
            x={46}
            y={22}
            fontSize={13}
            fontWeight={800}
            fill="var(--garden)"
          >
            z
          </text>
          <text
            x={55}
            y={13}
            fontSize={9}
            fontWeight={800}
            fill="var(--garden)"
          >
            z
          </text>
        </>
      ) : (
        <>
          <circle cx={23.5} cy={51} r={2.1} fill="var(--surface)" />
          <circle cx={32.5} cy={51} r={2.1} fill="var(--surface)" />
        </>
      )}
      <circle cx={20} cy={57.5} r={2.6} fill="var(--rose)" />
      <circle cx={36} cy={57.5} r={2.6} fill="var(--rose)" />
    </svg>
  );
}

export function YarnBall({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `art ${className}` : 'art'}
      viewBox="0 0 72 64"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M30 52c-10 6-22 6-27-2"
        fill="none"
        stroke="var(--clay)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <circle cx={44} cy={34} r={24} fill="var(--clay)" />
      <g
        fill="none"
        stroke="var(--rose)"
        strokeWidth={2.2}
        strokeLinecap="round"
      >
        <path d="M23 26c12-10 30-10 42 2" />
        <path d="M21 36c14-8 32-6 46 4" />
        <path d="M25 47c12-6 26-4 37 4" />
        <path d="M36 12c-8 14-6 32 4 45" />
        <path d="M50 11c-6 14-4 32 6 44" />
      </g>
    </svg>
  );
}

// A strip of grass and flowers that sits at the bottom of the home banner.
export function Meadow({ className }: { className?: string }) {
  const flowers: readonly (readonly [number, number, string])[] = [
    [38, 16, 'var(--butter)'],
    [96, 22, 'var(--rose)'],
    [150, 15, 'var(--surface)'],
    [214, 21, 'var(--butter)'],
    [286, 16, 'var(--rose)'],
    [352, 22, 'var(--surface)'],
  ];
  return (
    <svg
      className={className ? `art ${className}` : 'art'}
      viewBox="0 0 400 44"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M0 22c40-12 70-12 110-4s80 8 130-2 100-8 160 4v24H0z"
        fill="var(--garden)"
        opacity={0.35}
      />
      <path
        d="M0 30c50-10 90-8 140-2s90 6 140-2 80-6 120 2v16H0z"
        fill="var(--garden)"
      />
      {flowers.map(([x, y, fill]) => (
        <g key={x}>
          <path
            d={`M${x} ${y + 3}v12`}
            stroke="var(--garden-deep)"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <circle cx={x} cy={y} r={4.4} fill={fill} />
          <circle cx={x} cy={y} r={1.6} fill="var(--clay)" />
        </g>
      ))}
    </svg>
  );
}

export function PictureIcon() {
  return (
    <svg
      className="art start-icon"
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x={4}
        y={7}
        width={32}
        height={26}
        rx={6}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
      />
      <circle cx={14} cy={16} r={3} fill="currentColor" />
      <path
        d="M6 29l9-8 6 5 5-4 8 7"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GridPencilIcon() {
  return (
    <svg
      className="art start-icon"
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x={5} y={5} width={24} height={24} rx={5} />
        <path d="M13 5v24M21 5v24M5 13h24M5 21h24" opacity={0.45} />
        <path d="M21 35l2-7 8-8 5 5-8 8z" fill="var(--surface)" />
      </g>
    </svg>
  );
}
