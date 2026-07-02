const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const leaderboardRoutes = require('./routes/leaderboard');
const exerciseRoutes = require('./routes/exercises');
const workoutRoutes = require('./routes/workouts');
const achievementRoutes = require('./routes/achievements');

const app = express();
const PORT = process.env.PORT || 80;

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/achievements', achievementRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`GymBro server running on port ${PORT}`);
});
