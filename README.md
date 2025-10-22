## Documentation

The API documentation is available at the `/api-docs` route.

## Run in Docker

This can be achive by creating a `.env` file with the following:

```env
# Database
DATABASE_URL="postgresql://postgres:prisma@postgres_db:5432/postgres?schema=public"

# Application
PORT=3000
NODE_ENV=development
```

Then, build and run the Docker container with:

```bash
npm run docker-dev
```

This will build a Docker image from the source code, create a container with PostgreSQL and Prisma Studio, and apply any pending migrations.

**Services**

- endpoint: `http://localhost:3000/`
- Prisma Studio: `http://localhost:5555/`
- PostgresSQL: `http://localhost:5433/`

> If you make changes to the **project dependencies**, make sure to rebuild the Docker container by running `npm run docker-build`.

## Setup (local)

1. Create a `.env` file in the root directory:

   ```env
   # Database
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

   # Application
   PORT=3000
   NODE_ENV=development
   ALLOWED_ORIGINS="http://localhost:5173,https://frontend-software-eight.vercel.app/"
   ```

2. **Database Setup**: Create a PostgreSQL user and database:

   ```bash
   # Create the database user
   psql -U postgres -c "CREATE USER <username> WITH PASSWORD <password>;"

   # Create the database
   psql -U postgres -c "CREATE DATABASE <dbname>;"

   ```

3. **Generate Prisma Client**:

   Run any pending migratrion with:

   ```bash
   npx prisma migrate deploy
   ```

   If the Prisma client has never been generated or if changes were made to the `schema.prisma` file, you must generate or regenerate the Prisma client:

   ```bash
   npx prisma generate
   ```
