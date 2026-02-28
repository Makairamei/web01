const BASE = '/api';

let token = localStorage.getItem('cs_token');

export function setToken(t) { token = t; if (t) localStorage.setItem('cs_token', t); else localStorage.removeItem('cs_token'); }
export function getToken() { return token; }
export function isLoggedIn() { return !!token; }

export async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { ...opts, headers });
    if (res.status === 401) { setToken(null); window.location.href = '/'; throw new Error('Unauthorized'); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

export const get = (path) => api(path);
export const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
export const put = (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body) });
export const patch = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del = (path) => api(path, { method: 'DELETE' });

// ── Date formatting ─────────────────────────────────
export function formatWIB(d) {
    if (!d) return '—';
    try {
        let zDate = d;
        if (typeof d === 'string') {
            zDate = d.endsWith('Z') ? d : `${d.replace(' ', 'T')}Z`;
        }
        return new Date(zDate).toLocaleDateString('en-GB', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
        }) + ' WIB';
    } catch { return '—'; }
}

export function formatDate(d) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-GB', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit', month: 'short', year: 'numeric',
        });
    } catch { return '—'; }
}

export function cleanPluginName(raw) {
    if (!raw) return '—';
    // Fix UTF-8 mojibake (e.g. ðŸŽ‰ -> 🎉)
    let val = raw;
    try {
        // Attempt to interpret characters as bytes and decode as UTF-8
        val = new TextDecoder('utf-8').decode(new Uint8Array([...raw].map(c => c.charCodeAt(0))));
    } catch { }
    return val.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u{1F000}-\u{1FFFF}]/gu, '').replace(/[^\x00-\x7E\u00A0-\u024F\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2700}-\u{27BF}]/gu, '').trim() || val.trim();
}

export function timeAgo(d) {
    if (!d) return '—';
    let zDate = d;
    if (typeof d === 'string') {
        zDate = d.endsWith('Z') ? d : `${d.replace(' ', 'T')}Z`;
    }
    const s = Math.floor((Date.now() - new Date(zDate).getTime()) / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

export function daysUntil(d) {
    if (!d) return null;
    const diff = new Date(d).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
}

// ── Number formatting ─────────────────────────────────
export function formatNumber(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
}

export function formatDuration(seconds) {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

// ── String utilities ──────────────────────────────────
export function truncKey(key) { return key ? key.substring(0, 16) + '…' : '—'; }
export function truncStr(s, n) { return s && s.length > n ? s.substring(0, n) + '…' : (s || '—'); }

export async function copyText(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            throw new Error('Clipboard API unavailable');
        }
    } catch (err) {
        // Fallback for HTTP / older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try { document.execCommand('copy'); } catch (e) { console.error('Copy failed', e); }
        document.body.removeChild(textArea);
    }
}

export function cn(...classes) { return classes.filter(Boolean).join(' '); }

// ── Color helpers ──────────────────────────────────────
export function statusColor(status) {
    const map = {
        active: 'badge-active',
        expired: 'badge-expired',
        suspended: 'badge-suspended',
        blocked: 'badge-blocked',
        revoked: 'badge-revoked',
    };
    return map[status] || 'badge-info';
}

export function expiryColor(daysLeft) {
    if (daysLeft === null) return '';
    if (daysLeft <= 3) return 'text-red-500 font-semibold';
    if (daysLeft <= 7) return 'text-amber-500 font-medium';
    if (daysLeft <= 14) return 'text-yellow-600';
    return 'text-slate-500';
}
