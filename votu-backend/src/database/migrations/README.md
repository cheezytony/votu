# Database Migrations

Migrations are managed via TypeORM CLI.

## Commands

```bash
# Generate a migration from entity changes
pnpm migration:generate src/database/migrations/MigrationName

# Run all pending migrations
pnpm migration:run

# Revert the last migration
pnpm migration:revert
```

## Setup

Ensure `.env` is present with a valid `DATABASE_URL` before running migrations.

The app uses `synchronize: false` — all schema changes must be done via migrations.
