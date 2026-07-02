# GymBro

Gamificación del ejercicio físico para TV.

## Desarrollo

```bash
# Servir localmente con cualquier servidor estático
npx serve .
```

## Docker

```bash
docker build -t gymbro .
docker run -d -p 8080:80 gymbro
```

## CI/CD

Cada push a `main` construye y publica automáticamente la imagen en Docker Hub con tags `latest` y el SHA del commit.
