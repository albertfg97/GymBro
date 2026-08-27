# GymBro — Documentación del Proyecto

**Entrenador personal** de ejercicio físico para TV. Aplicación en vanilla JS/HTML/CSS con backend en Node.js + Express + SQLite (better-sqlite3). Orientada a navegación por teclado (foco/control remoto) y a guiar al usuario **cómo** realizar cada ejercicio (pasos visuales + voz). Toda la interfaz está en español.

## Stack

- **Backend**: Node.js + Express + better-sqlite3 (SQLite), JWT para autenticación, bcryptjs para contraseñas.
- **Frontend**: Vanilla JS, HTML y CSS (sin frameworks ni build). Todo en `public/` (index.html, app.js, style.css).
- **Infra**: Docker (Node 20 alpine), docker-compose para despliegue (Portainer, volumen persistente `data/`), CI/CD con GitHub Actions → push de la imagen a Docker Hub (tags `latest` + SHA).

## Estructura

```
server.js            Express: sirve estáticos y monta las rutas /api/*. Puerto 80. Exporta app (testable).
db.js                Conexión SQLite, esquema de tablas y seed. Ruta redefinible con GYMBRO_DB_PATH (tests).
data/guides.js       Contenido pedagógico del entrenador por ejercicio (steps, watch, coach).
routes/
  auth.js            Registro y login con bcrypt + JWT (30 días). Valida los campos.
  profile.js         Perfil, historial, estadísticas. Auth. (Se eliminó el vulnerable POST /points).
  leaderboard.js     Ranking por XP.
  exercises.js       30 ejercicios seed en 6 categorías + filtros. Devuelve `unit` y `guide` (objeto).
  workouts.js        Registrar sesión, sumar XP/nivel, rachas (streak), evaluar logros. Guarda sets/reps/peso.
  achievements.js    Listado de logros y logros del usuario actual.
  routines.js        6 rutinas seed con ejercicios ordenados (incluye `guide` por ejercicio).
  social.js          Amistades (solicitud mutua) y desafíos entre amigos.
  validation.js      Validación de entrada compartida (registro y perfil).
public/
  index.html         Pantallas: login, registro, dashboard, perfil, clasificación, logros, historial, social, modal con guía, workout guiado, resultado.
  app.js             Lógica SPA: navegación, flujo de workout guiado (pasos + voz), cronómetro, logros, social.
  style.css          Tema oscuro con foco dorado, layout para TV + media queries responsive.
test/                Suites con node --test + supertest (usan una DB temporal aislada).
eslint.config.js     Config ESLint flat (node/browser).
data/gymbro.db       Base de datos SQLite (persistida vía volumen Docker; ignorada por git).
.github/workflows/   CI/CD: build y push a Docker Hub en cada push a main.
```

## Modelo de datos

- **users**: id, name (único), password (hash), sex, height, weight, goal, points, level, created_at + columnas de racha (current_streak, last_workout_date, max_streak).
- **exercises**: id, name, description, icon, duration, difficulty (beginner/intermediate/advanced), category, `unit` (duration/reps), points, `guide` (JSON pedagógico).
- **achievements**: logros con `criteria_type` (total_sessions, total_points, streak_days, category_count) y `criteria_value`.
- **user_achievements**: logros ganados por usuario.
- **workout_sessions**: registro de cada ejercicio completado (points, duration, sets, reps, weight_kg, completed_at).
- **routines** y **routine_exercises**: rutinas (relación con exercises, con orden).
- **friendships**: solicitudes de amistad (requester/addressee, status pending/accepted/declined).
- **challenges**: desafíos entre amigos (challenger/opponent, metric, target, duration_days, status, winner_id, starts_at/ends_at).

## Medición de ejercicios

- `unit = 'duration'`: se mide por minutos (cardio, yoga, baile, meditación, HIIT de duración).
- `unit = 'reps'` (fuerza 6-10 y HIIT salto 17-19): se registran `sets`, `reps` y `weight_kg` de forma opcional en la pantalla de workout.

## Sistema social

- **Amistad mutua aprobada**: para añadir se envía una solicitud; el otro la acepta/rechaza. El perfil público (`GET /social/users/:id`) solo muestra detalles a amigos.
- **Desafíos** (solo entre amigos), 3 métricas:
  - `first_to_xp`: primero en alcanzar un `target` de XP.
  - `total_workouts`: más entrenamientos en `duration_days`.
  - `best_streak`: mejor racha de días en la ventana.
  - El ganador se determina en lectura; al pasar `ends_at` el desafío pasa a `completed`.
  - Las fechas (`starts_at`/`ends_at`/`completed_at`) usan formato SQLite `YYYY-MM-DD HH:MM:SS` para comparaciones coherentes.

