# PokeDuckParty API (MongoDB)

Backend de la invitación. Guarda las confirmaciones (RSVP) en **MongoDB**.
Rápido, estable y con CORS correctos: el navegador del invitado habla directo
con esta API, sin trucos ni intermediarios.

## Endpoints

| Método | Ruta                          | Qué hace                                        |
|--------|-------------------------------|-------------------------------------------------|
| GET    | `/`                           | Salud del servicio                              |
| GET    | `/list`                       | Lista pública (sin mensajes privados)           |
| POST   | `/rsvp`                       | Registra `{name, attendees, fav, message}`      |
| POST   | `/claim`                      | Marca poción canjeada `{name}`                  |
| GET    | `/admin`                      | Página web del panel de admin                   |
| GET    | `/admin/guests?token=XXX`     | Lista COMPLETA en JSON (incluye mensajes)       |

## Variables de entorno

| Variable      | Descripción                                               |
|---------------|-----------------------------------------------------------|
| `MONGODB_URI` | Cadena de conexión de Mongo (la da el plugin de Railway)  |
| `ADMIN_TOKEN` | Contraseña para ver el panel de admin (ponla tú)          |
| `PORT`        | Railway lo asigna solo                                    |

## Desplegar en Railway (pasos)

1. Sube esta carpeta a un repo de GitHub (ej. `pokeduckparty-api`).
2. Entra a [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → elige el repo.
3. Agrega la base de datos: dentro del proyecto, **New → Database → Add MongoDB**.
   Railway crea la variable `MONGO_URL` en el servicio de la base.
4. Enlaza la variable al API: en el servicio del API → **Variables** → agrega:
   - `MONGODB_URI` = referencia a `MONGO_URL` del servicio Mongo
     (Railway permite referenciar con `${{MongoDB.MONGO_URL}}` o pega el valor).
   - `ADMIN_TOKEN` = una contraseña que inventes (para el panel de admin).
5. En **Settings → Networking → Generate Domain** del API, genera el dominio público.
   Te dará algo como `https://pokeduckparty-api-production.up.railway.app`.
6. Esa URL va en el `config.js` del frontend (campo `API_BASE`).

## Ver las confirmaciones (panel de admin)

- Abre `https://TU-API.up.railway.app/admin`
- Escribe tu `ADMIN_TOKEN` y carga la lista.
- Verás todo: nombres, personas, personaje, **mensajes privados**, poción y fecha.

## Probar local (opcional)

Necesitas un MongoDB local o una URI de Mongo Atlas.

```bash
npm install
# PowerShell:
$env:MONGODB_URI="mongodb://127.0.0.1:27017/pokeduckparty"; $env:ADMIN_TOKEN="test"; npm start
# luego: http://localhost:3000/list
```
