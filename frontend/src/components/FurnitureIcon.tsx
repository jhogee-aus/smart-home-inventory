import { Line, Circle, Rect } from 'react-konva';

interface Props {
  type: string;
  width: number;
  height: number;
  attributes?: { shelves?: number; drawers?: number };
}

const STROKE = '#3b5998';
const STROKE_WIDTH = 1;

function shelfLines(width: number, height: number, count: number) {
  if (!count || count < 1) return null;

  const lines = [];
  for (let i = 1; i <= count; i++) {
    const y = (height / (count + 1)) * i;
    lines.push(
      <Line
        key={`shelf-${i}`}
        points={[4, y, width - 4, y]}
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        listening={false}
      />
    );
  }
  return lines;
}

function drawerRows(width: number, height: number, count: number) {
  if (!count || count < 1) return null;

  const rowH = height / count;
  const rows = [];

  for (let i = 1; i < count; i++) {
    const y = rowH * i;
    rows.push(
      <Line
        key={`drawer-line-${i}`}
        points={[2, y, width - 2, y]}
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        listening={false}
      />
    );
  }

  for (let i = 0; i < count; i++) {
    const cy = rowH * i + rowH / 2;
    rows.push(
      <Rect
        key={`drawer-handle-${i}`}
        x={width / 2 - 8}
        y={cy - 1.5}
        width={16}
        height={3}
        cornerRadius={1.5}
        fill={STROKE}
        listening={false}
      />
    );
  }

  return rows;
}

function FurnitureIcon({ type, width, height, attributes = {} }: Props) {
  switch (type) {
    case 'cabinet':
      return <>{shelfLines(width, height, attributes.shelves ?? 3)}</>;

    case 'shelf':
      return <>{shelfLines(width, height, attributes.shelves ?? 3)}</>;

    case 'wardrobe':
      return (
        <>
          <Line
            points={[width / 2, 2, width / 2, height - 2]}
            stroke={STROKE}
            strokeWidth={STROKE_WIDTH}
            listening={false}
          />
          <Circle x={width / 2 - 6} y={height / 2} radius={1.6} fill={STROKE} listening={false} />
          <Circle x={width / 2 + 6} y={height / 2} radius={1.6} fill={STROKE} listening={false} />
          {shelfLines(width, height * 0.4, attributes.shelves ?? 2)}
        </>
      );

    case 'drawer':
      return <>{drawerRows(width, height, attributes.drawers ?? 3)}</>;

    case 'table': {
      const legR = 3;
      const inset = 6;
      return (
        <>
          <Circle x={inset} y={inset} radius={legR} fill={STROKE} listening={false} />
          <Circle x={width - inset} y={inset} radius={legR} fill={STROKE} listening={false} />
          <Circle x={inset} y={height - inset} radius={legR} fill={STROKE} listening={false} />
          <Circle x={width - inset} y={height - inset} radius={legR} fill={STROKE} listening={false} />
          {(attributes.drawers ?? 0) > 0 && (
            <>
              <Line
                points={[width * 0.25, height / 2, width * 0.75, height / 2]}
                stroke={STROKE}
                strokeWidth={STROKE_WIDTH}
                listening={false}
              />
              <Rect
                x={width / 2 - 7}
                y={height / 2 - 1.5}
                width={14}
                height={3}
                cornerRadius={1.5}
                fill={STROKE}
                listening={false}
              />
            </>
          )}
        </>
      );
    }

    case 'bed':
      return (
        <>
          <Rect
            x={width * 0.08}
            y={height * 0.08}
            width={width * 0.84}
            height={height * 0.32}
            cornerRadius={3}
            stroke={STROKE}
            strokeWidth={STROKE_WIDTH}
            listening={false}
          />
        </>
      );

    case 'sofa':
      return (
        <>
          <Rect
            x={2}
            y={2}
            width={width - 4}
            height={height * 0.32}
            cornerRadius={3}
            fill={STROKE}
            opacity={0.25}
            listening={false}
          />
          <Rect
            x={2}
            y={2}
            width={width * 0.14}
            height={height - 4}
            cornerRadius={3}
            fill={STROKE}
            opacity={0.18}
            listening={false}
          />
          <Rect
            x={width - width * 0.14 - 2}
            y={2}
            width={width * 0.14}
            height={height - 4}
            cornerRadius={3}
            fill={STROKE}
            opacity={0.18}
            listening={false}
          />
        </>
      );

    case 'box':
    default:
      return null;
  }
}

export default FurnitureIcon;
