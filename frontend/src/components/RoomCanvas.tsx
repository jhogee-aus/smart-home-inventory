import React from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import API from '../services/api';

function isOverlapping(
  x: number,
  y: number,
  width: number,
  height: number,
  zones: Zone[],
  currentZoneId: number
) {

  return zones.some(z => {

    if (z.id === currentZoneId) return false;

    return (
      x < z.pos_x + z.width &&
      x + width > z.pos_x &&
      y < z.pos_y + z.height &&
      y + height > z.pos_y
    );
  });
}

function clamp(
  value: number,
  min: number,
  max: number
) {
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
}

interface Room {
  id: number;
  name: string;
  width: number;
  height: number;
  zones: Zone[];
}

interface Props {
  rooms: Room[];
  setRooms: React.Dispatch<
    React.SetStateAction<Room[]>
  >;

  setSelectedZone: (zone: any) => void;

  highlightedZoneId: number | null;
}

const ROOM_GAP = 60;
const ROOM_X_START = 50;
const ROOM_Y = 60;

function RoomCanvas({ rooms, setRooms, setSelectedZone, highlightedZoneId }: Props) {

  const stageWidth = Math.max(
    600,
    ROOM_X_START + rooms.reduce((sum, r) => sum + r.width / 2 + ROOM_GAP, 0)
  );

  const stageHeight = Math.max(
    400,
    ROOM_Y + Math.max(0, ...rooms.map(r => r.height / 2)) + 60
  );

  return (
    <Stage width={stageWidth} height={stageHeight}>
      <Layer>

        {rooms.map((room, index) => {
          const roomX =
            ROOM_X_START +
            rooms
              .slice(0, index)
              .reduce((sum, r) => sum + r.width / 2 + ROOM_GAP, 0);
          const roomY = ROOM_Y;

          return (
            <React.Fragment key={room.id}>

              {/* ROOM */}
              <Rect
                x={roomX}
                y={roomY}
                width={room.width / 2}
                height={room.height / 2}
                cornerRadius={6}
                stroke="#cbd5e1"
                strokeWidth={2}
                fill="#f8fafc"
                shadowColor="#0f172a"
                shadowOpacity={0.06}
                shadowBlur={8}
                shadowOffsetY={2}
              />

              <Text
                x={roomX + 10}
                y={roomY - 24}
                text={room.name}
                fontSize={15}
                fontStyle="600"
                fill="#334155"
              />

              {/* ZONES */}
              {room.zones.map(zone => (
                <Group
                  key={zone.id}
                  x={roomX + zone.pos_x}
                  y={roomY + zone.pos_y}

                  draggable

                  onClick={() => {

                    setSelectedZone({
                      id: zone.id,
                      name: zone.name,
                      type: zone.type,
                      width: zone.width,
                      height: zone.height,
                      roomId: room.id,
                    });

                  }}

                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'pointer';
                  }}

                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                  }}

                  onDragStart={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'grabbing';
                  }}

                  onDragEnd={async (e) => {

                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'pointer';

                    let newX = e.target.x() - roomX;
                    let newY = e.target.y() - roomY;

                    // ROOM BOUNDARY LIMITS
                    const maxX =
                      room.width / 2 - zone.width;

                    const maxY =
                      room.height / 2 - zone.height;

                    // clamp inside room
                    newX = clamp(newX, 0, maxX);
                    newY = clamp(newY, 0, maxY);

                    // snap visually to clamped position
                    e.target.position({
                      x: roomX + newX,
                      y: roomY + newY,
                    });

                    // OVERLAP CHECK
                    const overlap = isOverlapping(
                      newX,
                      newY,
                      zone.width,
                      zone.height,
                      room.zones,
                      zone.id
                    );

                    // reject overlap
                    if (overlap) {

                      e.target.position({
                        x: roomX + zone.pos_x,
                        y: roomY + zone.pos_y,
                      });

                      return;
                    }

                    // LIVE STATE UPDATE
                    setRooms(prevRooms =>
                      prevRooms.map(r => {

                        if (r.id !== room.id) return r;

                        return {
                          ...r,

                          zones: r.zones.map(z => {

                            if (z.id !== zone.id) return z;

                            return {
                              ...z,
                              pos_x: newX,
                              pos_y: newY,
                            };
                          }),
                        };
                      })
                    );

                    // SAVE TO DATABASE
                    try {

                      await API.put(
                        `/zones/${zone.id}/position`,
                        {
                          pos_x: newX,
                          pos_y: newY,
                        }
                      );

                    } catch (err) {

                      console.error(err);
                    }
                  }}

                >
                  <Rect
                    width={zone.width}
                    height={zone.height}

                    cornerRadius={4}

                    //change fill color while searched
                    fill={
                      highlightedZoneId === zone.id
                        ? '#fde047'
                        : '#bfdbfe'
                    }
                    stroke={
                      highlightedZoneId === zone.id
                        ? '#eab308'
                        : '#60a5fa'
                    }
                    strokeWidth={highlightedZoneId === zone.id ? 2 : 1.5}
                  />

                  <Text
                    x={6}
                    y={6}
                    text={zone.name}
                    fontSize={12}
                    fill="#1e3a8a"
                    listening={false}
                  />
                </Group>
              ))}

            </React.Fragment>
          );
        })}

      </Layer>
    </Stage>
  );
}

export default RoomCanvas;
