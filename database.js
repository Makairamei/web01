// ============================================================
// CloudStream Premium — Database Layer
// Production-grade SQLite with sql.js (pure JS)
// ============================================================

const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'premium.db');
let db;

// ============================================================
// sql.js HELPER — synchronous-like wrapper
// ============================================================

function run(sql, params = []) {
    db.run(sql, params);
    saveDB();
}

function get(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    let result = null;
    if (stmt.step()) {
        result = stmt.getAsObject();
    }
    stmt.free();
    return result;
}

function all(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function saveDB() {
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    } catch (e) {
        console.error('DB save error:', e.message);
    }
}

// Debounced save for batch operations
let saveTimer = null;
function debouncedSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDB, 500);
}

function runNoSave(sql, params = []) {
    db.run(sql, params);
}

// ============================================================
// INITIALIZATION
// ============================================================

async function initDatabase() {
    const SQL = await initSqlJs();

    // Load existing DB or create new
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    // Enable foreign keys
    db.run("PRAGMA foreign_keys = ON");

    // --- SCHEMA ---

    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT UNIQUE NOT NULL,
        name TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked','expired')),
        expires_at DATETIME NOT NULL,
        max_devices INTEGER NOT NULL DEFAULT 2,
        note TEXT DEFAULT '',
        deleted_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT NOT NULL,
        device_id TEXT NOT NULL,
        device_name TEXT DEFAULT '',
        ip_address TEXT DEFAULT '',
        is_blocked INTEGER DEFAULT 0,
        first_seen_action TEXT DEFAULT 'UNKNOWN',
        first_seen DATETIME DEFAULT (datetime('now')),
        last_seen DATETIME DEFAULT (datetime('now')),
        UNIQUE(license_key, device_id)
    )`);
    // Migration: add first_seen_action to existing tables
    try { db.run(`ALTER TABLE devices ADD COLUMN first_seen_action TEXT DEFAULT 'UNKNOWN'`); } catch (_) { }

    // Device tokens: each slot gets a unique URL token
    // URL format: /r/{license_key}/{token}/repo.json
    db.run(`CREATE TABLE IF NOT EXISTS device_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        label TEXT DEFAULT '',
        ip_address TEXT DEFAULT '',
        is_blocked INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now')),
        last_seen DATETIME DEFAULT NULL
    )`);
    try { db.run(`ALTER TABLE device_tokens ADD COLUMN ip_address TEXT DEFAULT ''`); } catch (_) { }
    try { db.run(`ALTER TABLE device_tokens ADD COLUMN last_seen DATETIME DEFAULT NULL`); } catch (_) { }

    db.run(`CREATE TABLE IF NOT EXISTS plugin_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT NOT NULL,
        device_id TEXT DEFAULT '',
        plugin_name TEXT NOT NULL,
        action TEXT DEFAULT 'OPEN',
        ip_address TEXT DEFAULT '',
        used_at DATETIME DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS playback_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT NOT NULL,
        device_id TEXT DEFAULT '',
        plugin_name TEXT NOT NULL,
        video_title TEXT NOT NULL,
        source_provider TEXT DEFAULT '',
        ip_address TEXT DEFAULT '',
        played_at DATETIME DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT DEFAULT '',
        device_id TEXT DEFAULT '',
        action TEXT NOT NULL,
        ip_address TEXT DEFAULT '',
        details TEXT DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now'))
    )`);

    // Migration: add device_id to access_logs if missing (for existing databases)
    try { db.run(`ALTER TABLE access_logs ADD COLUMN device_id TEXT DEFAULT ''`); } catch (_) { }

    db.run(`CREATE TABLE IF NOT EXISTS admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_username TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT DEFAULT '',
        ip_address TEXT DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        url TEXT UNIQUE NOT NULL,
        plugin_count INTEGER DEFAULT 0,
        last_checked DATETIME DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS failed_logins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        attempt_count INTEGER DEFAULT 1,
        last_attempt DATETIME DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS blocked_ips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT UNIQUE NOT NULL,
        reason TEXT DEFAULT '',
        created_at DATETIME DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )`);

    // --- INDEXES ---
    db.run(`CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_devices_key ON devices(license_key)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_devices_device ON devices(device_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_device_tokens_key ON device_tokens(license_key)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_plugin_usage_key ON plugin_usage(license_key)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_playback_key ON playback_logs(license_key)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_access_logs_key ON access_logs(license_key)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_blocked_ips ON blocked_ips(ip_address)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_admin_logs_user ON admin_logs(admin_username)`);

    // --- DEFAULT ADMIN ---
    const adminCount = get('SELECT COUNT(*) as c FROM admins');
    if (!adminCount || adminCount.c === 0) {
        const hash = bcrypt.hashSync('admin123', 12);
        run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', hash]);
        console.log('  Default admin created: admin / admin123');
    }

    // --- DEFAULT SETTINGS ---
    if (!getSetting('server_url')) setSetting('server_url', 'http://localhost:3000');

    saveDB();
    console.log('  Database initialized');
}

// ============================================================
// SETTINGS
// ============================================================

function getSetting(key) {
    const row = get('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
}

function setSetting(key, value) {
    run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
}

function getAllSettings() {
    return all('SELECT * FROM settings');
}

// ============================================================
// LICENSE KEY GENERATION
// ============================================================

function generateKey(prefix = 'CS') {
    const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}-${seg()}-${seg()}-${seg()}-${seg()}`;
}

