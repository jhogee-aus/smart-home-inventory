import Konva from 'konva';
import { Line, Circle, Rect } from 'react-konva';
import { computeFurnitureShapes } from '../lib/furnitureShapes';

interface Props {
  type: string;
  width: number;
  height: number;
  attributes?: { shelves?: number; drawers?: number };
  /** Lets the parent reach in and update these shapes imperatively (e.g.
   *  during a live zone resize, with no React re-render per frame). */
  shapeRefs?: Map<string, Konva.Shape>;
}

const STROKE = '#3b5998';
const STROKE_WIDTH = 1;

function FurnitureIcon({ type, width, height, attributes = {}, shapeRefs }: Props) {
  const shapes = computeFurnitureShapes(type, width, height, attributes);

  return (
    <>
      {shapes.map(shape => {
        const setRef = (node: Konva.Shape | null) => {
          if (!shapeRefs) return;
          if (node) shapeRefs.set(shape.key, node);
          else shapeRefs.delete(shape.key);
        };

        switch (shape.kind) {
          case 'line':
            return (
              <Line
                key={shape.key}
                ref={setRef}
                points={shape.points}
                stroke={STROKE}
                strokeWidth={STROKE_WIDTH}
                listening={false}
              />
            );

          case 'circle':
            return (
              <Circle
                key={shape.key}
                ref={setRef}
                x={shape.x}
                y={shape.y}
                radius={shape.radius}
                fill={STROKE}
                listening={false}
              />
            );

          case 'rectFill':
            return (
              <Rect
                key={shape.key}
                ref={setRef}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                cornerRadius={shape.cornerRadius}
                fill={STROKE}
                opacity={shape.opacity}
                listening={false}
              />
            );

          case 'rectStroke':
            return (
              <Rect
                key={shape.key}
                ref={setRef}
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                cornerRadius={shape.cornerRadius}
                stroke={STROKE}
                strokeWidth={STROKE_WIDTH}
                listening={false}
              />
            );

          default:
            return null;
        }
      })}
    </>
  );
}

export default FurnitureIcon;
