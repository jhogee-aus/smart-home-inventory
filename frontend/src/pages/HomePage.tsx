import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

interface Home {
  id: number;
  name: string;
}

function HomePage() {
  const [homes, setHomes] = useState<Home[]>([]);
  const [newHome, setNewHome] = useState('');

  const navigate = useNavigate();

  // fetch homes
  const fetchHomes = () => {
    API.get('/homes')
      .then(res => setHomes(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchHomes();
  }, []);

  // create home
  const createHome = async () => {
    if (!newHome.trim()) return;

    try {
      await API.post('/homes', {
        name: newHome,
      });

      setNewHome('');
      fetchHomes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Homes</h2>

      {/* create form */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="New home name"
          value={newHome}
          onChange={(e) => setNewHome(e.target.value)}
        />

        <button onClick={createHome}>
          Add Home
        </button>
      </div>

      {/* homes list */}
      {homes.map(home => (
        <div
          key={home.id}
          onClick={() => navigate(`/homes/${home.id}`)}
          style={{
            padding: 10,
            border: '1px solid gray',
            marginBottom: 10,
            cursor: 'pointer',
          }}
        >
          {home.name}
        </div>
      ))}
    </div>
  );
}

export default HomePage;