# PostgreSQL Database Setup for Relayer

## Option 1: Install PostgreSQL via Homebrew (macOS)

If you have Homebrew installed:

```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Create database
createdb motus_relayer

# Verify installation
psql -d motus_relayer -c "SELECT version();"
```

## Option 2: Install PostgreSQL via Official Installer (macOS)

1. Download PostgreSQL from: https://www.postgresql.org/download/macosx/
2. Run the installer
3. During installation, set a password for the `postgres` user
4. After installation, add PostgreSQL to your PATH:
   ```bash
   export PATH="/Library/PostgreSQL/16/bin:$PATH"
   ```
5. Create the database:
   ```bash
   createdb -U postgres motus_relayer
   ```

## Option 3: Use Docker (Easiest)

If you have Docker installed:

```bash
# Run PostgreSQL in a Docker container
docker run --name motus-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=motus_relayer \
  -p 5432:5432 \
  -d postgres:16

# Verify it's running
docker ps | grep motus-postgres
```

The database will be accessible at `localhost:5432` with:
- Username: `postgres`
- Password: `postgres`
- Database: `motus_relayer`

## Option 4: Use Cloud Database (Production)

For production, consider:
- **Railway**: https://railway.app (Free tier available)
- **Supabase**: https://supabase.com (Free tier available)
- **Neon**: https://neon.tech (Free tier available)
- **AWS RDS**: For production deployments

## After Installation: Configure Relayer

1. Create `.env` file in the `relayer` directory:

```bash
cd relayer
cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=motus_relayer
DB_USER=postgres
DB_PASSWORD=postgres

# Blockchain Configuration
RPC_URL=https://forno.celo-sepolia.celo-testnet.org

# Relayer Configuration
RELAYER_PRIVATE_KEY=your_relayer_private_key_here
MIN_BALANCE_WEI=1000000000000000000
PORT=3001
EOF
```

2. Run migrations:

```bash
npm install
npm run migrate
```

3. Verify database setup:

```bash
psql -d motus_relayer -c "\dt"
```

You should see tables: `transactions`, `user_nonces`, `signers`, `transaction_logs`

## Troubleshooting

### "psql: command not found"
- Add PostgreSQL bin directory to your PATH
- For Homebrew: `export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"`
- For official installer: `export PATH="/Library/PostgreSQL/16/bin:$PATH"`

### "Connection refused"
- Make sure PostgreSQL is running: `brew services list` or `docker ps`
- Check if port 5432 is in use: `lsof -i :5432`

### "Database does not exist"
- Create it: `createdb motus_relayer` or `createdb -U postgres motus_relayer`

### "Password authentication failed"
- Check your `.env` file has the correct password
- For Docker, use the password you set in the `POSTGRES_PASSWORD` environment variable

