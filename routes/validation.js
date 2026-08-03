const SEX = ['male', 'female', 'other'];
const GOALS = ['lose_weight', 'gain_muscle', 'endurance', 'maintain'];

function isNumeric(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function validateRegister(body) {
  const errors = {};
  const { name, password, sex, height, weight, goal } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.name = 'El usuario es obligatorio';
  } else if (name.trim().length < 3) {
    errors.name = 'El usuario debe tener al menos 3 caracteres';
  } else if (name.trim().length > 60) {
    errors.name = 'El usuario no puede superar 60 caracteres';
  }

  if (!password || typeof password !== 'string') {
    errors.password = 'La contraseña es obligatoria';
  } else if (password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres';
  }

  if (!SEX.includes(sex)) errors.sex = 'Sexo inválido';
  if (!GOALS.includes(goal)) errors.goal = 'Objetivo inválido';

  if (!isNumeric(height) || height < 50 || height > 250) {
    errors.height = 'La altura debe estar entre 50 y 250 cm';
  }
  if (!isNumeric(weight) || weight < 20 || weight > 300) {
    errors.weight = 'El peso debe estar entre 20 y 300 kg';
  }

  return errors;
}

function validateProfileUpdate(body) {
  const errors = {};
  const { sex, height, weight, goal } = body;

  if (!SEX.includes(sex)) errors.sex = 'Sexo inválido';
  if (!GOALS.includes(goal)) errors.goal = 'Objetivo inválido';

  if (!isNumeric(height) || height < 50 || height > 250) {
    errors.height = 'La altura debe estar entre 50 y 250 cm';
  }
  if (!isNumeric(weight) || weight < 20 || weight > 300) {
    errors.weight = 'El peso debe estar entre 20 y 300 kg';
  }

  return errors;
}

module.exports = { validateRegister, validateProfileUpdate, SEX, GOALS };