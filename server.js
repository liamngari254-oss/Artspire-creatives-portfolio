require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const CONTENT_PATH = path.join(__dirname, 'data', 'content.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'assets', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

if (!process.env.ADMIN_PASSWORD_HASH) {
  console.warn(
    '\n⚠️  ADMIN_PASSWORD_HASH is not set in .env — the admin login will not work.\n' +
    '   Run "npm run hash-password" to create one, then add it to your .env file.\n'
  );
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  cookieSession({
    name: 'artspire_session',
    secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    httpOnly: true,
    sameSite: 'lax',
  })
);

// ---------- helpers ----------

function readContent() {
  const raw = fs.readFileSync(CONTENT_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeContent(data) {
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(data, null, 2));
}

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Not signed in.' });
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${makeId('img')}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only image files are allowed.'), ok);
  },
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---------- auth routes ----------

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const validUser = username === process.env.ADMIN_USERNAME;
  const hash = process.env.ADMIN_PASSWORD_HASH || '';
  const validPass = hash && bcrypt.compareSync(password || '', hash);

  if (!validUser || !validPass) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get('/api/auth/check', (req, res) => {
  res.json({ isAdmin: Boolean(req.session && req.session.isAdmin) });
});

// ---------- public, read-only content ----------

app.get('/api/content', (req, res) => {
  try {
    res.json(readContent());
  } catch (err) {
    res.status(500).json({ error: 'Could not load content.' });
  }
});

// ---------- admin-only content editing ----------

// Replace whole top-level sections that are single objects (hero, about, cta, contact, whatWeDo)
app.put('/api/admin/section/:name', requireAuth, (req, res) => {
  const allowed = ['hero', 'about', 'cta', 'contact', 'whatWeDo'];
  const { name } = req.params;
  if (!allowed.includes(name)) {
    return res.status(400).json({ error: 'Unknown section.' });
  }
  const content = readContent();
  content[name] = req.body;
  writeContent(content);
  res.json({ ok: true, section: content[name] });
});

// Generic list helpers for: projects, caseStudies, testimonials, services, whyUs
const LIST_KEYS = {
  projects: 'proj',
  caseStudies: 'cs',
  testimonials: 't',
  services: 's',
  whyUs: 'w',
};

app.post('/api/admin/list/:listName', requireAuth, (req, res) => {
  const { listName } = req.params;
  if (!LIST_KEYS[listName]) return res.status(400).json({ error: 'Unknown list.' });
  const content = readContent();
  const item = { ...req.body, id: req.body.id || makeId(LIST_KEYS[listName]) };
  content[listName] = content[listName] || [];
  content[listName].push(item);
  writeContent(content);
  res.json({ ok: true, item });
});

app.put('/api/admin/list/:listName/:id', requireAuth, (req, res) => {
  const { listName, id } = req.params;
  if (!LIST_KEYS[listName]) return res.status(400).json({ error: 'Unknown list.' });
  const content = readContent();
  const list = content[listName] || [];
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found.' });
  list[idx] = { ...list[idx], ...req.body, id };
  writeContent(content);
  res.json({ ok: true, item: list[idx] });
});

app.delete('/api/admin/list/:listName/:id', requireAuth, (req, res) => {
  const { listName, id } = req.params;
  if (!LIST_KEYS[listName]) return res.status(400).json({ error: 'Unknown list.' });
  const content = readContent();
  const list = content[listName] || [];
  const next = list.filter((x) => x.id !== id);
  if (next.length === list.length) return res.status(404).json({ error: 'Item not found.' });
  content[listName] = next;
  writeContent(content);
  res.json({ ok: true });
});

app.put('/api/admin/list/:listName/:id/reorder', requireAuth, (req, res) => {
  const { listName } = req.params;
  const { direction, id } = { ...req.params, ...req.body };
  if (!LIST_KEYS[listName]) return res.status(400).json({ error: 'Unknown list.' });
  const content = readContent();
  const list = content[listName] || [];
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found.' });
  const swapWith = direction === 'up' ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return res.json({ ok: true, list });
  [list[idx], list[swapWith]] = [list[swapWith], list[idx]];
  content[listName] = list;
  writeContent(content);
  res.json({ ok: true, list });
});

// ---------- image upload (admin only) ----------

app.post('/api/admin/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image received.' });
  res.json({ ok: true, url: `/assets/uploads/${req.file.filename}` });
});

// Several images at once — used by the project gallery editor.
app.post('/api/admin/upload-many', requireAuth, upload.array('images', 24), (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No images received.' });
  res.json({ ok: true, urls: files.map((f) => `/assets/uploads/${f.filename}`) });
});

// ---------- error handler ----------

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`Artspire site running at http://localhost:${PORT}`);
  console.log(`Admin panel at http://localhost:${PORT}/admin`);
});
