const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'crm.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Starting routes migration...');

db.serialize(() => {
  // Create routes table
  db.run(`CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    total_distance_miles REAL DEFAULT 0,
    total_distance_km REAL DEFAULT 0,
    estimated_duration_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating routes table:', err.message);
    } else {
      console.log('✅ Routes table created successfully');
    }
  });

  // Create route_stops table (businesses in the route)
  db.run(`CREATE TABLE IF NOT EXISTS route_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    business_id INTEGER NOT NULL,
    stop_order INTEGER NOT NULL,
    estimated_duration_minutes INTEGER DEFAULT 30,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE,
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating route_stops table:', err.message);
    } else {
      console.log('✅ Route stops table created successfully');
    }
  });

  // Create route_executions table (actual route runs)
  db.run(`CREATE TABLE IF NOT EXISTS route_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    execution_date TEXT NOT NULL,
    actual_distance_miles REAL DEFAULT 0,
    actual_distance_km REAL DEFAULT 0,
    actual_duration_minutes INTEGER DEFAULT 0,
    start_time TEXT,
    end_time TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('Error creating route_executions table:', err.message);
    } else {
      console.log('✅ Route executions table created successfully');
    }
  });

  // Create indexes for better performance
  db.run('CREATE INDEX IF NOT EXISTS idx_routes_user ON routes (user_id)', (err) => {
    if (err) {
      console.error('Error creating routes index:', err.message);
    } else {
      console.log('✅ Routes index created');
    }
  });

  db.run('CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops (route_id)', (err) => {
    if (err) {
      console.error('Error creating route_stops index:', err.message);
    } else {
      console.log('✅ Route stops index created');
    }
  });

  db.run('CREATE INDEX IF NOT EXISTS idx_route_executions_route ON route_executions (route_id)', (err) => {
    if (err) {
      console.error('Error creating route_executions index:', err.message);
    } else {
      console.log('✅ Route executions index created');
    }
  });

  // Close database connection
  setTimeout(() => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('✅ Migration completed successfully');
      }
    });
  }, 1000);
}); 