const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR = path.join(__dirname, '..');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_FILE = path.join(__dirname, 'db.json');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ tracks: [] }, null, 2), 'utf-8');
}

function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.tracks || !Array.isArray(data.tracks)) {
      return { tracks: [] };
    }
    return data;
  } catch (err) {
    return { tracks: [] };
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${safeBase}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const ALLOWED_AUDIO = ['.mp3', '.wav', '.ogg', '.m4a'];
const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'track' && ALLOWED_AUDIO.includes(ext)) {
    cb(null, true);
  } else if (file.fieldname === 'cover' && ALLOWED_IMAGE.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for field "${file.fieldname}": ${ext}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));
app.use(express.static(PUBLIC_DIR));

app.post('/api/upload', (req, res) => {
  const uploader = upload.fields([
    { name: 'track', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]);

  uploader(req, res, function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || !req.files.track || req.files.track.length === 0) {
      return res.status(400).json({ error: 'Audio track file is required' });
    }

    const title = (req.body.title || '').trim() || 'Untitled';
    const author = (req.body.author || '').trim() || 'Unknown Artist';
    const album = (req.body.album || '').trim() || 'Single';

    const trackFile = req.files.track[0];
    const coverFile = req.files.cover && req.files.cover[0];

    const track = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      title,
      author,
      album,
      url: '/uploads/' + trackFile.filename,
      cover: coverFile ? '/uploads/' + coverFile.filename : null,
      createdAt: new Date().toISOString()
    };

    const db = readDb();
    db.tracks.unshift(track);
    writeDb(db);

    res.status(201).json(track);
  });
});

app.get('/api/tracks', (req, res) => {
  const db = readDb();
  res.json(db.tracks);
});

app.delete('/api/tracks/:id', (req, res) => {
  const db = readDb();
  const idx = db.tracks.findIndex(t => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Track not found' });
  }
  const [removed] = db.tracks.splice(idx, 1);
  writeDb(db);

  [removed.url, removed.cover].forEach(rel => {
    if (rel && rel.startsWith('/uploads/')) {
      const filePath = path.join(UPLOADS_DIR, path.basename(rel));
      fs.unlink(filePath, () => {});
    }
  });

  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`Spotifree server running at http://localhost:${PORT}`);
});

module.exports = { app, server };