// ============================================================
// LICENSE CRUD
// ============================================================

function createLicense({ durationDays = 30, name = '', note = '', maxDevices = 2 }) {
    const key = generateKey();
    const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
    run(`INSERT INTO licenses (license_key, name, status, expires_at, max_devices, note) VALUES (?, ?, 'active', ?, ?, ?)`,
        [key, name, expiresAt, maxDevices, note]);
    return { key, expires_at: expiresAt };
}

function createBulkLicenses({ count = 1, durationDays = 30, maxDevices = 2, note = '' }) {
    const keys = [];
    const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
    for (let i = 0; i < count; i++) {
        const key = generateKey();
        runNoSave(`INSERT INTO licenses (license_key, name, status, expires_at, max_devices, note) VALUES (?, '', 'active', ?, ?, ?)`,
            [key, expiresAt, maxDevices, note]);
        keys.push(key);
    }
    saveDB();
    return keys;
}

function getLicensesPaginated(page = 1, limit = 20, search = '', status = '', trashed = false) {
    const offset = (page - 1) * limit;
    let whereClauses = [];
    let params = [];

    if (trashed) {
        whereClauses.push('deleted_at IS NOT NULL');
    } else {
        whereClauses.push('deleted_at IS NULL');
    }

    if (search) {
        whereClauses.push("(license_key LIKE ? OR name LIKE ? OR note LIKE ?)");
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
        whereClauses.push('status = ?');
        params.push(status);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const total = get(`SELECT COUNT(*) as c FROM licenses ${where}`, params);
    const rows = all(`SELECT * FROM licenses ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);

    // Attach device count
    rows.forEach(r => {
        const dc = get('SELECT COUNT(*) as c FROM devices WHERE license_key = ?', [r.license_key]);
        r.device_count = dc?.c || 0;
    });

    return { licenses: rows, total: total?.c || 0, page, limit };
}

function getLicenseByKey(key) {
    return get('SELECT * FROM licenses WHERE license_key = ? AND deleted_at IS NULL', [key]);
}

function getLicenseById(id) {
    return get('SELECT * FROM licenses WHERE id = ?', [id]);
}

function updateLicenseStatus(id, status) {
    run('UPDATE licenses SET status = ? WHERE id = ?', [status, id]);
}

function updateLicense(id, { name, note, maxDevices, expiresAt, status }) {
    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (note !== undefined) { fields.push('note = ?'); params.push(note); }
    if (maxDevices !== undefined) { fields.push('max_devices = ?'); params.push(maxDevices); }
    if (expiresAt !== undefined) { fields.push('expires_at = ?'); params.push(expiresAt); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (fields.length === 0) return;
    params.push(id);
    run(`UPDATE licenses SET ${fields.join(', ')} WHERE id = ?`, params);
}

function softDeleteLicense(id) {
    run("UPDATE licenses SET deleted_at = datetime('now') WHERE id = ?", [id]);
}

function restoreLicense(id) {
    run('UPDATE licenses SET deleted_at = NULL WHERE id = ?', [id]);
}

function forceDeleteLicense(id) {
    const lic = getLicenseById(id);
    if (!lic) return;
    runNoSave('DELETE FROM devices WHERE license_key = ?', [lic.license_key]);
    runNoSave('DELETE FROM plugin_usage WHERE license_key = ?', [lic.license_key]);
    runNoSave('DELETE FROM playback_logs WHERE license_key = ?', [lic.license_key]);
    runNoSave('DELETE FROM access_logs WHERE license_key = ?', [lic.license_key]);
    run('DELETE FROM licenses WHERE id = ?', [id]);
}

function getLicenseDetails(id) {
    const lic = getLicenseById(id);
    if (!lic) return null;
    const devices = all('SELECT * FROM devices WHERE license_key = ? ORDER BY last_seen DESC', [lic.license_key]);
    const recentLogs = all(`SELECT al.*, d.device_name FROM access_logs al
        LEFT JOIN devices d ON al.license_key = d.license_key AND al.device_id = d.device_id
        WHERE al.license_key = ? ORDER BY al.created_at DESC LIMIT 50`, [lic.license_key]);
    const pluginUsage = all(`SELECT pu.*, d.device_name FROM plugin_usage pu
        LEFT JOIN devices d ON pu.license_key = d.license_key AND pu.device_id = d.device_id
        WHERE pu.license_key = ? ORDER BY pu.used_at DESC LIMIT 50`, [lic.license_key]);
    const playbackLogs = all(`SELECT pl.*, d.device_name FROM playback_logs pl
        LEFT JOIN devices d ON pl.license_key = d.license_key AND pl.device_id = d.device_id
        WHERE pl.license_key = ? ORDER BY pl.played_at DESC LIMIT 50`, [lic.license_key]);
    return { ...lic, devices, recentLogs, pluginUsage, playbackLogs };
}

// ============================================================
// LICENSE VALIDATION
// ============================================================

function validateLicense(key, ip = '', deviceId = '', deviceName = '', firstSeenAction = 'UNKNOWN') {
    // Only device blocking applies now, IP tracking is only for logging
    const lic = getLicenseByKey(key);
    if (!lic) return { valid: false, reason: 'not_found' };
    if (lic.status === 'revoked') return { valid: false, reason: 'revoked' };

    // Check / auto-expire
    const now = new Date();
    const expiry = new Date(lic.expires_at);
    if (now > expiry) {
        if (lic.status !== 'expired') {
            run("UPDATE licenses SET status = 'expired' WHERE id = ?", [lic.id]);
        }
        return { valid: false, reason: 'expired', license: lic };
    }

    // Device handling
    let isNewDevice = false;
    if (deviceId) {
        const existing = get('SELECT * FROM devices WHERE license_key = ? AND device_id = ?', [key, deviceId]);
        if (existing) {
            if (existing.is_blocked) return { valid: false, reason: 'device_blocked' };
            run("UPDATE devices SET last_seen = datetime('now'), ip_address = ? WHERE id = ?", [ip, existing.id]);
        } else {
            // Check device limit
            const countRow = get('SELECT COUNT(*) as c FROM devices WHERE license_key = ?', [key]);
            const currentCount = countRow?.c || 0;
            if (lic.max_devices > 0 && currentCount >= lic.max_devices) {
                return { valid: false, reason: 'max_devices', license: lic };
            }
            const autoDeviceName = deviceName && deviceName.trim() ? deviceName.trim().substring(0, 200) : `Device ${currentCount + 1}`;
            run('INSERT INTO devices (license_key, device_id, device_name, ip_address, first_seen_action) VALUES (?, ?, ?, ?, ?)',
                [key, deviceId, autoDeviceName, ip, firstSeenAction || 'UNKNOWN']);
            isNewDevice = true;
        }
    }

    const daysLeft = Math.ceil((expiry - now) / 86400000);
    return { valid: true, license: lic, daysLeft, isNewDevice };
}

// Get a specific device record without creating it
function getDeviceByDeviceId(licenseKey, deviceId) {
    return get('SELECT * FROM devices WHERE license_key = ? AND device_id = ?', [licenseKey, deviceId]);
}

// ============================================================
// DEVICE MANAGEMENT
// ============================================================

function getDevicesPaginated(page = 1, limit = 20, search = '') {
    const offset = (page - 1) * limit;
    let where = '';
    let params = [];
    if (search) {
        where = 'WHERE d.device_id LIKE ? OR d.device_name LIKE ? OR d.license_key LIKE ? OR d.ip_address LIKE ?';
        params = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];
    }
    const total = get(`SELECT COUNT(*) as c FROM devices d ${where}`, params);
    const rows = all(`SELECT d.*, l.name as license_name, l.status as license_status FROM devices d LEFT JOIN licenses l ON d.license_key = l.license_key ${where} ORDER BY d.last_seen DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { devices: rows, total: total?.c || 0, page, limit };
}

function blockDevice(id) {
    run('UPDATE devices SET is_blocked = 1 WHERE id = ?', [id]);
}

function unblockDevice(id) {
    run('UPDATE devices SET is_blocked = 0 WHERE id = ?', [id]);
}

function deleteDevice(id) {
    run('DELETE FROM devices WHERE id = ?', [id]);
}

function renameDevice(id, name) {
    run('UPDATE devices SET device_name = ? WHERE id = ?', [name, id]);
}

// Replace a temporary IP-based device with the real Android device ID.
// repo.json creates a temp device (ip_xxx) so it shows immediately in admin panel,
// then check-ip provides the real device_id (permanent Android ID) and we swap it.
function replaceTemporaryDevice(licenseKey, tempDeviceId, realDeviceId, ip) {
    if (!tempDeviceId || !realDeviceId || tempDeviceId === realDeviceId) return;

    // Check if real device already exists for this license
    const realExisting = get('SELECT * FROM devices WHERE license_key = ? AND device_id = ?', [licenseKey, realDeviceId]);
    if (realExisting) {
        // Real device already registered — just delete the temp one
        run('DELETE FROM devices WHERE license_key = ? AND device_id = ?', [licenseKey, tempDeviceId]);
        // Update real device's last_seen and IP
        run("UPDATE devices SET last_seen = datetime('now'), ip_address = ? WHERE id = ?", [ip, realExisting.id]);
        return;
    }

    // Real device doesn't exist yet — upgrade the temp device to the real one
    const tempExisting = get('SELECT * FROM devices WHERE license_key = ? AND device_id = ?', [licenseKey, tempDeviceId]);
    if (tempExisting) {
        run("UPDATE devices SET device_id = ?, device_name = ?, last_seen = datetime('now'), ip_address = ? WHERE id = ?",
            [realDeviceId, `Android (${realDeviceId.substring(0, 6)})`, ip, tempExisting.id]);
    }
}

// ============================================================
// DEVICE TOKEN MANAGEMENT (URL-based per-device access)
// ============================================================

function generateDeviceToken() {
    return crypto.randomBytes(12).toString('hex'); // 24-char hex token
}

function createDeviceToken(licenseKey, label = '') {
    const token = generateDeviceToken();
    run('INSERT INTO device_tokens (license_key, token, label) VALUES (?, ?, ?)', [licenseKey, token, label || `Device ${Date.now()}`]);
    return token;
}

function getDeviceTokensByLicense(licenseKey) {
    return all('SELECT * FROM device_tokens WHERE license_key = ? ORDER BY created_at DESC', [licenseKey]);
}

function getDeviceToken(token) {
    return get('SELECT * FROM device_tokens WHERE token = ?', [token]);
}

function validateDeviceToken(licenseKey, token, ip = '') {
    const dt = get('SELECT * FROM device_tokens WHERE token = ? AND license_key = ?', [token, licenseKey]);
    if (!dt) return { valid: false, reason: 'invalid_token' };
    if (dt.is_blocked) return { valid: false, reason: 'device_blocked' };
    // Update last seen + IP
    run("UPDATE device_tokens SET last_seen = datetime('now'), ip_address = ? WHERE id = ?", [ip, dt.id]);
    return { valid: true, token: dt };
}

function blockDeviceToken(id) {
    run('UPDATE device_tokens SET is_blocked = 1 WHERE id = ?', [id]);
}

function unblockDeviceToken(id) {
    run('UPDATE device_tokens SET is_blocked = 0 WHERE id = ?', [id]);
}

function deleteDeviceToken(id) {
    run('DELETE FROM device_tokens WHERE id = ?', [id]);
}

function renameDeviceToken(id, label) {
    run('UPDATE device_tokens SET label = ? WHERE id = ?', [label, id]);
}

function getDeviceTokenCount(licenseKey) {
    return get('SELECT COUNT(*) as c FROM device_tokens WHERE license_key = ?', [licenseKey])?.c || 0;
}


// ============================================================
// PLUGIN USAGE TRACKING
// ============================================================

function trackPluginUsage(licenseKey, deviceId, pluginName, action, ip) {
    run('INSERT INTO plugin_usage (license_key, device_id, plugin_name, action, ip_address) VALUES (?, ?, ?, ?, ?)', [licenseKey, deviceId, pluginName, action || 'OPEN', ip]);
}

function getPluginUsagePaginated(page = 1, limit = 50, search = '') {
    const offset = (page - 1) * limit;
    let where = '';
    let params = [];
    if (search) {
        where = 'WHERE (pu.plugin_name LIKE ? OR pu.license_key LIKE ? OR pu.action LIKE ? OR d.device_name LIKE ?)';
        params = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];
    }
    const total = get(`SELECT COUNT(*) as c FROM plugin_usage pu LEFT JOIN devices d ON pu.license_key = d.license_key AND pu.device_id = d.device_id ${where}`, params);
    const rows = all(`SELECT pu.*, d.device_name, l.name as license_name FROM plugin_usage pu
        LEFT JOIN devices d ON pu.license_key = d.license_key AND pu.device_id = d.device_id
        LEFT JOIN licenses l ON pu.license_key = l.license_key
        ${where} ORDER BY pu.used_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { logs: rows, total: total?.c || 0, page, limit };
}

// ============================================================
// PLAYBACK TRACKING
// ============================================================

function trackPlayback(licenseKey, deviceId, pluginName, videoTitle, sourceProvider, ip) {
    run('INSERT INTO playback_logs (license_key, device_id, plugin_name, video_title, source_provider, ip_address) VALUES (?, ?, ?, ?, ?, ?)', [licenseKey, deviceId, pluginName, videoTitle, sourceProvider || '', ip]);
}

function getPlaybackLogsPaginated(page = 1, limit = 50, search = '') {
    const offset = (page - 1) * limit;
    let where = '';
    let params = [];
    if (search) {
        where = 'WHERE (pl.video_title LIKE ? OR pl.plugin_name LIKE ? OR pl.source_provider LIKE ? OR pl.license_key LIKE ? OR d.device_name LIKE ?)';
        params = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];
    }
    const total = get(`SELECT COUNT(*) as c FROM playback_logs pl LEFT JOIN devices d ON pl.license_key = d.license_key AND pl.device_id = d.device_id ${where}`, params);
    const rows = all(`SELECT pl.*, d.device_name, l.name as license_name FROM playback_logs pl
        LEFT JOIN devices d ON pl.license_key = d.license_key AND pl.device_id = d.device_id
        LEFT JOIN licenses l ON pl.license_key = l.license_key
        ${where} ORDER BY pl.played_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { logs: rows, total: total?.c || 0, page, limit };
}

// ============================================================
// ACCESS LOGS
// ============================================================

function logAccess(key, action, ip = '', details = '', deviceId = '') {
    run('INSERT INTO access_logs (license_key, device_id, action, ip_address, details) VALUES (?, ?, ?, ?, ?)', [key || '', deviceId || '', action, ip, details]);
}

function getAccessLogsPaginated(page = 1, limit = 50, search = '', action = '') {
    const offset = (page - 1) * limit;
    let whereClauses = [];
    let params = [];
    if (search) {
        whereClauses.push('(al.license_key LIKE ? OR al.details LIKE ? OR al.ip_address LIKE ? OR d.device_name LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (action) {
        whereClauses.push('al.action = ?');
        params.push(action);
    }
    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const total = get(`SELECT COUNT(*) as c FROM access_logs al LEFT JOIN devices d ON al.license_key = d.license_key AND al.device_id = d.device_id ${where}`, params);
    const rows = all(`SELECT al.*, d.device_name, l.name as license_name FROM access_logs al
        LEFT JOIN devices d ON al.license_key = d.license_key AND al.device_id = d.device_id
        LEFT JOIN licenses l ON al.license_key = l.license_key
        ${where} ORDER BY al.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { logs: rows, total: total?.c || 0, page, limit };
}

// ============================================================
// ADMIN LOGS
// ============================================================

function logAdminAction(username, action, details = '', ip = '') {
    run('INSERT INTO admin_logs (admin_username, action, details, ip_address) VALUES (?, ?, ?, ?)', [username || 'system', action, details, ip]);
}

function getAdminLogsPaginated(page = 1, limit = 50, search = '') {
    const offset = (page - 1) * limit;
    let whereClauses = [];
    let params = [];
    if (search) {
        whereClauses.push('(admin_username LIKE ? OR action LIKE ? OR details LIKE ? OR ip_address LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const total = get(`SELECT COUNT(*) as c FROM admin_logs ${where}`, params);
    const rows = all(`SELECT * FROM admin_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    return { logs: rows, total: total?.c || 0, page, limit };
}

// ============================================================
// SECURITY — FAILED LOGINS
// ============================================================

function recordFailedLogin(ip) {
    const existing = get('SELECT * FROM failed_logins WHERE ip_address = ?', [ip]);
    if (existing) {
        run("UPDATE failed_logins SET attempt_count = attempt_count + 1, last_attempt = datetime('now') WHERE id = ?", [existing.id]);
        if (existing.attempt_count + 1 >= 5) {
            blockIP(ip, 'Brute force: too many failed login attempts');
        }
    } else {
        run('INSERT INTO failed_logins (ip_address) VALUES (?)', [ip]);
    }
}

function clearFailedLogins(ip) {
    run('DELETE FROM failed_logins WHERE ip_address = ?', [ip]);
}

function getFailedLogins() {
    return all('SELECT * FROM failed_logins ORDER BY last_attempt DESC LIMIT 100');
}

// ============================================================
// SECURITY — IP BLOCKING
// ============================================================

function blockIP(ip, reason = '') {
    try {
        run('INSERT OR IGNORE INTO blocked_ips (ip_address, reason) VALUES (?, ?)', [ip, reason]);
    } catch (_) { }
}

function unblockIP(ip) {
    run('DELETE FROM blocked_ips WHERE ip_address = ?', [ip]);
}

function getBlockedIPs() {
    return all('SELECT * FROM blocked_ips ORDER BY created_at DESC');
}

function isIPBlocked(ip) {
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return false;
    return !!get('SELECT 1 as b FROM blocked_ips WHERE ip_address = ?', [ip]);
}

// ============================================================
// ADMIN AUTH
// ============================================================

function getAdminByUsername(username) {
    return get('SELECT * FROM admins WHERE username = ?', [username]);
}

function updateAdminPassword(id, newHash) {
    run('UPDATE admins SET password_hash = ? WHERE id = ?', [newHash, id]);
}

// ============================================================
// DASHBOARD STATISTICS
// ============================================================

function getDashboardStats() {
    const totalLicenses = get("SELECT COUNT(*) as c FROM licenses WHERE deleted_at IS NULL")?.c || 0;
    const activeLicenses = get("SELECT COUNT(*) as c FROM licenses WHERE status = 'active' AND deleted_at IS NULL")?.c || 0;
    const expiredLicenses = get("SELECT COUNT(*) as c FROM licenses WHERE status = 'expired' AND deleted_at IS NULL")?.c || 0;
    const revokedLicenses = get("SELECT COUNT(*) as c FROM licenses WHERE status = 'revoked' AND deleted_at IS NULL")?.c || 0;
    const totalDevices = get("SELECT COUNT(*) as c FROM devices")?.c || 0;
    const activeDevices = get("SELECT COUNT(*) as c FROM devices WHERE last_seen > datetime('now', '-1 hour')")?.c || 0;
    const totalPluginEvents = get("SELECT COUNT(*) as c FROM plugin_usage")?.c || 0;
    const totalPlaybacks = get("SELECT COUNT(*) as c FROM playback_logs")?.c || 0;
    const todayPluginEvents = get("SELECT COUNT(*) as c FROM plugin_usage WHERE used_at > datetime('now', '-1 day')")?.c || 0;
    const todayPlaybacks = get("SELECT COUNT(*) as c FROM playback_logs WHERE played_at > datetime('now', '-1 day')")?.c || 0;

    // Top plugins (last 7 days)
    const topPlugins = all("SELECT plugin_name, COUNT(*) as count FROM plugin_usage WHERE used_at > datetime('now', '-7 days') GROUP BY plugin_name ORDER BY count DESC LIMIT 10");

    // Top source providers (last 7 days)
    const topSources = all("SELECT source_provider, COUNT(*) as count FROM playback_logs WHERE played_at > datetime('now', '-7 days') AND source_provider != '' GROUP BY source_provider ORDER BY count DESC LIMIT 10");

    // Recent activity
    const recentActivity = all("SELECT * FROM access_logs ORDER BY created_at DESC LIMIT 20");

    // Blocked IPs count
    const blockedIPs = get("SELECT COUNT(*) as c FROM blocked_ips")?.c || 0;

    return {
        totalLicenses, activeLicenses, expiredLicenses, revokedLicenses,
        totalDevices, activeDevices,
        totalPluginEvents, totalPlaybacks,
        todayPluginEvents, todayPlaybacks,
        topPlugins, topSources, recentActivity, blockedIPs
    };
}

// ============================================================
// REPOSITORY MANAGEMENT
// ============================================================

function getRepositories() {
    return all("SELECT * FROM repositories ORDER BY id DESC");
}

function addRepository(name, url, count) {
    try {
        runNoSave("INSERT INTO repositories (name, url, plugin_count, last_checked) VALUES (?, ?, ?, datetime('now'))", [name, url, count]);
        saveDB();
        return { success: true };
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            return { success: false, error: 'Repository URL already exists' };
        }
        throw e;
    }
}

function deleteRepository(id) {
    run("DELETE FROM repositories WHERE id = ?", [id]);
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    initDatabase,
    // Low-level query helpers (for analytics)
    all, get,
    // Settings
    getSetting, setSetting, getAllSettings,
    // Licenses
    generateKey, createLicense, createBulkLicenses,
    getLicensesPaginated, getLicenseByKey, getLicenseById,
    updateLicenseStatus, updateLicense, softDeleteLicense,
    restoreLicense, forceDeleteLicense, getLicenseDetails,
    // Validation
    validateLicense,
    // Device lookup (read-only, no create)
    getDeviceByDeviceId,
    // Devices
    getDevicesPaginated, blockDevice, unblockDevice, deleteDevice, renameDevice, replaceTemporaryDevice,
    // Device Tokens (URL-based per-device access)
    createDeviceToken, getDeviceTokensByLicense, getDeviceToken,
    validateDeviceToken, blockDeviceToken, unblockDeviceToken,
    deleteDeviceToken, renameDeviceToken, getDeviceTokenCount,
    // Plugin tracking
    trackPluginUsage, getPluginUsagePaginated,
    // Playback tracking
    trackPlayback, getPlaybackLogsPaginated,
    // Access logs
    logAccess, getAccessLogsPaginated,
    // Admin logs
    logAdminAction, getAdminLogsPaginated,
    // Security
    recordFailedLogin, clearFailedLogins, getFailedLogins,
    blockIP, unblockIP, getBlockedIPs, isIPBlocked,
    // Admin
    getAdminByUsername, updateAdminPassword,
    // Dashboard
    getDashboardStats
};
