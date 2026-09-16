# Viste School API (Spring Boot)

Java 17 + Spring Boot 3.3 API for the Viste High School React UI.

## Run (H2 local DB)

```bash
cd backend
.\mvnw.cmd spring-boot:run
```

API base: `http://localhost:18080/api/v1`  
Health: `http://localhost:18080/api/v1/health`  
H2 console: `http://localhost:18080/h2-console` (JDBC URL from `application.properties`)

## Demo logins

| Email | Password | Role |
| --- | --- | --- |
| admin@viste.school | demo1234 | SCHOOL_ADMIN |
| teacher@viste.school | demo1234 | TEACHER |
| parent@viste.school | demo1234 | PARENT |
| student@viste.school | demo1234 | STUDENT |

## PostgreSQL (optional)

```bash
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=postgres
```

Create DB/user first:

```sql
CREATE DATABASE viste_school;
CREATE USER viste WITH PASSWORD 'viste';
GRANT ALL PRIVILEGES ON DATABASE viste_school TO viste;
```

## Frontend switch

In project root `.env`:

```env
VITE_API_BASE_URL=http://localhost:18080/api/v1
VITE_USE_MOCK_API=false
```

Then `npm run dev`.
