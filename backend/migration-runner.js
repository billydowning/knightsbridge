/**
 * 🚛 TOYOTA RELIABILITY: Database Migration Runner
 * Safely applies database migrations without destroying existing data
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

class MigrationRunner {
  constructor(databaseUrl) {
    // Parse the database URL and configure SSL for DigitalOcean
    let dbUrl = databaseUrl;
    if (dbUrl.includes('?sslmode=')) {
      dbUrl = dbUrl.split('?')[0];
    }

    this.pool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false // Required for DigitalOcean managed databases
      }
    });
    
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  // Calculate SHA-256 hash of migration content for integrity checking
  calculateSqlHash(sqlContent) {
    return crypto.createHash('sha256').update(sqlContent).digest('hex');
  }

  // Get list of migration files sorted by filename
  getMigrationFiles() {
    try {
      const files = fs.readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      return files.map(file => ({
        filename: file,
        path: path.join(this.migrationsDir, file),
        name: file.replace('.sql', '')
      }));
    } catch (error) {
      console.error('❌ Error reading migrations directory:', error);
      return [];
    }
  }

  // Check which migrations have already been applied
  async getAppliedMigrations() {
    try {
      const result = await this.pool.query(
        'SELECT migration_name, applied_at, sql_checksum FROM schema_migrations ORDER BY applied_at'
      );
      return result.rows;
    } catch (error) {
      // If the migrations table doesn't exist, return empty array
      if (error.code === '42P01') { // relation does not exist
        console.log('📋 No migrations table found - will create it with first migration');
        return [];
      }
      throw error;
    }
  }

  // Apply a single migration
  async applyMigration(migration) {
    const sqlContent = fs.readFileSync(migration.path, 'utf8');
    const sqlHash = this.calculateSqlHash(sqlContent);
    
    console.log(`🔄 Applying migration: ${migration.name}`);
    
    try {
      // Execute the migration in a transaction
      await this.pool.query('BEGIN');
      
      // Execute the migration SQL
      await this.pool.query(sqlContent);
      
      // Record that this migration was applied (if not already recorded by the migration itself)
      await this.pool.query(`
        INSERT INTO schema_migrations (migration_name, sql_checksum, description, applied_at) 
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (migration_name) DO UPDATE SET
          sql_checksum = EXCLUDED.sql_checksum,
          applied_at = EXCLUDED.applied_at
      `, [migration.name, sqlHash, `Migration from ${migration.filename}`]);
      
      await this.pool.query('COMMIT');
      console.log(`✅ Successfully applied migration: ${migration.name}`);
      
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error(`❌ Error applying migration ${migration.name}:`, error);
      throw error;
    }
  }

  // Run all pending migrations
  async runMigrations() {
    console.log('🚛 TOYOTA MIGRATION SYSTEM: Starting database migrations...');
    
    try {
      const migrationFiles = this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();
      const appliedNames = new Set(appliedMigrations.map(m => m.migration_name));
      
      console.log(`📋 Found ${migrationFiles.length} migration files`);
      console.log(`✅ ${appliedMigrations.length} migrations already applied`);
      
      // Filter out already applied migrations
      const pendingMigrations = migrationFiles.filter(migration => 
        !appliedNames.has(migration.name)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('🎉 All migrations are up to date!');
        return { success: true, applied: 0, total: migrationFiles.length };
      }
      
      console.log(`🔄 Applying ${pendingMigrations.length} pending migrations...`);
      
      // Apply each pending migration
      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
      }
      
      console.log('🎉 All migrations completed successfully!');
      return { 
        success: true, 
        applied: pendingMigrations.length, 
        total: migrationFiles.length 
      };
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Verify migration integrity by checking checksums
  async verifyMigrations() {
    console.log('🔍 Verifying migration integrity...');
    
    try {
      const migrationFiles = this.getMigrationFiles();
      const appliedMigrations = await this.getAppliedMigrations();
      
      let allValid = true;
      
      for (const applied of appliedMigrations) {
        const file = migrationFiles.find(f => f.name === applied.migration_name);
        
        if (!file) {
          console.warn(`⚠️  Applied migration ${applied.migration_name} not found in files`);
          continue;
        }
        
        if (applied.sql_checksum) {
          const currentContent = fs.readFileSync(file.path, 'utf8');
          const currentHash = this.calculateSqlHash(currentContent);
          
          if (currentHash !== applied.sql_checksum) {
            console.error(`❌ Migration ${applied.migration_name} has been modified after application!`);
            allValid = false;
          }
        }
      }
      
      if (allValid) {
        console.log('✅ All applied migrations are valid');
      }
      
      return allValid;
      
    } catch (error) {
      console.error('❌ Error verifying migrations:', error);
      return false;
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = MigrationRunner;

// If run directly, execute migrations
if (require.main === module) {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  const runner = new MigrationRunner(databaseUrl);
  
  runner.runMigrations()
    .then(result => {
      if (result.success) {
        console.log(`🎉 Migration complete: ${result.applied}/${result.total} migrations applied`);
        process.exit(0);
      } else {
        console.error('❌ Migration failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    })
    .finally(() => {
      runner.close();
    });
}