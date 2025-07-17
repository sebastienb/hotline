import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import os from 'os';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend dist
app.use(express.static(join(__dirname, '../frontend/dist')));

// Create necessary directories
const hotlineDir = join(os.homedir(), '.hotline');
const soundsDir = join(hotlineDir, 'sounds');
const claudeDir = join(os.homedir(), '.claude');

[hotlineDir, soundsDir, claudeDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize database
const dbPath = join(hotlineDir, 'hooks.db');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    hook_type TEXT NOT NULL,
    tool_name TEXT,
    message TEXT
  )
`);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, soundsDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 and WAV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// API Routes

// Get current hooks configuration
app.get('/api/hooks', (req, res) => {
  try {
    const settingsPath = join(claudeDir, 'settings.json');
    
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      res.json(settings.hooks || {});
    } else {
      res.json({});
    }
  } catch (error) {
    console.error('Error reading hooks config:', error);
    res.status(500).json({ error: 'Failed to read hooks configuration' });
  }
});

// Save hooks configuration
app.post('/api/hooks', (req, res) => {
  try {
    const { hooks, target = 'global' } = req.body;
    
    const settingsPath = target === 'global' 
      ? join(claudeDir, 'settings.json')
      : join(process.cwd(), '.claude', 'settings.json');
    
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    
    settings.hooks = hooks;
    
    // Create directory if it doesn't exist
    const dir = dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    res.json({ success: true, path: settingsPath });
  } catch (error) {
    console.error('Error saving hooks config:', error);
    res.status(500).json({ error: 'Failed to save hooks configuration' });
  }
});

// Get logs with filtering
app.get('/api/logs', (req, res) => {
  try {
    const { hookType, sessionId, keyword, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM logs WHERE 1=1';
    const params = [];
    
    if (hookType) {
      query += ' AND hook_type = ?';
      params.push(hookType);
    }
    
    if (sessionId) {
      query += ' AND session_id = ?';
      params.push(sessionId);
    }
    
    if (keyword) {
      query += ' AND (message LIKE ? OR tool_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const stmt = db.prepare(query);
    const logs = stmt.all(...params);
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Insert new log entry
app.post('/api/logs', (req, res) => {
  try {
    const { sessionId, hookType, toolName, message } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO logs (session_id, hook_type, tool_name, message)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(sessionId, hookType, toolName, message);
    
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error inserting log:', error);
    res.status(500).json({ error: 'Failed to insert log entry' });
  }
});

// Upload sound file
app.post('/api/sounds', upload.single('sound'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading sound:', error);
    res.status(500).json({ error: 'Failed to upload sound file' });
  }
});

// Get list of sound files
app.get('/api/sounds', (req, res) => {
  try {
    const files = fs.readdirSync(soundsDir)
      .filter(file => file.match(/\.(mp3|wav)$/i))
      .map(file => {
        const stats = fs.statSync(join(soundsDir, file));
        return {
          filename: file,
          size: stats.size,
          modified: stats.mtime
        };
      });
    
    res.json(files);
  } catch (error) {
    console.error('Error listing sounds:', error);
    res.status(500).json({ error: 'Failed to list sound files' });
  }
});

// Delete sound file
app.delete('/api/sounds/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = join(soundsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sound:', error);
    res.status(500).json({ error: 'Failed to delete sound file' });
  }
});

// Serve sound files
app.get('/api/sounds/play/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = join(soundsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving sound:', error);
    res.status(500).json({ error: 'Failed to serve sound file' });
  }
});

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(__dirname, '../frontend/dist/index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hotline backend running on http://0.0.0.0:${PORT}`);
  
  // Get network interfaces to display available URLs
  const interfaces = os.networkInterfaces();
  console.log('Frontend available at:');
  console.log(`  Local: http://localhost:${PORT}`);
  
  Object.keys(interfaces).forEach(name => {
    interfaces[name].forEach(iface => {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        return;
      }
      console.log(`  Network: http://${iface.address}:${PORT}`);
    });
  });
});