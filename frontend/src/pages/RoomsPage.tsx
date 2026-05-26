import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import API from '../services/api';
import RoomCanvas from '../components/RoomCanvas';

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

function RoomsPage() {

  const { homeId } = useParams();

  const [rooms, setRooms] = useState<Room[]>([]);

  const [newRoom, setNewRoom] = useState('');

  const [zoneInputs, setZoneInputs] = useState<{
    [roomId: number]: string;
  }>({});

  // FETCH ROOMS + ZONES
  const fetchRooms = async () => {

    try {

      const res = await API.get(
        `/rooms/layout/${homeId}`
      );

      const rows = res.data;

      const roomMap: any = {};

      rows.forEach((row: any) => {

        // create room once
        if (!roomMap[row.room_id]) {

          roomMap[row.room_id] = {
            id: row.room_id,
            name: row.room_name,
            width: row.room_width,
            height: row.room_height,
            zones: [],
          };
        }

        // push zone
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

  // CREATE ROOM
  const createRoom = async () => {

    if (!newRoom.trim()) return;

    try {

      await API.post(`/rooms/${homeId}`, {
        name: newRoom,
        width: 500,
        height: 400,
      });

      setNewRoom('');

      fetchRooms();

    } catch (err) {

      console.error(err);
    }
  };

  // CREATE ZONE
  const createZone = async (roomId: number) => {

    const zoneName = zoneInputs[roomId];

    if (!zoneName?.trim()) return;

    try {

      await API.post(`/zones/${roomId}`, {
        name: zoneName,
        type: 'storage',
        width: 120,
        height: 60,
        pos_x: 40,
        pos_y: 80,
      });

      // clear input
      setZoneInputs(prev => ({
        ...prev,
        [roomId]: '',
      }));

      fetchRooms();

    } catch (err) {

      console.error(err);
    }
  };

  return (

    <div style={{ padding: 20 }}>

      <h1>Rooms</h1>

      {/* CREATE ROOM */}

      <div style={{ marginBottom: 30 }}>

        <input
          type="text"
          placeholder="New room name"
          value={newRoom}
          onChange={(e) =>
            setNewRoom(e.target.value)
          }
        />

        <button
          onClick={createRoom}
          style={{ marginLeft: 10 }}
        >
          Add Room
        </button>

      </div>

      {/* ROOM CARDS */}

      {rooms.map(room => (

        <div
          key={room.id}
          style={{
            border: '1px solid gray',
            padding: 15,
            marginBottom: 15,
            borderRadius: 8,
          }}
        >

          <h2>{room.name}</h2>

          <p>
            Size: {room.width} × {room.height}
          </p>

          <p>
            Zones: {room.zones.length}
          </p>

          {/* CREATE ZONE */}

          <div style={{ marginTop: 10 }}>

            <input
              type="text"
              placeholder="New zone name"
              value={zoneInputs[room.id] || ''}

              onChange={(e) =>

                setZoneInputs(prev => ({
                  ...prev,
                  [room.id]: e.target.value,
                }))
              }
            />

            <button
              onClick={() =>
                createZone(room.id)
              }

              style={{ marginLeft: 10 }}
            >
              Add Zone
            </button>

          </div>

        </div>
      ))}

      <hr />

      <h2>Visual Layout</h2>

      <RoomCanvas
        rooms={rooms}
        setRooms={setRooms}
      />

    </div>
  );
}

export default RoomsPage;