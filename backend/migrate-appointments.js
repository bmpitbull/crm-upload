const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Starting appointments table migration...');

// Create appointments table
const createAppointmentsTable = `
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL,
    contact_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE SET NULL
);
`;

// Create indexes
const createIndexes = `
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_business ON appointments (business_id);
`;

// Add sample appointments
const addSampleAppointments = `
INSERT INTO appointments (business_id, contact_id, title, description, appointment_date, appointment_time, duration_minutes, status) VALUES
(1, 1, 'Follow-up Meeting', 'Discuss project progress and next steps', '2024-01-15', '10:00:00', 60, 'scheduled'),
(1, 2, 'Contract Review', 'Review and sign new service agreement', '2024-01-16', '14:30:00', 90, 'scheduled'),
(1, NULL, 'Site Visit', 'Inspect new office location', '2024-01-18', '09:00:00', 120, 'scheduled'),
(1, 1, 'Client Presentation', 'Present quarterly results to client', '2024-01-20', '11:00:00', 60, 'scheduled'),
(1, 2, 'Team Meeting', 'Weekly team sync and planning', '2024-01-22', '15:00:00', 60, 'scheduled');
`;

db.serialize(() => {
  // Create appointments table
  db.run(createAppointmentsTable, (err) => {
    if (err) {
      console.error('Error creating appointments table:', err.message);
    } else {
      console.log('✅ Appointments table created successfully');
    }
  });

  // Create indexes
  db.run(createIndexes, (err) => {
    if (err) {
      console.error('Error creating indexes:', err.message);
    } else {
      console.log('✅ Indexes created successfully');
    }
  });

  // Add sample appointments
  db.run(addSampleAppointments, (err) => {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        console.log('ℹ️ Sample appointments already exist, skipping...');
      } else {
        console.error('Error adding sample appointments:', err.message);
      }
    } else {
      console.log('✅ Sample appointments added successfully');
    }
    
    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('✅ Migration completed successfully');
      }
    });
  });
}); 