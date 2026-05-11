import { Routes, Route } from 'react-router-dom';

import HomePage from './pages/HomePage';
import RoomsPage from './pages/RoomsPage';

function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Smart Home Inventory</h1>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/homes/:homeId" element={<RoomsPage />} />
      </Routes>
    </div>
  );
}

export default App;