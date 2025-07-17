const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'crm.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Starting location tracking migration...');

db.serialize(() => {
  // Create location tracking table
  db.run(`CREATE TABLE IF NOT EXISTS location_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    timestamp TEXT NOT NULL,
    session_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating location_tracking table:', err.message);
    } else {
      console.log('✅ Location tracking table created successfully');
    }
  });

  // Create daily mileage table
  db.run(`CREATE TABLE IF NOT EXISTS daily_mileage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    total_distance_miles REAL DEFAULT 0,
    total_distance_km REAL DEFAULT 0,
    points_count INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
  )`, (err) => {
    if (err) {
      console.error('Error creating daily_mileage table:', err.message);
    } else {
      console.log('✅ Daily mileage table created successfully');
    }
  });

  // Create user sessions table
  db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id TEXT UNIQUE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating user_sessions table:', err.message);
    } else {
      console.log('✅ User sessions table created successfully');
    }
  });

  // Create indexes for better performance
  db.run('CREATE INDEX IF NOT EXISTS idx_location_tracking_user_session ON location_tracking (user_id, session_id)', (err) => {
    if (err) {
      console.error('Error creating location tracking index:', err.message);
    } else {
      console.log('✅ Location tracking index created');
    }
  });

  db.run('CREATE INDEX IF NOT EXISTS idx_location_tracking_timestamp ON location_tracking (timestamp)', (err) => {
    if (err) {
      console.error('Error creating timestamp index:', err.message);
    } else {
      console.log('✅ Timestamp index created');
    }
  });

  db.run('CREATE INDEX IF NOT EXISTS idx_daily_mileage_user_date ON daily_mileage (user_id, date)', (err) => {
    if (err) {
      console.error('Error creating daily mileage index:', err.message);
    } else {
      console.log('✅ Daily mileage index created');
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