export interface VineLeafGeometry {
  cx: number;
  cy: number;
  flip: 1 | -1;
  width: 5;
  height: 8;
}

export interface VineGeometry {
  mainPath: string;
  branches: [string, string];
  leaves: [VineLeafGeometry, VineLeafGeometry];
  filledAreaRatio: number;
}

const VIEWBOX_WIDTH = 160;
const VIEWBOX_HEIGHT = 40;
const MAX_LEAF_WIDTH = 5;
const MAX_LEAF_HEIGHT = 8;
const MAX_FILLED_AREA_RATIO = 0.08;

export function validateVineGeometry(geometry: VineGeometry): string[] {
  const errors: string[] = [];
  const paths = [geometry.mainPath, ...geometry.branches];

  if (geometry.leaves.length > 2) errors.push('leaf count exceeds 2');
  if (!Number.isFinite(geometry.filledAreaRatio) || geometry.filledAreaRatio < 0) {
    errors.push('filled-area ratio is not finite and non-negative');
  } else if (geometry.filledAreaRatio >= MAX_FILLED_AREA_RATIO) {
    errors.push('filled-area ratio reaches or exceeds 8%');
  }

  geometry.leaves.forEach((leaf, index) => {
    const values = [leaf.cx, leaf.cy, leaf.width, leaf.height, leaf.flip];
    if (!values.every(Number.isFinite)) {
      errors.push(`leaf ${index} contains a non-finite value`);
      return;
    }
    if (leaf.width <= 0 || leaf.width > MAX_LEAF_WIDTH) {
      errors.push(`leaf ${index} width is outside (0, 5]`);
    }
    if (leaf.height <= 0 || leaf.height > MAX_LEAF_HEIGHT) {
      errors.push(`leaf ${index} height is outside (0, 8]`);
    }
    if (
      leaf.cx - leaf.width / 2 < 0 ||
      leaf.cx + leaf.width / 2 > VIEWBOX_WIDTH ||
      leaf.cy - leaf.height / 2 < 0 ||
      leaf.cy + leaf.height / 2 > VIEWBOX_HEIGHT
    ) {
      errors.push(`leaf ${index} exits the 160 by 40 view box`);
    }
  });

  paths.forEach((path, index) => {
    if (/NaN|Infinity/.test(path)) {
      errors.push(`path ${index} contains a non-finite value`);
      return;
    }
    const numericTokens = path.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi)?.map(Number) ?? [];
    if (numericTokens.length === 0 || numericTokens.some((value) => !Number.isFinite(value))) {
      errors.push(`path ${index} does not contain finite geometry`);
    } else if (numericTokens.some((value) => value < -8 || value > VIEWBOX_WIDTH + 8)) {
      errors.push(`path ${index} contains out-of-range geometry`);
    }
  });

  return errors;
}

export function assertValidVineGeometry(geometry: VineGeometry): VineGeometry {
  const errors = validateVineGeometry(geometry);
  if (errors.length > 0) throw new Error(`Invalid VineConnector geometry: ${errors.join('; ')}`);
  return geometry;
}

function boundedHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function buildVineGeometry(fromId: string, toId: string): VineGeometry {
  const hash = boundedHash(`${fromId}:${toId}`);
  const bend = (hash % 9) - 4;
  const direction = hash % 2 === 0 ? 1 : -1;
  const upperX = 80 + bend;
  const lowerX = 80 - bend;
  const upperLeafX = upperX + direction * 9;
  const lowerLeafX = lowerX - direction * 8;

  const leaves: [VineLeafGeometry, VineLeafGeometry] = [
    { cx: upperLeafX, cy: 10, flip: direction, width: 5, height: 8 },
    { cx: lowerLeafX, cy: 26, flip: direction === 1 ? -1 : 1, width: 5, height: 8 },
  ];
  const leafFilledArea = leaves.length * Math.PI * 2.5 * 4;
  const conservativeStrokeArea = 40 * 1.25 + 2 * 14 * 0.875;
  const connectorArea = 160 * 40;

  return assertValidVineGeometry({
    mainPath: `M 80 1 C ${upperX} 11, ${lowerX} 29, 80 39`,
    branches: [
      `M ${upperX} 14 Q ${upperX + direction * 5} 11, ${upperLeafX} 10`,
      `M ${lowerX} 28 Q ${lowerX - direction * 4} 26, ${lowerLeafX} 26`,
    ],
    leaves,
    filledAreaRatio: (leafFilledArea + conservativeStrokeArea) / connectorArea,
  });
}
