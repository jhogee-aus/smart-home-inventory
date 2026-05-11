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
  const fetchRooms = () => {
    API.get(`/rooms/home/${homeId}`)
      .then(res => setRooms(res.data))
      .catch(err => console.error(err));
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