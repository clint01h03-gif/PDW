
// ========== PDW Core Script ==========
// Loading screen
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => loader.classList.add('hidden'), 700);
  }
});

// Mobile menu
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// Navbar scroll
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// ========== AUTH & HIDDEN LOGIN ==========
const AUTH_KEY = 'pdw_auth_users';
const SESSION_KEY = 'pdw_session';
const DB_CONFIG_KEY = 'pdw_db_config';

function getUsers() {
  try {
    const u = JSON.parse(localStorage.getItem(AUTH_KEY));
    if (u && Array.isArray(u) && u.length) return u;
  } catch {}
  // Default admin
  const defaults = [{ username: 'admin', password: 'pdw2026', role: 'admin' }];
  localStorage.setItem(AUTH_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveUsers(users) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, role: user.role }));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function isLoggedIn() {
  return !!getSession();
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// Create login modal if not present
function ensureLoginModal() {
  if (document.getElementById('pdwLoginModal')) return;

  const modal = document.createElement('div');
  modal.id = 'pdwLoginModal';
  modal.className = 'pdw-modal hidden';
  modal.innerHTML = `
    <div class="pdw-modal-backdrop"></div>
    <div class="pdw-modal-box">
      <button class="pdw-modal-close" id="loginCloseBtn" aria-label="Close">×</button>
      <div class="login-header">
        <div class="login-logo"><span>PDW</span></div>
        <h2>Admin Login</h2>
        <p>Hidden access – authorized only</p>
      </div>
      <form id="pdwLoginForm">
        <div class="form-group">
          <label for="loginUser">Username</label>
          <input type="text" id="loginUser" autocomplete="username" required placeholder="Enter username" />
        </div>
        <div class="form-group">
          <label for="loginPass">Password</label>
          <input type="password" id="loginPass" autocomplete="current-password" required placeholder="Enter password" />
        </div>
        <p id="loginError" class="login-error" style="display:none;"></p>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px;">Login</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  // Events
  modal.querySelector('.pdw-modal-backdrop').addEventListener('click', hideLogin);
  document.getElementById('loginCloseBtn').addEventListener('click', hideLogin);
  document.getElementById('pdwLoginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const err = document.getElementById('loginError');
    const users = getUsers();
    const found = users.find(u => u.username === user && u.password === pass);
    if (found) {
      setSession(found);
      err.style.display = 'none';
      hideLogin();
      window.location.href = 'admin.html';
    } else {
      err.textContent = 'Invalid username or password';
      err.style.display = 'block';
    }
  });
}

function showLogin() {
  ensureLoginModal();
  const modal = document.getElementById('pdwLoginModal');
  modal.classList.remove('hidden');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').style.display = 'none';
  setTimeout(() => document.getElementById('loginUser').focus(), 100);
}

function hideLogin() {
  const modal = document.getElementById('pdwLoginModal');
  if (modal) modal.classList.add('hidden');
}

// Double-click on logo opens hidden login (no page refresh)
document.addEventListener('DOMContentLoaded', () => {
  ensureLoginModal();
  document.querySelectorAll('.logo').forEach(logo => {
    let clickTimer = null;

    // Prevent normal link navigation; handle single vs double click ourselves
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (clickTimer) {
        // Second click of a double-click → cancel single-click action
        clearTimeout(clickTimer);
        clickTimer = null;
        return;
      }

      // Wait briefly to see if a second click (dblclick) comes
      clickTimer = setTimeout(() => {
        clickTimer = null;
        // Single click → go to Home (only if not already on index)
        const isHome = /index\.html?$|^\/?$|\/$/.test(window.location.pathname) ||
                       window.location.pathname.endsWith('/') ||
                       window.location.href.includes('index.html');
        if (!isHome) {
          window.location.href = 'index.html';
        }
      }, 280);
    });

    logo.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      // Double-click → admin system (login screen if needed)
      window.location.href = 'admin.html';
    });

    logo.style.cursor = 'pointer';
    logo.title = 'Double-click for admin login';
  });
});

// ========== INDEXED DB for Memories (images + videos) ==========
const DB_NAME = 'pdw_db';
const DB_VERSION = 1;
const STORE_MEMORIES = 'memories';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_MEMORIES)) {
        db.createObjectStore(STORE_MEMORIES, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllMemories() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEMORIES, 'readonly');
    const store = tx.objectStore(STORE_MEMORIES);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function addMemory(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEMORIES, 'readwrite');
    const store = tx.objectStore(STORE_MEMORIES);
    const req = store.add(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function updateMemory(id, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEMORIES, 'readwrite');
    const store = tx.objectStore(STORE_MEMORIES);
    const req = store.put({ ...item, id });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteMemory(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEMORIES, 'readwrite');
    const store = tx.objectStore(STORE_MEMORIES);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function clearAllMemories() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEMORIES, 'readwrite');
    const store = tx.objectStore(STORE_MEMORIES);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Migrate old localStorage memories if any
async function migrateOldMemories() {
  try {
    const old = JSON.parse(localStorage.getItem('pdw_memories') || '[]');
    if (!old.length) return;
    const existing = await getAllMemories();
    if (existing.length) return;
    for (const src of old) {
      if (typeof src === 'string') {
        await addMemory({ type: 'image', data: src, created: Date.now() });
      }
    }
    localStorage.removeItem('pdw_memories');
  } catch (e) {
    console.warn('Migration skip', e);
  }
}

if (typeof indexedDB !== 'undefined') {
  migrateOldMemories();
}

// ========== SECRET KEYWORD: type "halfan" + Enter → open admin system ==========
(function () {
  let buffer = '';
  let timer = null;
  const SECRET = 'halfan';

  function clearBuffer() {
    buffer = '';
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  document.addEventListener('keydown', (e) => {
    // Ignore when typing inside inputs, textareas, selects, contenteditable
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
      return;
    }

    // Enter after typing the secret word
    if (e.key === 'Enter') {
      if (buffer.toLowerCase() === SECRET) {
        e.preventDefault();
        clearBuffer();
        // Already on admin page → stay
        if (window.location.pathname.includes('admin.html') || window.location.href.includes('admin.html')) {
          return;
        }
        window.location.href = 'admin.html';
      } else {
        clearBuffer();
      }
      return;
    }

    // Only letters (build the word)
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      buffer += e.key.toLowerCase();
      // Keep only last N chars (secret length)
      if (buffer.length > SECRET.length) {
        buffer = buffer.slice(-SECRET.length);
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(clearBuffer, 2500); // reset if too slow
    } else if (e.key === 'Backspace') {
      buffer = buffer.slice(0, -1);
    } else if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') {
      // Other keys reset
      if (e.key !== 'Enter') clearBuffer();
    }
  });
})();

// ========== FIREBASE HELPERS (shared) ==========
window.PDWFirebase = (function () {
  const CFG_KEY = 'pdw_firebase_config';
  let connected = false;
  let db = null;
  let storage = null;

  // ===== HARDCODED FIREBASE CONFIG (எல்லா device-லும் automatic) =====
  const HARDCODED = {
    mode: 'firebase',
    apiKey: 'AIzaSyBAV1pynjN5jdKYb5ALJIbfVzauoKLDC10',
    authDomain: 'pdw-2026-36f6e.firebaseapp.com',
    projectId: 'pdw-2026-36f6e',
    storageBucket: 'pdw-2026-36f6e.firebasestorage.app',
    messagingSenderId: '1011814997667',
    appId: '1:1011814997667:web:96a8a3906a3e9f27c96916'
  };

  function getConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
      // Always force firebase mode + hardcoded values (so every device works)
      return { ...HARDCODED, ...saved, mode: 'firebase',
        apiKey: HARDCODED.apiKey,
        authDomain: HARDCODED.authDomain,
        projectId: HARDCODED.projectId,
        storageBucket: HARDCODED.storageBucket,
        messagingSenderId: HARDCODED.messagingSenderId,
        appId: HARDCODED.appId
      };
    } catch {
      return { ...HARDCODED };
    }
  }

  function saveConfig(cfg) {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  }

  function isFileProtocol() {
    return location.protocol === 'file:';
  }

  async function connect(cfg) {
    cfg = cfg || getConfig();
    // Force hardcoded if missing
    if (!cfg.apiKey || !cfg.projectId) {
      cfg = getConfig();
    }
    if (!cfg.apiKey || !cfg.projectId) {
      connected = false;
      db = null;
      storage = null;
      return { ok: false, error: 'Missing apiKey or projectId' };
    }
    if (typeof firebase === 'undefined') {
      return { ok: false, error: 'Firebase SDK not loaded' };
    }
    try {
      if (firebase.apps && firebase.apps.length) {
        // reuse existing app if same project
        try {
          const existing = firebase.app();
          if (existing.options.projectId !== cfg.projectId) {
            await existing.delete();
            firebase.initializeApp({
              apiKey: cfg.apiKey,
              authDomain: cfg.authDomain || (cfg.projectId + '.firebaseapp.com'),
              projectId: cfg.projectId,
              storageBucket: cfg.storageBucket || (cfg.projectId + '.appspot.com'),
              messagingSenderId: cfg.messagingSenderId || '',
              appId: cfg.appId || ''
            });
          }
        } catch {
          firebase.initializeApp({
            apiKey: cfg.apiKey,
            authDomain: cfg.authDomain || (cfg.projectId + '.firebaseapp.com'),
            projectId: cfg.projectId,
            storageBucket: cfg.storageBucket || (cfg.projectId + '.appspot.com'),
            messagingSenderId: cfg.messagingSenderId || '',
            appId: cfg.appId || ''
          });
        }
      } else {
        firebase.initializeApp({
          apiKey: cfg.apiKey,
          authDomain: cfg.authDomain || (cfg.projectId + '.firebaseapp.com'),
          projectId: cfg.projectId,
          storageBucket: cfg.storageBucket || (cfg.projectId + '.appspot.com'),
          messagingSenderId: cfg.messagingSenderId || '',
          appId: cfg.appId || ''
        });
      }
      db = firebase.firestore();
      storage = firebase.storage();
      // Real write test (not just read)
      const testRef = db.collection('memories').doc('_connection_test');
      await testRef.set({ ping: true, at: Date.now() });
      await testRef.delete();
      connected = true;
      cfg.mode = 'firebase';
      saveConfig(cfg);
      return { ok: true };
    } catch (e) {
      console.error('Firebase connect error', e);
      connected = false;
      db = null;
      storage = null;
      let msg = e.message || String(e);
      if (msg.includes('permission') || msg.includes('PERMISSION') || e.code === 'permission-denied') {
        msg = 'Permission denied. Firestore Rules must allow read/write (use test mode).';
      }
      return { ok: false, error: msg };
    }
  }

  async function listMemories() {
    if (!connected || !db) return null; // signal: use local
    try {
      // NO orderBy — avoids composite index issues; sort in JS
      const snap = await db.collection('memories').get();
      const list = snap.docs
        .filter(d => d.id !== '_connection_test')
        .map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.created || 0) - (a.created || 0));
      return list;
    } catch (e) {
      console.error('listMemories', e);
      throw e;
    }
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // Compress image so Firestore embed always works fast (no hang)
  async function compressImage(file, maxSide, quality) {
    maxSide = maxSide || 1280;
    quality = quality || 0.82;
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.width, h = img.height;
        if (w > maxSide || h > maxSide) {
          if (w > h) { h = Math.round(h * maxSide / w); w = maxSide; }
          else { w = Math.round(w * maxSide / h); h = maxSide; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('compress failed'));
          resolve(new File([blob], (file.name || 'photo').replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
      img.src = url;
    });
  }

  async function addMemory(type, file) {
    if (!connected || !db) throw new Error('Firebase not connected');

    const created = Date.now();
    const name = file.name || 'file';

    // ===== IMAGES: fast Firestore embed (no Storage hang) =====
    if (type === 'image') {
      try {
        let uploadFile = file;
        if (file.size > 200 * 1024 || !(file.type || '').includes('jpeg')) {
          uploadFile = await compressImage(file, 1280, 0.8);
        }
        if (uploadFile.size > 900 * 1024) {
          uploadFile = await compressImage(file, 960, 0.7);
        }
        let dataUrl = await readFileAsDataURL(uploadFile);
        if (dataUrl.length > 900000) {
          uploadFile = await compressImage(file, 720, 0.6);
          dataUrl = await readFileAsDataURL(uploadFile);
        }
        const docRef = await db.collection('memories').add({
          type, data: dataUrl, created, name, source: 'firestore-embed'
        });
        return docRef.id;
      } catch (embedErr) {
        console.warn('Firestore embed failed, trying Storage', embedErr);
      }
    }

    // ===== Storage (videos + image fallback) with 15s timeout =====
    if (storage) {
      try {
        if (isFileProtocol()) {
          throw new Error('Open site via http://localhost or hosting — file:// blocks Storage uploads');
        }
        const path = 'memories/' + created + '_' + name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const ref = storage.ref(path);
        const putPromise = ref.put(file, { contentType: file.type || (type === 'video' ? 'video/mp4' : 'image/jpeg') });
        await Promise.race([
          putPromise,
          new Promise((_, rej) => setTimeout(() => rej(new Error('Storage upload timeout')), 15000))
        ]);
        const url = await ref.getDownloadURL();
        const docRef = await db.collection('memories').add({
          type, data: url, storagePath: path, created, name, source: 'storage'
        });
        return docRef.id;
      } catch (storageErr) {
        console.warn('Storage upload failed', storageErr);
        if (type === 'image') {
          try {
            const small = await compressImage(file, 640, 0.55);
            const dataUrl = await readFileAsDataURL(small);
            const docRef = await db.collection('memories').add({
              type, data: dataUrl, created, name, source: 'firestore-embed',
              storageError: (storageErr && storageErr.message) || 'storage failed'
            });
            return docRef.id;
          } catch (_) {}
        }
        let msg = (storageErr && storageErr.message) || String(storageErr);
        if (msg.includes('permission') || (storageErr && storageErr.code === 'storage/unauthorized')) {
          msg = 'Storage permission denied. Set Storage Rules to allow write in test mode.';
        }
        if (msg.includes('cors') || msg.includes('CORS') || isFileProtocol()) {
          msg = 'Storage blocked. Host the site, do not open as file://';
        }
        if (msg.includes('timeout')) {
          msg = 'Upload timeout. Try a smaller photo, or set Storage Rules in Firebase Console.';
        }
        throw new Error(msg);
      }
    }

    throw new Error('Could not save photo. Check Firebase connection.');
  }

  async function deleteMemory(id, storagePath) {
    if (!connected || !db) throw new Error('Firebase not connected');
    await db.collection('memories').doc(String(id)).delete();
    if (storagePath && storage) {
      try { await storage.ref(storagePath).delete(); } catch (e) { console.warn(e); }
    }
  }

  async function clearAll() {
    if (!connected || !db) throw new Error('Firebase not connected');
    const snap = await db.collection('memories').get();
    const batch = db.batch();
    snap.docs.forEach(d => {
      if (d.id !== '_connection_test') batch.delete(d.ref);
    });
    await batch.commit();
  }

  return {
    getConfig,
    saveConfig,
    connect,
    isConnected: () => connected,
    getDb: () => db,
    listMemories,
    addMemory,
    deleteMemory,
    clearAll,
    isFileProtocol
  };
})();
