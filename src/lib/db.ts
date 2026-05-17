import Database from 'better-sqlite3';
import path from 'path';

// Define the absolute path to the SQLite file inside the workspace
const dbPath = path.resolve(process.cwd(), 'alignintel.sqlite');

// Initialize the SQLite database connection
const db = new Database(dbPath);

// Configure WAL mode for better write-ahead performance
db.pragma('journal_mode = WAL');

// Initialize the database tables if they do not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,          -- 'standards' or 'lesson_plan'
    file_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS alignment_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_plan_id INTEGER NOT NULL,
    standards_id INTEGER,
    detected_grade TEXT,
    stats TEXT,                  -- JSON stringified stats: { total, high, low }
    extractions TEXT,            -- JSON stringified extracted elements
    alignments TEXT,             -- JSON stringified alignment checks
    gaps TEXT,                   -- JSON stringified gaps
    suggestions TEXT,            -- JSON stringified suggestions
    rewritten_plan TEXT,         -- The revised plan in Markdown
    changes_made TEXT,           -- JSON stringified change log
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_plan_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (standards_id) REFERENCES documents(id) ON DELETE SET NULL
  );
`);

export default db;
