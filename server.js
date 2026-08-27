const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const rutinaRoutes = require('./routes/rutina');
const alimentacionRoutes = require('./routes/alimentacion');
const trackingRoutes = require('./routes/tracking');

const app = express();
const PORT = process.env.PORT || 80;

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/rutina', rutinaRoutes);
app.use('/api/alimentacion', alimentacionRoutes);
app.use('/api/tracking', trackingRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GymBro v2 server running on port ${PORT}`);
  });
}

module.exports = app;
