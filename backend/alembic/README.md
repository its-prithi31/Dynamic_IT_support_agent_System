# Database migrations

After installing backend dependencies, create an initial migration once in a safe copy of your development database:

`python -m alembic revision --autogenerate -m "initial schema"`

Review the generated file under `backend/alembic/versions/`, back up the database, then apply it with:

`python -m alembic upgrade head`

Do not delete `aegis.db` to apply a schema update.
