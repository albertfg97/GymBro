# GymBro v2 — Documentación del Proyecto

**Entrenador personal en casa** para TV y móvil. App en vanilla JS/HTML/CSS con backend Node.js + Express + SQLite (better-sqlite3). Permite a **cada perfil** (login por usuario) importar su propio plan de **rutina** (guiada en TV) y de **alimentación** (consultable en el móvil), desde un único archivo JSON.

## Cómo se usa

1. **Crear cuenta / entrar** (login por usuario con contraseña).
2. La app **pregunta en cada login** dónde la vas a usar: **📺 TV** (rutina guiada) o **📱 Móvil** (alimentación / perfil).
3. En **Perfil (móvil)** se **sube un archivo .json** con el plan (formato canónico, ver `plan-ejemplo.json`). Se normaliza al cargar y se enlaza cada ejercicio al catálogo de guías por nombre.
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

Un único archivo por usuario. **Formato canónico** (el que se recomienda usar y el que viene en `plan-ejemplo.json`), con la rutina bajo `entrenamiento.semanas.<semana_N>.dias` y la dieta en `dieta_7_dias.dias`:

```json
{
  "objetivo": { "principal": "...", "estrategia": "...", "duracion_inicial": "4 semanas" },
  "perfil": { "edad": 29, "peso_kg": 74, "altura_cm": 179, "entrenamientos_por_semana": 3, "equipamiento": {...} },
  "nutricion": {
    "calorias_objetivo_diarias_kcal": 2200,
    "proteina_objetivo_diaria_g": "135-150",
    "deficit_estimado_kcal": "200-300",
    "ritmo_objetivo_perdida_peso_kg_semana": "0.2-0.4",
    "principios": [ ... ]
  },
  "entrenamiento": {
    "frecuencia": "3 días por semana",
    "distribucion": "Lunes, miércoles y viernes",   // se mapea por orden a los bloques de la semana_1
    "duracion_aproximada_minutos": "45-60",
    "intensidad": "Normalmente 1-3 RIR",
    "calentamiento": "...",
    "progresion": { ... },
    "semanas": {
      "semana_1": {
        "objetivo": "...", "intensidad": "...",
        "dias": {
          "dia_1_A": [ { "ejercicio": "Sentadilla búlgara", "series": 3, "repeticiones": "8-12 por pierna", "descanso_segundos": 120 }, ... ],
          "dia_2_B": [ ... ],
          "dia_3": "A"          // día de referencia a un bloque (o un array)
        }
      },
      "semana_2": { ... }
    }
  },
  "actividad_diaria": { ... },
  "dieta_7_dias": {
    "objetivo_diario": { ... },
    "nota_pesos": "...",
    "dias": {
      "dia_1": { "desayuno": "...", "comida": "...", "snack": "...", "cena": "...", "calorias_aprox": 2200, "proteina_aprox_g": 145 },
      ... "dia_7"
    }
  },
  "lista_compra_semanal": { "proteinas": [...], "carbohidratos": [...], "verduras": [...], "grasas": [...] },
  "preparacion_comidas": { ... },
  "seguimiento": { ... },
  "suplementos": { ... }
}
```

El normalizador (`normalize.js`) crea los bloques A/B a partir de la **primera semana** (`semana_1.dias`), detecta la letra de bloque desde la clave del día (`dia_1_A` → A, `dia_2_B` → B) o por orden (1º=A, 2º=B, 3º=A...), y monta `dias_semana` mapeando la semana base a los días reales de `distribucion` (por orden). Si hoy no cae en `dias_semana`, el modo TV muestra descanso. El orden de `dias_semana` usa `Date.getDay()` (0 = Domingo).

Los ejercicios se resuelven contra el catálogo **por nombre** para enlazar la guía (voz + GIF). Si un nombre no está en el catálogo, el ejercicio igual se muestra (sin guía detallada).

`normalize.js` acepta además el **formato anterior** (`{ rutina, alimentacion }` con `dias_semana`/`bloques`/`dieta_7_dias` como array y `semanas` array) como retrocompatibilidad y lo convierte al mismo modelo.

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
