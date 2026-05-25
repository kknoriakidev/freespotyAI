const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_PATH = path.join(__dirname, 'db.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initial = { tracks: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw || '{"tracks":[]}');
    if (!Array.isArray(parsed.tracks)) parsed.tracks = [];
    return parsed;
  } catch (err) {
    console.error('Failed to load DB, recreating:', err.message);
    const initial = { tracks: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function sanitizeName(name) {
  return String(name)
    .replace(/[^a-zA-Z0-9_.\-]/g, '_')
    .slice(0, 80);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    const base = sanitizeName(path.basename(file.originalname, ext)) || 'file';
    cb(null, `${ts}-${rand}-${base}${ext}`);
  }
});

const allowedAudio = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac']);
const allowedImage = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'audio' && allowedAudio.has(ext)) return cb(null, true);
  if (file.fieldname === 'cover' && allowedImage.has(ext)) return cb(null, true);
  cb(new Error(`Unsupported file type for field ${file.fieldname}: ${ext}`));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('Accept-Ranges', 'bytes');
  }
}));

app.use(express.static(PUBLIC_DIR));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/tracks', (req, res) => {
  const db = loadDB();
  const tracks = [...db.tracks].sort((a, b) => b.createdAt - a.createdAt);
  res.json({ tracks });
});

app.get('/api/tracks/:id', (req, res) => {
  const db = loadDB();
  const track = db.tracks.find(t => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  res.json({ track });
});

app.post('/api/upload', upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), (req, res) => {
  try {
    const { title, artist, album } = req.body;
    if (!req.files || !req.files.audio || !req.files.audio[0]) {
      return res.status(400).json({ error: 'Audio file is required' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const audioFile = req.files.audio[0];
    const coverFile = req.files.cover && req.files.cover[0];

    const db = loadDB();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const track = {
      id,
      title: title.trim().slice(0, 200),
      artist: (artist || 'Unknown Artist').trim().slice(0, 200),
      album: (album || '').trim().slice(0, 200),
      audioUrl: `/uploads/${audioFile.filename}`,
      coverUrl: coverFile ? `/uploads/${coverFile.filename}` : null,
      audioMime: audioFile.mimetype,
      coverMime: coverFile ? coverFile.mimetype : null,
      size: audioFile.size,
      createdAt: Date.now()
    };
    db.tracks.push(track);
    saveDB(db);
    res.status(201).json({ track });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

app.delete('/api/tracks/:id', (req, res) => {
  const db = loadDB();
  const idx = db.tracks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Track not found' });
  const [removed] = db.tracks.splice(idx, 1);
  saveDB(db);

  for (const url of [removed.audioUrl, removed.coverUrl]) {
    if (!url) continue;
    const filePath = path.join(UPLOADS_DIR, path.basename(url));
    fs.unlink(filePath, () => {});
  }
  res.json({ ok: true, removed });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Spotifree server running on http://localhost:${PORT}`);
  console.log(`Uploads directory: ${UPLOADS_DIR}`);
  console.log(`DB file: ${DB_PATH}`);
});
