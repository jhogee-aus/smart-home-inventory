import { useEffect, useState } from 'react';
import API from '../services/api';

interface Home {
  id: number;
  name: string;
}

function HomePage() {
  const [homes, setHomes] = useState<Home[]>([]);

  useEffect(() => {
    API.get('/homes')
      .then(res => setHomes(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>Homes</h2>

      {homes.map(home => (
        <div key={home.id}>
          {home.name}
        </div>
      ))}
    </div>
  );
}

export default HomePage;