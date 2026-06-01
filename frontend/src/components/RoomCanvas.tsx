import React from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
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
}

function RoomCanvas({ rooms, setRooms, setSelectedZone }: Props) {
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

                    draggable

                    onDragEnd={async (e) => {
                                        
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