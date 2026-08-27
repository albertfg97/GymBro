# GymBro v2 — Documentación del Proyecto

**Entrenador personal en casa** para TV y móvil. App en vanilla JS/HTML/CSS con backend Node.js + Express + SQLite (better-sqlite3). Permite a **cada perfil** (login por usuario) importar su propio plan de **rutina** (guiada en TV) y de **alimentación** (consultable en el móvil), desde un único archivo JSON.

## Cómo se usa

1. **Crear cuenta / entrar** (login por usuario con contraseña).
2. La app **pregunta en cada login** dónde la vas a usar: **📺 TV** (rutina guiada) o **📱 Móvil** (alimentación / perfil).
3. En **Perfil (móvil)** se **sube un archivo .json** con el plan `{ rutina, alimentacion }` (ver `plan-ejemplo.json`). Se normaliza al cargar y se enlaza cada ejercicio al catálogo de guías por nombre.
4. **Modo TV**: muestra automáticamente lo que toca ese día (según `dias_semana` del plan), se puede elegir otro bloque, y cada ejercicio se guía paso a paso (voz + GIF) con temporizador e indicaciones de series/reps/descanso.
5. **Modo Móvil**: pestañas Alimentación (objetivos, menú semanal, lista de compra), Rutina (bloques), Seguimiento (entrenos, peso, racha) y Perfil (importar plan, editar datos, cambiar modo).

## Stack

- **Backend**: Node.js + Express + better-sqlite3 (SQLite), JWT para autenticación, bcryptjs para contraseñas.
- **Frontend**: Vanilla JS/HTML/CSS (sin frameworks ni build). Dos modos de interfaz en `public/`.
- **Infra**: Docker (Node 20 alpine), docker-compose (volumen persistente `data/`), CI/CD con GitHub Actions → Docker Hub (tags `latest` + SHA).

## Estructura

```
server.js            Express: estáticos + monta /api/*. Exporta app (testable). Puerto 80/process.env.PORT.
db.js                Conexión SQLite y esquema v2. Ruta redefinible con GYMBRO_DB_PATH (tests).
catalog.js           Catálogo de 42 ejercicios (id, nombre, icono, músculo, equipamiento) + guía desde guides.js.
guides.js            Guías pedagógicas por ejercicio (steps, watch, coach, gifUrl). Fuente de la verdad del modo guiado.
normalize.js         Normaliza el plan JSON del usuario a un modelo interno único (formato "semanas A/B" o "bloques/días").
plan-ejemplo.json    Plantilla de plan importable (rutina + alimentación).
routes/
  middleware.js      auth (JWT) + sign.
  auth.js            login / register con datos de perfil (sexo, año nacimiento, altura, peso, objetivo, actividad).
  profile.js         leer/editar perfil, GET/PUT plan (importar JSON, normaliza).
  rutina.js          /api/rutina: qué toca hoy, bloques, catálogo de ejercicios con guías.
  alimentacion.js    /api/alimentacion: plan alimentación normalizado.
  tracking.js        /api/tracking: registrar entrenos, peso, comidas; resumen + racha.
public/
  index.html         Pantallas: login, registro, selector de modo, home (TV/móvil), workout guiado, modales.
  app.js             SPA: auth, selector de modo en cada login, rutina guiada (voz+temporizador), pestañas móvil, importar plan.
  style.css          Tema oscuro. Estilos TV (grande, foco) y móvil (táctil, responsive).
test/app.test.js     Smoke test (node --test + supertest) sobre DB temporal: auth, importar plan, rutina y alimentación.
data/gymbro.db       SQLite (persistida vía volumen Docker; ignorada por git).
```

## Modelo de datos (v2)

- **users**: id, name (único), password (hash), role, sex, birth_year, height_cm, weight_kg, goal (lose/maintain/gain), activity_level (sedentary/light/active/very_active), `equipment` (JSON), `allergies` (JSON), `plan` (JSON normalizado `{ rutina, alimentacion }`), created_at.
- **weight_log**: peso por fecha (único por usuario+fecha).
- **workout_log**: sesiones registradas (ejercicio, sets, reps, peso, fecha).
- **nutrition_log**: comidas marcadas (desayuno/comida/snack/cena) por fecha.

> El **catálogo de ejercicios** y las **guías** no se guardan en BD: viven en `catalog.js` / `guides.js`. El plan del usuario referencia ejercicios por nombre, que se resuelven contra el catálogo al normalizar.

## Plan JSON importable

Un único archivo por usuario con la forma:

```json
{
  "rutina": {
    "dias_semana": [ { "dia": "Lunes", "bloque": "A" }, ... ],
    "bloques": { "A": [ { "ejercicio": "Sentadilla búlgara", "sets": 3, "reps": "8-12", "descanso_s": 120 } ], ... }
  },
  "alimentacion": {
    "calorias_objetivo_diarias_kcal": 2200,
    "proteina_objetivo_diaria_g": "135-150",
    "principios": [ ... ],
    "dieta_7_dias": [ { "dia": 1, "etiqueta": "Lunes", "desayuno": "...", "comida": "...", "snack": "...", "cena": "...", "kcal": 2200, "proteina": 145 } ],
    "lista_compra_semanal": { "proteinas": [...], "carbohidratos": [...], ... }
  }
}
```

`normalize.js` acepta además el **antiguo formato "semanas 1-4 con A/B"** (ejercicios por `id`, campos `series`/`repeticiones`/`descanso_segundos`, alimentación bajo `nutricion`) y lo convierte al mismo modelo. El orden de `dias_semana` usa `Date.getDay()` (0 = Domingo). Si hoy no cae en `dias_semana`, el modo TV muestra descanso.

## Modo entrenador guiado (TV)

- `/api/rutina/hoy` resuelve el bloque de hoy y devuelve sus ejercicios con `guide` (steps + coach + gifUrl) si el nombre coincide con el catálogo.
- El workout guiado muestra: pasos en voz + texto, puntos de progreso (◀ > 🔊 > ▶), GIF de referencia, cronómetro y campos opcionales de series/reps/peso.
- Al completar se registra la sesión en `workout_log`.
- Instrucciones/GIF: texto MIT (exercises-dataset/ExerciseDB); GIF © Gym visual referenciado por URL upstream (no redistribuido en el repo).

## Estado (implementado v2)

- Perfiles con login (JWT) y registro con datos de nutrición/rutina.
- Importación de plan JSON por usuario (subir archivo desde el perfil), con normalización de ambos formatos.
- Rutina guiada en TV: qué toca hoy + elegir bloque + workout con voz, GIF, temporizador y registro.
- Móvil: alimentación (menú semanal + lista de compra), rutina, seguimiento (entrenos/peso/racha) y perfil.
- Selector de modo TV/Móvil preguntado en cada login.

## Pendientes / mejoras posibles

- **Verificación de runtime en local**: Node.js no está instalado en este equipo, por lo que `npm install`, `npm test` y `npm run lint` aún no se han ejecutado. Validar al instalar Node.
- Edición de bloques de rutina desde la UI (hoy el plan se importa por JSON).
- Cálculo automático de kcal/proteína a partir de perfil (hoy vienen del JSON).
- Filtrado del menú por alergias declaradas en el perfil.
- Soporte para subir el plan también por pegado de texto (además de archivo).

## Convenciones

- Los mensajes de commit deben comenzar con `AI - ` (ver AGENTS.md).
- Los commits pueden hacerse libremente, pero el **push** requiere orden explícita del usuario (`push`).
- El CI de GitHub Actions publica a Docker Hub al hacer push a `main` (no ejecuta tests).
