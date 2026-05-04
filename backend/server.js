const express = require('express');
const cors = require('cors');

require('./db/db');

const homesRoutes = require('./routes/homes');
const roomsRoutes = require('./routes/rooms');
const zonesRoutes = require('./routes/zones');
const itemsRoutes = require('./routes/items');
const searchRoutes = require('./routes/search');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/homes', homesRoutes);
app.use('/api/v1/rooms', roomsRoutes);
app.use('/api/v1/zones', zonesRoutes);
app.use('/api/v1/items', itemsRoutes);
app.use('/api/v1/search', searchRoutes);


app.get('/', (req, res) => {
  res.send('API is running');
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));