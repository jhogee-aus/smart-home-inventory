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

  const [items, setItems] = useState<any[]>([]);

  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  const [editItemName, setEditItemName] = useState('');

  const [newItem, setNewItem] = useState('');

  const [selectedZone, setSelectedZone] =
  useState<any>(null);

  const [zoneInputs, setZoneInputs] = useState<{
    [roomId: number]: string;
  }>({});

  const [searchTerm, setSearchTerm] = useState('');

  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [highlightedZoneId, setHighlightedZoneId] = useState<number | null>(null);

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

  const fetchItems = async () => {

    if (!selectedZone) return;

    try {

      const res = await API.get(
        `/items/${selectedZone.id}`
      );

      setItems(res.data);

    } catch (err) {

      console.error(err);
    }
  };

  useEffect(() => {

    fetchRooms();

  }, []);

  useEffect(() => {

    if (!selectedZone) return;

    fetchItems();

  }, [selectedZone]);

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

  const searchItems = async () => {

    if (!searchTerm.trim()) return;

    try {

      const res = await API.get(
        `/search?q=${searchTerm}`
      );

      setSearchResults(res.data.results);

    } catch (err) {

      console.error(err);
    }
  };

  const createItem = async () => {
    
    if (!selectedZone) return;
    
    if (!newItem.trim()) return;
    
    try {
    
      await API.post(
        `/items/${selectedZone.id}`,
        {
          name: newItem,
          description: '',
          quantity: 1,
        }
      );
    
      setNewItem('');
    
      fetchItems();
    
    } catch (err) {
    
      console.error(err);
    }
  };

  const updateItem = async (
    itemId: number
  ) => {

    try {

      await API.put(
        `/items/${itemId}`,
        {
          name: editItemName,
          quantity: 1,
        }
      );

      setEditingItemId(null);

      fetchItems();

    } catch (err) {

      console.error(err);
    }
  };

  const deleteItem = async (
    itemId: number
  ) => {

    try {

      await API.delete(
        `/items/${itemId}`
      );

      fetchItems();

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

      <h2>Search</h2>

      <input
        type="text"
        placeholder="Find item..."
        value={searchTerm}
        onChange={(e) =>
          setSearchTerm(e.target.value)
        }
      />

      <button
        onClick={searchItems}
      >
        Search
      </button>

      <ul>
          
        {searchResults.map(result => (
        
          <li
              key={result.item_id}
              style={{
                cursor: 'pointer',
                marginBottom: 10,
              }}
              onClick={() => {
              
                setHighlightedZoneId(
                  result.zone_id
                );
              
                const room = rooms.find(
                  r => r.id === result.room_id
                );
              
                const zone = room?.zones.find(
                  z => z.id === result.zone_id
                );
              
                if (zone) {
                
                  setSelectedZone({
                    id: zone.id,
                    name: zone.name,
                    type: zone.type,
                    width: zone.width,
                    height: zone.height,
                    roomId: room?.id,
                  });
                }
              
                // Remove highlight after 3 sec
                setTimeout(() => {
                
                  setHighlightedZoneId(null);
                
                }, 3000);
              
              }}
            >
          
            {result.item_name}
        
            {' → '}
        
            {result.room_name}
        
            {' / '}
        
            {result.zone_name}
        
          </li>
      
        ))}
      
      </ul>

      <h2>Visual Layout</h2>

      <RoomCanvas
        rooms={rooms}
        setRooms={setRooms}
        setSelectedZone={setSelectedZone}
        highlightedZoneId={highlightedZoneId}
      />

      <hr />

      <h2>Selected Zone</h2>
          
      {selectedZone ? (
      
        <div
          style={{
            border: '1px solid gray',
            padding: 15,
            borderRadius: 8,
            maxWidth: 500,
          }}
        >
      
          <h3>{selectedZone.name}</h3>
        
          <p>
            Type: {selectedZone.type}
          </p>
        
          <p>
            Width: {selectedZone.width}
          </p>
        
          <p>
            Height: {selectedZone.height}
          </p>
        
          <p>
            Zone ID: {selectedZone.id}
          </p>
        
          <hr />
        
          <h3>Items</h3>
        
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 10,
            }}
          >
      
            <input
              type="text"
              placeholder="Item name"
              value={newItem}
              onChange={(e) =>
                setNewItem(e.target.value)
              }
            />
      
            <button
              onClick={createItem}
            >
              Add Item
            </button>
            
          </div>
            
          {items.length === 0 ? (
          
            <p>No items yet</p>
          
          ) : (
          
            <ul>
      
              {items.map(item => (
              
                <li
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginBottom: 5,
                  }}
                >
                
                  {editingItemId === item.id ? (
                                    
                    <>
                  
                      <input
                        value={editItemName}
                        onChange={(e) =>
                          setEditItemName(
                            e.target.value
                          )
                        }
                      />
                  
                      <button
                        onClick={() =>
                          updateItem(item.id)
                        }
                      >
                        Save
                      </button>
                      
                    </>
                  
                  ) : (
                  
                    <>
                  
                      <span>
                        {item.name}
                      </span>
                  
                      <button
                        onClick={() => {
                        
                          setEditingItemId(
                            item.id
                          );
                        
                          setEditItemName(
                            item.name
                          );
                        
                        }}
                      >
                        Edit
                      </button>
                      
                    </>
                  
                  )}
                
                  <button
                    onClick={() =>
                      deleteItem(item.id)
                    }
                  >
                    Delete
                  </button>
                  
                </li>
      
              ))}
      
            </ul>
      
          )}
      
        </div>
      
      ) : (
      
        <p>
          Click a zone to view details
        </p>
      
      )}
    </div>
    
  );
}



export default RoomsPage;