## Mecánica de juego

- Cada ejercicio otorga **XP**. El **nivel** sube cada 1000 XP (`level = floor(points/1000) + 1`).
- **Racha (streak)**: días seguidos entrenando (el mismo día no acumula; el día siguiente suma; si se pierde un día se reinicia a 1).
- **Logros**: se evalúan al completar cada ejercicio; los nuevos se muestran en la pantalla de resultado.
- **Categorías**: cardio, fuerza (strength), yoga, HIIT, baile (dance), meditación.

## Modo entrenador personal

El foco de la UI está en **guiar** al usuario, no en el seguimiento:

- **Contenido**: `data/guides.js` define por ejercicio una guía con `steps` (pasos), `watch` (errores comunes), `coach` (mensaje motivador) y, opcionalmente, `gifUrl` (animación de referencia).
- **Instrucciones y animación**: los pasos de los ejercicios de fuerza/cardio/HIIT provienen de [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (basado en ExerciseDB v1), texto bajo licencia MIT. Las animaciones (GIF) son © Gym visual (https://gymvisual.com/): **no se redistribuyen** en el repo, sino que se referencian por URL desde el repositorio upstream (igual que openGym), y se muestran en el modal y en la pantalla de entrenamiento. Yoga, baile y meditación conservan sus guías propias (el dataset no las cubre).
- **Modal de ejercicio**: muestra los pasos y precauciones, con botón "🔊 Escuchar" que lee la guía completa en voz alta, y una animación (GIF) de referencia si está disponible.
- **Pantalla de entrenamiento**: bloque *coach* con el paso actual en grande, puntos de progreso, botones "◀ Anterior / 🔊 / Siguiente ▶", y lectura automática del paso al entrar y al navegar.
- **Voz**: Web Speech API (`SpeechSynthesisUtterance`) en español (busca voz es-ES/MX/AR). Se detiene al completar o cancelar.
- **Rutinas**: cada ejercicio de una rutina pasa por el mismo flujo guiado.
- **Seguimiento atenuado**: se ocultan XP/racha del header del dashboard y el badge de puntos de las tarjetas (los datos se siguen guardando).

## Flujo principal

1. Registro / login.
2. Dashboard con grid de ejercicios (o pestaña de rutinas), filtros por categoría, stats de nivel/XP/racha.
3. Abrir un ejercicio (modal) o una rutina (modal con lista de ejercicios).
4. Flujo de workout: cronómetro, botón "Completar".
5. Pantalla de resultado: XP ganado, rachas, nuevos logros.
6. Pantallas secundarias: historial (con stats), clasificación, logros, perfil.

## Estado (implementado)

- Auth (registro/login con JWT) + validación de entrada (rangos de altura/peso, enums, longitud).
- Gestión de perfil (consulta y edición). Eliminada la vulnerabilidad del endpoint `/points`.
- Sistema de ejercicios: 30 seed en 6 categorías, filtros, badges de dificultad, campo `unit`.
- Guías e instrucciones: pasos enriquecidos (procedentes de exercises-dataset/ExerciseDB) para fuerza/cardio/HIIT + animaciones GIF de referencia en modal y pantalla de workout.
- Flujo de workout con cronómetro, rachas y logros. Registro opcional de series/reps/peso.
- Sistema de rutinas: 6 rutinas, flujo secuencial.
- Historial con stats y registro por entreno (incluye sets/reps/peso si los hay).
- Sistema social: amistades mutuas + desafíos entre amigos (3 métricas).
- Clasificación, logros, perfil.
- Navegación por teclado para TV, tema oscuro y media queries responsive.
- Tests con `node --test` + `supertest`, linter ESLint (`npm test`, `npm run lint`).
- Docker + docker-compose + CI/CD.

## Pendientes / mejoras posibles

- **Verificación de runtime en local**: Node.js no está instalado en este equipo, por lo que `npm install`, `npm test` y `npm run lint` aún no se han ejecutado. Validar al instalar Node.
- Analytics por día con gráficas de progreso (XP/sesiones a lo largo del tiempo) — descartado en esta iteración.
- Los desafíos activos no se cancelan al borrar la amistad; siguen hasta su `ends_at`.
- Los `friendships` usan una fila por solicitud; si ambos se envían una simultáneamente se resuelve como aceptación mutua (lógica presente, no testees conflictos de dirección inversa en paralelo).

## Convenciones

- Los mensajes de commit deben comenzar con `AI - ` (ver AGENTS.md).
- Los commits pueden hacerse libremente, pero el **push** requiere orden explícita del usuario (`push`).
- El CI de GitHub Actions publica automáticamente a Docker Hub al hacer push a `main`.