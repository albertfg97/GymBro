const { Router } = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gymbro-dev-secret';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function checkAchievements(userId) {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM workout_sessions WHERE user_id = ?) AS total_sessions,
      (SELECT COALESCE(SUM(points), 0) FROM workout_sessions WHERE user_id = ?) AS total_points
  `).get(userId, userId);

  const catCounts = db.prepare(`
    SELECT e.category, COUNT(*) AS n
    FROM workout_sessions s
    JOIN exercises e ON e.id = s.exercise_id
    WHERE s.user_id = ?
    GROUP BY e.category
  `).all(userId);

  const catMap = {};
  for (const r of catCounts) catMap[r.category] = r.n;

  const user = db.prepare('SELECT current_streak FROM users WHERE id = ?').get(userId);
  const currentStreak = user ? user.current_streak : 0;

  const all = db.prepare('SELECT * FROM achievements').all();
  const earned = db.prepare('SELECT achievement_id FROM user_achievements WHERE user_id = ?').all(userId);
  const earnedSet = new Set(earned.map(e => e.achievement_id));

  const newAwards = [];

  for (const ach of all) {
    if (earnedSet.has(ach.id)) continue;
    let met = false;
    switch (ach.criteria_type) {
      case 'total_sessions':
        met = stats.total_sessions >= ach.criteria_value;
        break;
      case 'total_points':
        met = stats.total_points >= ach.criteria_value;
        break;
      case 'streak_days':
        met = currentStreak >= ach.criteria_value;
        break;
      case 'category_count':
        met = Object.values(catMap).some(v => v >= ach.criteria_value);
        break;
    }
    if (met) {
      db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)').run(userId, ach.id);
      newAwards.push(ach);
    }
  }

  return newAwards;
}

router.post('/complete', auth, (req, res) => {
  const { exerciseId, duration } = req.body;
  if (!exerciseId || !duration) {
    return res.status(400).json({ error: 'exerciseId y duration requeridos' });
  }

  const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(exerciseId);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });

  const points = exercise.points;

  db.prepare('INSERT INTO workout_sessions (user_id, exercise_id, points, duration) VALUES (?, ?, ?, ?)')
    .run(req.user.id, exerciseId, points, duration);

  const today = new Date().toISOString().slice(0, 10);
  const user = db.prepare('SELECT last_workout_date, current_streak, max_streak, points, level, name, sex, height, weight, goal, created_at FROM users WHERE id = ?').get(req.user.id);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let newStreak = user.current_streak;
  if (user.last_workout_date === today) {
  } else if (user.last_workout_date === yesterday) {
    newStreak += 1;
  } else {
    newStreak = 1;
  }
  const maxStreak = Math.max(user.max_streak, newStreak);

  const newPoints = user.points + points;
  const newLevel = Math.floor(newPoints / 1000) + 1;

  db.prepare(`
    UPDATE users SET points = ?, level = ?, current_streak = ?, max_streak = ?, last_workout_date = ?
    WHERE id = ?
  `).run(newPoints, newLevel, newStreak, maxStreak, today, req.user.id);

  const newAchievements = checkAchievements(req.user.id);

  res.json({
    points,
    totalPoints: newPoints,
    level: newLevel,
    currentStreak: newStreak,
    maxStreak,
    newAchievements,
  });
});

module.exports = router;
