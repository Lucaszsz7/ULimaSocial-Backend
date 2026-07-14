# ULimaSocial Backend

API REST de ULimaSocial desarrollada con Node.js, Express y PostgreSQL.

## Ejecucion local

1. Copiar `.env.example` como `.env` y completar la conexion PostgreSQL.
2. Instalar dependencias con `npm install`.
3. Crear o actualizar las tablas con `npm run db:init`.
4. Iniciar el servidor con `npm run dev`.

La API se ejecuta de forma predeterminada en `http://localhost:3000`.

## Arquitectura MVC

El proyecto separa sus responsabilidades de esta manera:

- **Modelo (`models/`)**: contiene las consultas y transacciones PostgreSQL.
- **Controlador (`controllers/`)**: recibe la petición HTTP, valida los datos de entrada y construye la respuesta.
- **Vista**: es la aplicación React desplegada por separado en Vercel.
- **Servicios (`services/`)**: reúnen reglas de negocio reutilizables, como autenticación, contraseñas y envío de correos.
- **Rutas (`routes/`)**: conectan cada endpoint con su controlador y middleware.

Esta separación no modifica los endpoints existentes ni el esquema de la base de datos.

## Pruebas

Ejecutar `npm test`.

## Despliegue

El archivo `render.yaml` crea una base PostgreSQL y el servicio web en Render. La variable `CLIENT_ORIGIN` debe contener la URL publica del frontend en Vercel. Los archivos `.env` nunca deben subirse al repositorio.
