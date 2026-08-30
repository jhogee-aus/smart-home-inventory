import { useEffect, useState } from 'react';
import API from '../services/api';

interface Home {
  id: number;
  name: string;
}

interface ZoneOption {
  id: number;
  name: string;
}

interface RoomOption {
  id: number;
  name: string;
  zones: ZoneOption[];
}

interface Props {
  onSelect: (zoneId: number | null) => void;
}

const selectClass =
  'min-h-9 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400';

function ZonePicker({ onSelect }: Props) {
  const [homes, setHomes] = useState<Home[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);

  const [homeId, setHomeId] = useState<number | ''>('');
  const [roomId, setRoomId] = useState<number | ''>('');
  const [zoneId, setZoneId] = useState<number | ''>('');

  useEffect(() => {
    API.get('/homes')
      .then((res) => setHomes(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!homeId) {
      setRooms([]);
      return;
    }

    API.get(`/rooms/layout/${homeId}`)
      .then((res) => {
        const roomMap: Record<number, RoomOption> = {};

        res.data.forEach((row: any) => {
          if (!roomMap[row.room_id]) {
            roomMap[row.room_id] = { id: row.room_id, name: row.room_name, zones: [] };
          }
          if (row.zone_id) {
            roomMap[row.room_id].zones.push({ id: row.zone_id, name: row.zone_name });
          }
        });

        setRooms(Object.values(roomMap));
      })
      .catch((err) => console.error(err));
  }, [homeId]);

  useEffect(() => {
    onSelect(zoneId === '' ? null : Number(zoneId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId]);

  const selectedRoom = rooms.find((r) => r.id === Number(roomId));

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={homeId}
        onChange={(e) => {
          setHomeId(e.target.value ? Number(e.target.value) : '');
          setRoomId('');
          setZoneId('');
        }}
        className={selectClass}
      >
        <option value="">Home…</option>
        {homes.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>

      <select
        value={roomId}
        onChange={(e) => {
          setRoomId(e.target.value ? Number(e.target.value) : '');
          setZoneId('');
        }}
        disabled={!homeId}
        className={selectClass}
      >
        <option value="">Room…</option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      <select
        value={zoneId}
        onChange={(e) => setZoneId(e.target.value ? Number(e.target.value) : '')}
        disabled={!roomId}
        className={selectClass}
      >
        <option value="">Zone…</option>
        {(selectedRoom?.zones || []).map((z) => (
          <option key={z.id} value={z.id}>
            {z.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ZonePicker;
