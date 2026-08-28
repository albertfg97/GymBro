const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const tmp = path.join(os.tmpdir(), `gymbro-test-${Date.now()}.db`);
process.env.GYMBRO_DB_PATH = tmp;

const app = require('../server');

function clean() {
  try { fs.unlinkSync(tmp); } catch {}
  try { fs.unlinkSync(tmp + '-wal'); } catch {}
  try { fs.unlinkSync(tmp + '-shm'); } catch {}
}

const examplePlan = {
  rutina: {
    dias_semana: [{ dia: 'Lunes', bloque: 'A' }],
    bloques: {
      A: [{ ejercicio: 'Sentadilla búlgara', sets: 3, reps: '8-12', descanso_s: 120 }],
    },
  },
  alimentacion: {
    calorias_objetivo_diarias_kcal: 2200,
    proteina_objetivo_diaria_g: '135-150',
    dieta_7_dias: [{
      dia: 1, etiqueta: 'Lunes',
      desayuno: 'Avena', comida: 'Pollo', snack: 'Yogur', cena: 'Merluza',
    }],
    lista_compra_semanal: { proteinas: ['Pollo'], carbohidratos: ['Avena'] },
  },
};

test('flujo: registro, importar plan, consultar rutina y alimentación', async () => {
  try {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'tester', password: '1234', sex: 'male', goal: 'lose' });
    assert.strictEqual(reg.status, 201);
    assert.ok(reg.body.token);
    const token = reg.body.token;

    const me = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(me.status, 200);
    assert.strictEqual(me.body.has_plan, false);

    const imp = await request(app)
      .put('/api/profile/plan')
      .set('Authorization', `Bearer ${token}`)
      .send(examplePlan);
    assert.strictEqual(imp.status, 200);
    assert.ok(imp.body.plan.rutina.bloques.A);
    assert.strictEqual(imp.body.plan.rutina.bloques.A[0].ejercicio, 'Sentadilla búlgara');
    assert.ok(imp.body.plan.rutina.bloques.A[0].guide);
    assert.strictEqual(imp.body.plan.alimentacion.objetivos.kcal_dia, 2200);

    const rutina = await request(app)
      .get('/api/rutina')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(rutina.status, 200);
    assert.ok(rutina.body.rutina.bloques.B === undefined || rutina.body.rutina.bloques.A);

    const alim = await request(app)
      .get('/api/alimentacion')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(alim.status, 200);
    assert.strictEqual(alim.body.alimentacion.dieta_7_dias.length, 1);

    const tracking = await request(app)
      .post('/api/tracking/workout')
      .set('Authorization', `Bearer ${token}`)
      .send({ ejercicio: 'Sentadilla búlgara', sets: 3, reps: '8-12' });
    assert.strictEqual(tracking.status, 201);

    const summary = await request(app)
      .get('/api/tracking/summary')
      .set('Authorization', `Bearer ${token}`);
    assert.strictEqual(summary.status, 200);
    assert.strictEqual(summary.body.today_workouts, 1);
  } finally {
    clean();
  }
});

test('login con credenciales correctas', async () => {
  try {
    await request(app).post('/api/auth/register')
      .send({ name: 'loginuser', password: '1234' });
    const res = await request(app).post('/api/auth/login')
      .send({ name: 'loginuser', password: '1234' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token);
  } finally {
    clean();
  }
});

test('formato canónico: importar rutina desde entrenamiento.semanas', async () => {
  try {
    const canonical = {
      entrenamiento: {
        distribucion: 'Lunes, miércoles y viernes',
        semanas: {
          semana_1: {
            dias: {
              dia_1_A: [{ ejercicio: 'Sentadilla búlgara', series: 3, repeticiones: '8-12', peso_kg_por_mancuerna: 8, descanso_segundos: 120 }],
              dia_2_B: [{ ejercicio: 'Press militar', series: 3, repeticiones: '8-15', peso_kg_total: 20, descanso_segundos: 120 }],
              dia_3: [{ ejercicio: 'Sentadilla búlgara', series: 3, repeticiones: '8-12', peso_kg_por_mancuerna: 8, descanso_segundos: 120 }],
            },
          },
        },
      },
      nutricion: { calorias_objetivo_diarias_kcal: 2200, proteina_objetivo_diaria_g: '135-150' },
      dieta_7_dias: {
        dias: {
          dia_1: { desayuno: 'Avena', comida: 'Pollo', snack: 'Yogur', cena: 'Merluza' },
        },
      },
      lista_compra_semanal: { proteinas: ['Pollo'], carbohidratos: ['Avena'] },
    };

    const reg = await request(app).post('/api/auth/register').send({ name: 'canon', password: '1234' });
    assert.strictEqual(reg.status, 201);
    const token = reg.body.token;

    const imp = await request(app)
      .put('/api/profile/plan')
      .set('Authorization', `Bearer ${token}`)
      .send(canonical);
    assert.strictEqual(imp.status, 200);
    const p = imp.body.plan;
    assert.ok(p.rutina.bloques.A);
    assert.ok(p.rutina.bloques.B);
    assert.strictEqual(p.rutina.bloques.A[0].ejercicio, 'Sentadilla búlgara');
    assert.strictEqual(p.rutina.bloques.A[0].peso_kg_por_mancuerna, 8);
    assert.strictEqual(p.rutina.bloques.B[0].peso_kg_total, 20);
    assert.strictEqual(p.rutina.dias_semana.length, 3);
    assert.strictEqual(p.rutina.dias_semana[0].dia, 'Lunes');
    assert.strictEqual(p.rutina.dias_semana[0].bloque, 'A');
    assert.strictEqual(p.rutina.dias_semana[1].bloque, 'B');
    assert.strictEqual(p.rutina.dias_semana[2].bloque, 'A');
    assert.strictEqual(p.alimentacion.objetivos.kcal_dia, 2200);
    assert.strictEqual(p.alimentacion.dieta_7_dias.length, 1);
    assert.strictEqual(p.alimentacion.dieta_7_dias[0].desayuno, 'Avena');
    assert.ok(p.alimentacion.lista_compra.proteinas);
  } finally {
    clean();
  }
});
