import React from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import API from '../services/api';
import FurnitureIcon from './FurnitureIcon';

function isOverlapping(
  x: number,
  y: number,
  width: number,
  height: number,
  rooms: Room[],
  currentRoomId: number
) {
  return rooms.some(r => {
    if (r.id === currentRoomId) return false;

    return (
      x < r.pos_x + r.width / 2 &&
      x + width > r.pos_x &&
      y < r.pos_y + r.height / 2 &&
      y + height > r.pos_y
    );
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

interface Zone {
  id: number;
  name: string;
  type: string;
  width: number;
  height: number;
  pos_x: number;
  pos_y: number;
  attributes?: { shelves?: number; drawers?: number };
}

interface Room {
  id: number;
  name: string;
  width: number;
  height: number;
  pos_x: number;
  pos_y: number;
  zones: Zone[];
}

interface Props {
  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
  onEnterRoom: (roomId: number) => void;
}

const MIN_ROOM_SIZE = 80;
const HANDLE_SIZE = 14;
const CANVAS_PADDING = 60;

function roomMinPixelSize(room: Room) {
  const zoneBoundW = Math.max(
    MIN_ROOM_SIZE,
    ...room.zones.map(z => z.pos_x + z.width)
  );
  const zoneBoundH = Math.max(
    MIN_ROOM_SIZE,
    ...room.zones.map(z => z.pos_y + z.height)
  );
  return { minW: zoneBoundW, minH: zoneBoundH };
}

function HouseCanvas({ rooms, setRooms, onEnterRoom }: Props) {
  const stageWidth = Math.max(
    600,
    CANVAS_PADDING + Math.max(0, ...rooms.map(r => r.pos_x + r.width / 2)) + CANVAS_PADDING
  );

  const stageHeight = Math.max(
    400,
    CANVAS_PADDING + Math.max(0, ...rooms.map(r => r.pos_y + r.height / 2)) + CANVAS_PADDING
  );

  return (
    <Stage width={stageWidth} height={stageHeight}>
      <Layer>
        {rooms.map(room => {
          const pixelW = room.width / 2;
          const pixelH = room.height / 2;

          return (
            <Group
              key={room.id}
              x={room.pos_x}
              y={room.pos_y}
              draggable

              onDragStart={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'grabbing';
              }}

              onDragEnd={async (e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'pointer';

                let newX = e.target.x();
                let newY = e.target.y();

                newX = clamp(newX, 0, Math.max(0, stageWidth - pixelW));
                newY = clamp(newY, 0, Math.max(0, stageHeight - pixelH));

                e.target.position({ x: newX, y: newY });

                const overlap = isOverlapping(newX, newY, pixelW, pixelH, rooms, room.id);

                if (overlap) {
                  e.target.position({ x: room.pos_x, y: room.pos_y });
                  return;
                }

                setRooms(prev =>
                  prev.map(r => (r.id === room.id ? { ...r, pos_x: newX, pos_y: newY } : r))
                );

                try {
                  await API.put(`/rooms/${room.id}/position`, { pos_x: newX, pos_y: newY });
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              <Rect
                width={pixelW}
                height={pixelH}
                cornerRadius={6}
                stroke="#cbd5e1"
                strokeWidth={2}
                fill="#f8fafc"
                shadowColor="#0f172a"
                shadowOpacity={0.06}
                shadowBlur={8}
                shadowOffsetY={2}
                onClick={() => onEnterRoom(room.id)}
                onMouseEnter={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'pointer';
                }}
                onMouseLeave={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'default';
                }}
              />

              <Text
                x={8}
                y={-22}
                text={room.name}
                fontSize={15}
                fontStyle="600"
                fill="#334155"
                listening={false}
              />

              {/* ZONE PREVIEW (static, non-interactive) */}
              {room.zones.map(zone => (
                <Group key={zone.id} x={zone.pos_x} y={zone.pos_y} listening={false}>
                  <Rect
                    width={zone.width}
                    height={zone.height}
                    cornerRadius={4}
                    fill="#bfdbfe"
                    stroke="#60a5fa"
                    strokeWidth={1}
                    listening={false}
                  />
                  <FurnitureIcon
                    type={zone.type}
                    width={zone.width}
                    height={zone.height}
                    attributes={zone.attributes}
                  />
                  <Text
                    x={5}
                    y={5}
                    text={zone.name}
                    fontSize={10}
                    fill="#1e3a8a"
                    listening={false}
                  />
                </Group>
              ))}

              {/* RESIZE HANDLE */}
              <Rect
                x={pixelW - HANDLE_SIZE}
                y={pixelH - HANDLE_SIZE}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                cornerRadius={3}
                fill="#94a3b8"
                draggable

                onMouseEnter={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'nwse-resize';
                }}

                onMouseLeave={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'default';
                }}

                onDragStart={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'nwse-resize';
                }}

                onDragMove={(e) => {
                  const { minW, minH } = roomMinPixelSize(room);

                  let newPixelW = clamp(
                    e.target.x() + HANDLE_SIZE,
                    minW,
                    stageWidth - room.pos_x
                  );
                  let newPixelH = clamp(
                    e.target.y() + HANDLE_SIZE,
                    minH,
                    stageHeight - room.pos_y
                  );

                  if (isOverlapping(room.pos_x, room.pos_y, newPixelW, newPixelH, rooms, room.id)) {
                    newPixelW = pixelW;
                    newPixelH = pixelH;
                  }

                  e.target.position({
                    x: newPixelW - HANDLE_SIZE,
                    y: newPixelH - HANDLE_SIZE,
                  });

                  setRooms(prev =>
                    prev.map(r =>
                      r.id === room.id
                        ? { ...r, width: newPixelW * 2, height: newPixelH * 2 }
                        : r
                    )
                  );
                }}

                onDragEnd={async (e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'default';

                  const finalPixelW = e.target.x() + HANDLE_SIZE;
                  const finalPixelH = e.target.y() + HANDLE_SIZE;

                  try {
                    await API.put(`/rooms/${room.id}/size`, {
                      width: finalPixelW * 2,
                      height: finalPixelH * 2,
                    });
                  } catch (err) {
                    console.error(err);
                  }
                }}
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}

export default HouseCanvas;
