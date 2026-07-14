# ULimaSocial Backend

API REST de ULimaSocial desarrollada con Node.js, Express y PostgreSQL.

## Ejecucion local

1. Copiar `.env.example` como `.env` y completar la conexion PostgreSQL.
2. Instalar dependencias con `npm install`.
3. Crear o actualizar las tablas con `npm run db:init`.
4. Iniciar el servidor con `npm run dev`.

La API se ejecuta de forma predeterminada en `http://localhost:3000`.

## Pruebas

Ejecutar `npm test`.

## Despliegue

El archivo `render.yaml` crea una base PostgreSQL y el servicio web en Render. La variable `CLIENT_ORIGIN` debe contener la URL publica del frontend en Vercel. Los archivos `.env` nunca deben subirse al repositorio.
