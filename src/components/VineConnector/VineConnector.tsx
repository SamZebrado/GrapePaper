import { useMemo } from 'react';
import styles from './VineConnector.module.css';

interface VineConnectorProps {
  fromId: string;
  toId: string;
}

export default function VineConnector({ fromId, toId }: VineConnectorProps) {
  // Generate deterministic but organic-looking curves based on IDs
  const seed = useMemo(() => {
    let hash = 0;
    const combined = fromId + toId;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 31 + combined.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }, [fromId, toId]);

  const cp1x = 30 + (seed % 40);
  const cp1y = 15 + ((seed >> 4) % 10);
  const cp2x = 70 + ((seed >> 8) % 20);
  const cp2y = 40 + ((seed >> 12) % 10);

  const leafPositions = useMemo(() => {
    const positions: { cx: number; cy: number; r: number; rotate: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const t = 0.2 + (i * 0.3);
      // Approximate bezier point
      const mt = 1 - t;
      const x = mt * mt * mt * 100 + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * 100;
      const y = mt * mt * mt * 0 + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * 60;
      positions.push({
        cx: x,
        cy: y,
        r: 4 + (seed >> (i * 4) % 3),
        rotate: ((seed >> (i * 3)) % 60) - 30,
      });
    }
    return positions;
  }, [seed, cp1x, cp1y, cp2x, cp2y]);

  return (
    <div className={styles.connector}>
      <svg
        className={styles.vineSvg}
        viewBox="0 0 200 60"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`vine-grad-${seed}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a7c29" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#2d5016" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#4a7c29" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Main vine stem */}
        <path
          className={styles.vinePath}
          d={`M 100 0 C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, 100 60`}
          fill="none"
          stroke={`url(#vine-grad-${seed})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Small curling tendrils */}
        <path
          d={`M ${cp1x} ${cp1y} Q ${cp1x + 8} ${cp1y - 8}, ${cp1x + 3} ${cp1y - 12}`}
          fill="none"
          stroke="#4a7c29"
          strokeWidth="1"
          opacity="0.5"
          strokeLinecap="round"
        />
        <path
          d={`M ${cp2x} ${cp2y} Q ${cp2x - 8} ${cp2y + 6}, ${cp2x - 4} ${cp2y + 10}`}
          fill="none"
          stroke="#4a7c29"
          strokeWidth="1"
          opacity="0.5"
          strokeLinecap="round"
        />

        {/* Leaf decorations along the vine */}
        {leafPositions.map((leaf, i) => (
          <g
            key={i}
            className={styles.leafDeco}
            transform={`translate(${leaf.cx}, ${leaf.cy}) rotate(${leaf.rotate})`}
          >
            <ellipse
              cx="0"
              cy="0"
              rx={leaf.r}
              ry={leaf.r * 1.6}
              fill="#4a7c29"
              opacity="0.35"
            />
            {/* Leaf vein */}
            <line
              x1="0"
              y1={-leaf.r * 1.4}
              x2="0"
              y2={leaf.r * 1.4}
              stroke="#2d5016"
              strokeWidth="0.5"
              opacity="0.3"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
