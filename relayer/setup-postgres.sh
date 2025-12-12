#!/bin/bash

echo "🐘 PostgreSQL Setup for Motus Relayer"
echo "======================================"
echo ""

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "✅ Docker found"
    
    # Check if Docker daemon is running
    if docker info &> /dev/null; then
        echo "✅ Docker daemon is running"
        
        # Check if container already exists
        if docker ps -a | grep -q motus-postgres; then
            echo "📦 Container 'motus-postgres' already exists"
            read -p "Do you want to start it? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                docker start motus-postgres
                echo "✅ Container started"
            fi
        else
            echo "🚀 Creating PostgreSQL container..."
            docker run --name motus-postgres \
                -e POSTGRES_PASSWORD=postgres \
                -e POSTGRES_DB=motus_relayer \
                -p 5432:5432 \
                -d postgres:16
            
            echo "⏳ Waiting for PostgreSQL to start..."
            sleep 5
            
            if docker ps | grep -q motus-postgres; then
                echo "✅ PostgreSQL container is running!"
                echo "   Database: motus_relayer"
                echo "   User: postgres"
                echo "   Password: postgres"
                echo "   Port: 5432"
            else
                echo "❌ Failed to start container"
                exit 1
            fi
        fi
    else
        echo "❌ Docker daemon is not running"
        echo "   Please start Docker Desktop and try again"
        exit 1
    fi
elif command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client found"
    echo "📝 Creating database 'motus_relayer'..."
    createdb motus_relayer 2>/dev/null || echo "⚠️  Database might already exist"
    echo "✅ Database setup complete"
else
    echo "❌ Neither Docker nor PostgreSQL found"
    echo ""
    echo "Please choose one of these options:"
    echo ""
    echo "Option 1: Install Docker Desktop"
    echo "  Download from: https://www.docker.com/products/docker-desktop"
    echo "  Then run this script again"
    echo ""
    echo "Option 2: Install PostgreSQL"
    echo "  macOS: Download from https://www.postgresql.org/download/macosx/"
    echo "  Or use Homebrew: brew install postgresql@16"
    echo ""
    exit 1
fi

echo ""
echo "📋 Next steps:"
echo "  1. Copy .env.example to .env: cp .env.example .env"
echo "  2. Edit .env and add your RELAYER_PRIVATE_KEY"
echo "  3. Run migrations: npm run migrate"
echo "  4. Start relayer: npm start"
