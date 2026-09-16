# Viste High School Management System

React (Vite) frontend + Spring Boot API.

## Frontend

```bash
npm install
npm run dev
```

Default UI mode uses mock data (`VITE_USE_MOCK_API=true`).

## Backend (Spring Boot)

```bash
cd backend
.\mvnw.cmd spring-boot:run
```

API: `http://localhost:18080/api/v1`  
Health: `http://localhost:18080/api/v1/health`

### Connect UI to Spring Boot

Update `.env`:

```env
VITE_API_BASE_URL=http://localhost:18080/api/v1
VITE_USE_MOCK_API=false
```

Restart Vite, then sign in with:

- `admin@viste.school` / `demo1234`
- `teacher@viste.school` / `demo1234`

See [backend/README.md](backend/README.md) for PostgreSQL profile and more endpoints.
