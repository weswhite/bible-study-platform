# Docker Setup for Bible Study App

This directory contains Docker configuration for running the Bible Study backend and PostgreSQL database.

## Quick Start

### Production Mode
```bash
# Start all services in production mode
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop services
docker-compose down
```

### Development Mode
```bash
# Start in development mode (with hot reload)
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build

# Or simply (override is loaded automatically)
docker-compose up --build
```

## Services

### PostgreSQL Database
- **Container**: `bible-study-db`
- **Port**: `5433` (mapped to host), `5432` (internal)
- **Database**: `bible_study`
- **User**: `bible_user`
- **Password**: `bible_password_secure_123`

### Backend API
- **Container**: `bible-study-backend`
- **Port**: `3001` (mapped to host)
- **Health Check**: `http://localhost:3001/health`

## Environment Variables

The Docker setup uses environment variables defined in `docker-compose.yml`. For custom configuration:

1. Copy `.env.docker` to `.env.local`
2. Modify the values as needed
3. Update `docker-compose.yml` to use your custom env file

### Important Security Notes

**⚠️ CHANGE THESE IN PRODUCTION:**
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `POSTGRES_PASSWORD`

## Database Management

### Running Migrations
```bash
# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Generate Prisma client
docker-compose exec backend npx prisma generate

# Open Prisma Studio (if needed)
docker-compose exec backend npx prisma studio
```

### Database Access
```bash
# Connect to PostgreSQL directly (from within container)
docker-compose exec postgres psql -U bible_user -d bible_study

# Connect from host machine (using external port 5433)
psql -h localhost -p 5433 -U bible_user -d bible_study

# View database logs
docker-compose logs postgres
```

## Development Workflow

### Backend Development
The development override automatically mounts source code for hot reloading:

```bash
# Start in development mode
docker-compose up

# View backend logs
docker-compose logs -f backend

# Restart just the backend
docker-compose restart backend
```

### Debugging
```bash
# Access backend container shell
docker-compose exec backend sh

# View all container status
docker-compose ps

# View logs for all services
docker-compose logs
```

## Volumes

- `postgres_data`: Persistent PostgreSQL data
- `./backend/uploads`: File uploads (if used)

## Network

All services run on the `bible-study-network` bridge network, allowing secure inter-service communication.

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready -U bible_user -d bible_study

# Restart database
docker-compose restart postgres
```

### Backend Issues
```bash
# Check backend logs
docker-compose logs backend

# Rebuild backend
docker-compose up --build backend
```

### Clean Start
```bash
# Stop and remove all containers, networks, and images
docker-compose down --rmi all

# Remove volumes (⚠️ deletes all data)
docker-compose down -v

# Complete rebuild
docker-compose up --build
```