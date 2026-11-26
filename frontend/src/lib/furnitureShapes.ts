// Pure geometry for a zone's furniture decoration (the shelf/drawer lines,
// table legs, etc. drawn by FurnitureIcon). Kept as plain data descriptors,
// not JSX, so the exact same math can be used two ways: React renders them
// declaratively on a normal commit, and a live zone resize recomputes them
// every frame and pokes the existing Konva nodes directly (no React state
// per frame) - see RoomCanvas's resize handle.

// Space reserved at the top of every zone for its name, so furniture lines
// never cross through it.
export const ZONE_HEADER_HEIGHT = 18;

// Below this, there's no sensible room left to draw furniture decoration -
// hide it and keep just the name visible.
const MIN_CONTENT_WIDTH = 24;
const MIN_CONTENT_HEIGHT = 16;

export type FurnitureShape =
  | { kind: 'line'; key: string; points: number[] }
  | { kind: 'circle'; key: string; x: number; y: number; radius: number }
  | {
      kind: 'rectFill' | 'rectStroke';
      key: string;
      x: number;
      y: number;
      width: number;
      height: number;
      cornerRadius?: number;
      opacity?: number;
    };

export function computeFurnitureShapes(
  type: string,
  width: number,
  height: number,
  attributes: { shelves?: number; drawers?: number } = {}
): FurnitureShape[] {
  const contentHeight = height - ZONE_HEADER_HEIGHT;
  if (width < MIN_CONTENT_WIDTH || contentHeight < MIN_CONTENT_HEIGHT) return [];

  const shapes: FurnitureShape[] = [];
  const top = ZONE_HEADER_HEIGHT;

  const addShelfLines = (w: number, h: number, count: number, keyPrefix: string) => {
    if (!count || count < 1) return;
    for (let i = 1; i <= count; i++) {
      const y = (h / (count + 1)) * i + top;
      shapes.push({ kind: 'line', key: `${keyPrefix}-${i}`, points: [4, y, w - 4, y] });
    }
  };

  const addDrawerRows = (w: number, h: number, count: number) => {
    if (!count || count < 1) return;
    const rowH = h / count;
    for (let i = 1; i < count; i++) {
      const y = rowH * i + top;
      shapes.push({ kind: 'line', key: `drawer-line-${i}`, points: [2, y, w - 2, y] });
    }
    for (let i = 0; i < count; i++) {
      const cy = rowH * i + rowH / 2 + top;
      shapes.push({
        kind: 'rectFill',
        key: `drawer-handle-${i}`,
        x: w / 2 - 8,
        y: cy - 1.5,
        width: 16,
        height: 3,
        cornerRadius: 1.5,
      });
    }
  };

  switch (type) {
    case 'cabinet':
    case 'shelf':
      addShelfLines(width, contentHeight, attributes.shelves ?? 3, 'shelf');
      break;

    case 'wardrobe':
      shapes.push({
        kind: 'line',
        key: 'wardrobe-divider',
        points: [width / 2, 2 + top, width / 2, height - 2],
      });
      shapes.push({
        kind: 'circle',
        key: 'wardrobe-handle-l',
        x: width / 2 - 6,
        y: top + contentHeight / 2,
        radius: 1.6,
      });
      shapes.push({
        kind: 'circle',
        key: 'wardrobe-handle-r',
        x: width / 2 + 6,
        y: top + contentHeight / 2,
        radius: 1.6,
      });
      addShelfLines(width, contentHeight * 0.4, attributes.shelves ?? 2, 'wardrobe-shelf');
      break;

    case 'drawer':
      addDrawerRows(width, contentHeight, attributes.drawers ?? 3);
      break;

    case 'table': {
      const legR = 3;
      const inset = 6;
      shapes.push({ kind: 'circle', key: 'leg-tl', x: inset, y: top + inset, radius: legR });
      shapes.push({ kind: 'circle', key: 'leg-tr', x: width - inset, y: top + inset, radius: legR });
      shapes.push({ kind: 'circle', key: 'leg-bl', x: inset, y: height - inset, radius: legR });
      shapes.push({ kind: 'circle', key: 'leg-br', x: width - inset, y: height - inset, radius: legR });

      if ((attributes.drawers ?? 0) > 0) {
        const midY = top + contentHeight / 2;
        shapes.push({ kind: 'line', key: 'table-line', points: [width * 0.25, midY, width * 0.75, midY] });
        shapes.push({
          kind: 'rectFill',
          key: 'table-handle',
          x: width / 2 - 7,
          y: midY - 1.5,
          width: 14,
          height: 3,
          cornerRadius: 1.5,
        });
      }
      break;
    }

    case 'bed':
      shapes.push({
        kind: 'rectStroke',
        key: 'bed-pillow',
        x: width * 0.08,
        y: top + contentHeight * 0.08,
        width: width * 0.84,
        height: contentHeight * 0.32,
        cornerRadius: 3,
      });
      break;

    case 'sofa':
      shapes.push({
        kind: 'rectFill',
        key: 'sofa-back',
        x: 2,
        y: top + 2,
        width: width - 4,
        height: contentHeight * 0.32,
        cornerRadius: 3,
        opacity: 0.25,
      });
      shapes.push({
        kind: 'rectFill',
        key: 'sofa-arm-l',
        x: 2,
        y: top + 2,
        width: width * 0.14,
        height: contentHeight - 4,
        cornerRadius: 3,
        opacity: 0.18,
      });
      shapes.push({
        kind: 'rectFill',
        key: 'sofa-arm-r',
        x: width - width * 0.14 - 2,
        y: top + 2,
        width: width * 0.14,
        height: contentHeight - 4,
        cornerRadius: 3,
        opacity: 0.18,
      });
      break;

    case 'box':
    default:
      break;
  }

  return shapes;
}
