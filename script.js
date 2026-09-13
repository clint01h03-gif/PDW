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
