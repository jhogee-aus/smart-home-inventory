import React from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';

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
}

function RoomCanvas({ rooms }: Props) {
  return (
    <Stage width={1200} height={700}>
      <Layer>

        {rooms.map((room, index) => {
          const roomX = 50 + index * 350;
          const roomY = 80;

          return (
            <React.Fragment key={room.id}>

              {/* ROOM */}
              <Rect
                x={roomX}
                y={roomY}
                width={room.width / 2}
                height={room.height / 2}
                stroke="black"
                strokeWidth={3}
                fill="#f3f4f6"
              />

              <Text
                x={roomX + 10}
                y={roomY + 10}
                text={room.name}
                fontSize={20}
              />

              {/* ZONES */}
              {room.zones.map(zone => (
                <React.Fragment key={zone.id}>

                  <Rect
                    x={roomX + zone.pos_x}
                    y={roomY + zone.pos_y}
                    width={zone.width}
                    height={zone.height}
                    fill="#93c5fd"
                    stroke="black"
                  />

                  <Text
                    x={roomX + zone.pos_x + 5}
                    y={roomY + zone.pos_y + 5}
                    text={zone.name}
                    fontSize={14}
                  />

                </React.Fragment>
              ))}

            </React.Fragment>
          );
        })}

      </Layer>
    </Stage>
  );
}

export default RoomCanvas;