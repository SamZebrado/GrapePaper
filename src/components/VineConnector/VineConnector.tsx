import { useMemo } from 'react';
import { buildVineGeometry } from './VineConnector.geometry';
import styles from './VineConnector.module.css';

interface VineConnectorProps {
  fromId: string;
  toId: string;
}

export default function VineConnector({ fromId, toId }: VineConnectorProps) {
  const geometry = useMemo(() => buildVineGeometry(fromId, toId), [fromId, toId]);

  return (
    <div
      className={styles.connector}
      data-testid="vine-connector"
      data-filled-area-ratio={geometry.filledAreaRatio.toFixed(4)}
      aria-hidden="true"
    >
      <svg
        className={styles.vineSvg}
        viewBox="0 0 160 40"
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
        role="presentation"
      >
        <path className={styles.mainStem} d={geometry.mainPath} />

        {geometry.branches.map((branch) => (
          <path key={branch} className={styles.branch} d={branch} />
        ))}

        {geometry.leaves.map((leaf, index) => (
          <g
            key={`${leaf.cx}-${leaf.cy}`}
            className={styles.leaf}
            transform={`translate(${leaf.cx} ${leaf.cy}) scale(${leaf.flip} 1)`}
            data-testid="vine-leaf"
          >
            <path d="M 0 -4 C 2.5 -2.4 2.3 1.6 0 4 C -2.3 1.6 -2.5 -2.4 0 -4 Z" />
            <path className={styles.leafVein} d="M 0 -3 L 0 3" />
            <title>{`Decorative vine leaf ${index + 1}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}
