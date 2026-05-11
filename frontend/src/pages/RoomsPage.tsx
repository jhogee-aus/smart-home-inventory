import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import API from '../services/api';
import RoomCanvas from '../components/RoomCanvas';
import { Stage, Layer, Rect, Text } from 'react-konva';
import React from 'react';


interface Room {
  id: number;
  name: string;
  width: number;
  height: number;
}

function RoomsPage() {
  const { homeId } = useParams();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoom, setNewRoom] = useState('');

  // fetch rooms
  const fetchRooms = async () => {
  try {
    const res = await API.get(`/rooms/layout/${homeId}`);

    const rows = res.data;

    const roomMap: any = {};

    rows.forEach((row: any) => {

      if (!roomMap[row.room_id]) {
        roomMap[row.room_id] = {
          id: row.room_id,
          name: row.room_name,
          width: row.room_width,
          height: row.room_height,
          zones: [],
        };
      }

      if (row.zone_id) {
        roomMap[row.room_id].zones.push({
          id: row.zone_id,
          name: row.zone_name,
          type: row.zone_type,
          width: row.zone_width,
          height: row.zone_height,
          pos_x: row.pos_x,
          pos_y: row.pos_y,
        });
      }
    });

    setRooms(Object.values(roomMap));

  } catch (err) {
    console.error(err);
  }
};

  useEffect(() => {
    fetchRooms();
  }, []);

  // create room
  const createRoom = async () => {
    if (!newRoom.trim()) return;

    try {
      await API.post(`/rooms/${homeId}`, {
        name: newRoom,
        width: 500,
        height: 400,
        pos_x: 0,
        pos_y: 0,
      });

      setNewRoom('');
      fetchRooms();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Rooms</h2>

      {/* create room */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="New room name"
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value)}
        />

        <button onClick={createRoom}>
          Add Room
        </button>
      </div>

      {rooms.map((room, index) => (
        <React.Fragment key={room.id}>

        <Rect
          x={50 + index * 250}
          y={80}
          width={room.width / 2}
          height={room.height / 2}
          stroke="black"
          strokeWidth={2}
          fill="#f3f4f6"
        />

        <Text
          x={60 + index * 250}
          y={90}
          text={room.name}
          fontSize={20}
        />

        </React.Fragment>
        ))}

      {/* visual list konva */}
        <hr />

        <h2>Visual Layout</h2>

        <RoomCanvas rooms={rooms} />
    </div>
    
    
  );
  
  
}


export default RoomsPage;