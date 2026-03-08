import { useState, useCallback, useEffect } from 'react';
import { get, post, put, formatWIB, timeAgo, truncKey } from '../lib/api';
import { useApi } from '../hooks/useApi';
import {
    Shield, AlertTriangle, Ban, CheckCircle, RefreshCw,
    Activity, ShieldAlert, Check, CheckCheck,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import LicenseDrawer from '../components/LicenseDrawer';

/* ── Abuse Alert constants ────────────────────────── */
const ALERT_TYPES = [
    { key: '', label: 'All', color: 'slate' },
    { key: 'DEVICE_OVERFLOW', label: 'Device Overflow', color: 'amber' },
    { key: 'IP_ROTATION', label: 'IP Rotation', color: 'red' },
    { key: 'BURST_REQUEST', label: 'Burst Request', color: 'indigo' },
    { key: 'MULTI_IP_LICENSE', label: 'Multi-IP License', color: 'purple' },
    { key: 'DEVICE_SPOOF', label: 'Device Spoofing', color: 'rose' },
];
const SEVERITY_STYLE = {
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    high: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    critical: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-bold',
};
const TYPE_BADGE = {
    DEVICE_OVERFLOW: 'badge-warning',
    IP_ROTATION: 'badge-blocked',
    BURST_REQUEST: 'badge-info',
    MULTI_IP_LICENSE: 'badge-active',
    DEVICE_SPOOF: 'badge-blocked',
};

/* ── Bulk toolbar component ───────────────────────── */
function BulkBar({ count, label, onAction }) {
    if (!count) return null;
    return (
        <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 border-b border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-indigo-700 dark:text-indigo-400">
                {count} selected
            </span>
            <button onClick={onAction} className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-colors">
                <CheckCircle className="w-3.5 h-3.5" /> {label}
            </button>
        </div>
    );
}

/* ── Main component ───────────────────────────────── */
export default function Security() {
    /* ── Data fetching ── */
    const { data: stats, refetch: refetchStats } = useApi('/admin/dashboard', []);
    const { data: ipsData, loading: ipsLoading, refetch: refetchIps } = useApi('/admin/blocked-ips', []);
    const { data: licData, loading: licLoading, refetch: refetchLic } = useApi('/admin/licenses?status=revoked&limit=50', []);
    const { data: devData, loading: devLoading, refetch: refetchDev } = useApi('/admin/security/blocked-devices', []);

    /* ── Local state ── */
    const [newIp, setNewIp] = useState('');
    const [newIpReason, setNewIpReason] = useState('');
    const [newLicenseKey, setNewLicenseKey] = useState('');
    const [newDeviceId, setNewDeviceId] = useState('');
    const [selectedIps, setSelectedIps] = useState(new Set());
    const [selectedLics, setSelectedLics] = useState(new Set());
    const [selectedDevs, setSelectedDevs] = useState(new Set());
    const [tab, setTab] = useState('blocked-ips');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerLicense, setDrawerLicense] = useState(null);

    /* ── Abuse state ── */
    const [abusePage, setAbusePage] = useState(1);
    const [abuseFilter, setAbuseFilter] = useState('');
    const { data: abuseData, loading: abuseLoading, refetch: refetchAbuse } = useApi(
        `/admin/abuse-alerts?page=${abusePage}&limit=20${abuseFilter ? `&type=${abuseFilter}` : ''}`,
        [abusePage, abuseFilter]
    );
    const abuseAlerts = abuseData?.alerts || [];
    const abuseTotal = abuseData?.total || 0;
    const abuseTotalPages = abuseData?.totalPages || 1;

    /* ── Derived data ── */
    const blockedIps = ipsData?.blocked_ips || [];
    const revokedLics = licData?.licenses || [];
    const blockedDevs = devData?.blocked_devices || [];

    const openDrawer = (key) => { if (key) { setDrawerLicense({ license_key: key }); setDrawerOpen(true); } };
    const refetch = () => { refetchStats(); refetchIps(); refetchLic(); refetchDev(); };

    /* ── Clear selection on tab change ── */
    useEffect(() => { setSelectedIps(new Set()); setSelectedLics(new Set()); setSelectedDevs(new Set()); }, [tab]);

    /* ── Handlers: Block ── */
    const handleBlockIp = async (e) => { e.preventDefault(); if (!newIp.trim()) return; try { await post('/admin/security/block-ip', { ip: newIp.trim(), reason: newIpReason.trim() }); setNewIp(''); setNewIpReason(''); refetch(); } catch { } };
    const handleBlockLicense = async (e) => { e.preventDefault(); if (!newLicenseKey.trim()) return; try { await post('/admin/security/block-license', { license_key: newLicenseKey.trim() }); setNewLicenseKey(''); refetch(); } catch { } };
    const handleBlockDevice = async (e) => { e.preventDefault(); if (!newDeviceId.trim()) return; try { await post('/admin/security/block-device', { device_id: newDeviceId.trim() }); setNewDeviceId(''); refetch(); } catch { } };

    /* ── Handlers: Unblock single ── */
    const handleUnblockIp = useCallback(async (ip) => { try { await post('/admin/security/unblock-ip', { ip }); refetch(); } catch { } }, [refetch]);
    const handleUnblockLicense = async (id) => { try { await post(`/admin/licenses/${id}/restore`); refetch(); } catch { } };
    const handleUnblockDevice = async (id) => { try { await post(`/admin/devices/${id}/unblock`); refetch(); } catch { } };

    /* ── Handlers: Bulk unblock ── */
    const handleBulkUnblockIps = async () => { if (!selectedIps.size) return; try { await post('/admin/security/unblock-ips-bulk', { ips: Array.from(selectedIps) }); setSelectedIps(new Set()); refetch(); } catch { } };
    const handleBulkUnblockLics = async () => { if (!selectedLics.size) return; try { await post('/admin/licenses/bulk', { ids: Array.from(selectedLics), action: 'activate' }); setSelectedLics(new Set()); refetch(); } catch { } };
    const handleBulkUnblockDevs = async () => { if (!selectedDevs.size) return; try { await post('/admin/devices/bulk', { ids: Array.from(selectedDevs), action: 'unblock' }); setSelectedDevs(new Set()); refetch(); } catch { } };

    /* ── Handlers: Abuse ── */
    const markRead = async (id) => { try { await put(`/admin/abuse-alerts/${id}/read`); refetchAbuse(); } catch { } };
    const markAllRead = async () => { try { await put('/admin/abuse-alerts/read-all'); refetchAbuse(); } catch { } };

    /* ── Selection helpers ── */
    const toggleSelection = (setFn, id) => { setFn(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
    const toggleAll = (setFn, items, idKey = 'id') => { setFn(prev => prev.size === items.length ? new Set() : new Set(items.map(item => typeof item === 'string' ? item : item[idKey] || item.ip_address || item.ip))); };

    /* ── Checkbox classes (shared) ── */
    const chkClass = "form-checkbox rounded text-indigo-500 focus:ring-indigo-500 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 w-3.5 h-3.5 cursor-pointer";

    const TABS = [
        { id: 'blocked-ips', label: 'Block IP', icon: Ban },
        { id: 'blocked-licenses', label: 'Block License', icon: Shield },
        { id: 'blocked-devices', label: 'Block Device', icon: Activity },
        { id: 'abuse', label: 'Abuse Detection', icon: ShieldAlert, badge: abuseTotal },
    ];

    return (
        <div className="space-y-5">
            {/* Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 stagger">
                {[
                    { icon: Shield, label: 'API Security', value: 'Active', color: 'kpi-gradient-green', ok: true },
                    { icon: Activity, label: 'Rate Limiting', value: 'Enforced', color: 'kpi-gradient-blue', ok: true },
                    { icon: Ban, label: 'Blocked IPs', value: blockedIps.length || stats?.blocked_ips || 0, color: 'kpi-gradient-rose', ok: false },
                    { icon: ShieldAlert, label: 'Abuse Alerts', value: abuseTotal, color: 'kpi-gradient-amber', ok: abuseTotal === 0 },
                ].map(c => (
                    <div key={c.label} className={`${c.color} rounded-2xl p-4 border fade-in`}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-white/60 dark:bg-slate-900/50">
                                <c.icon className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                            </div>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${c.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">{c.value}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit flex-wrap">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                        {t.badge > 0 && <span className="ml-1 text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">{t.badge > 99 ? '99+' : t.badge}</span>}
                    </button>
                ))}
            </div>

            {/* ═══════════════ BLOCK IP TAB ═══════════════ */}
            {tab === 'blocked-ips' && (
                <div className="space-y-4">
                    <form onSubmit={handleBlockIp} className="glass-card p-4">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3">Block IP Address</h3>
                        <div className="flex items-center gap-3 flex-wrap">
                            <input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="IP address (e.g. 192.168.1.1)" className="form-input w-52" required />
                            <input value={newIpReason} onChange={e => setNewIpReason(e.target.value)} placeholder="Reason (optional)" className="form-input flex-1 min-w-[200px]" />
                            <button type="submit" className="btn-danger py-2"><Ban className="w-3.5 h-3.5" /> Block</button>
                        </div>
                    </form>

                    <div className="glass-card overflow-hidden">
                        <BulkBar count={selectedIps.size} label="Unblock Selected" onAction={handleBulkUnblockIps} />
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="w-10"><input type="checkbox" className={chkClass} checked={blockedIps.length > 0 && selectedIps.size === blockedIps.length} onChange={() => toggleAll(setSelectedIps, blockedIps, 'ip_address')} /></th>
                                    <th>IP Address</th><th>Reason</th><th>Blocked At</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ipsLoading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={5}><div className="skeleton h-4 rounded" /></td></tr>)
                                    : blockedIps.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-10 text-[13px] text-slate-400">No blocked IPs</td></tr>
                                    ) : blockedIps.map((ip, i) => {
                                        const id = typeof ip === 'string' ? ip : ip.ip_address || ip.ip;
                                        return (
                                            <tr key={i} className={selectedIps.has(id) ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}>
                                                <td><input type="checkbox" className={chkClass} checked={selectedIps.has(id)} onChange={() => toggleSelection(setSelectedIps, id)} /></td>
                                                <td className="font-mono text-[13px] font-medium">{id}</td>
                                                <td className="text-[12px] text-slate-500">{ip.reason || '—'}</td>
                                                <td className="text-[12px] text-slate-400">{timeAgo(ip.created_at || ip.blocked_at)}</td>
                                                <td>
                                                    <button onClick={() => handleUnblockIp(id)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-500" title="Unblock">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════ BLOCK LICENSE TAB ═══════════════ */}
            {tab === 'blocked-licenses' && (
                <div className="space-y-4">
                    <form onSubmit={handleBlockLicense} className="glass-card p-4">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3">Block License Key</h3>
                        <div className="flex items-center gap-3 flex-wrap">
                            <input value={newLicenseKey} onChange={e => setNewLicenseKey(e.target.value)} placeholder="Enter License Key" className="form-input flex-1 min-w-[250px]" required />
                            <button type="submit" className="btn-danger py-2 px-5"><Ban className="w-3.5 h-3.5" /> Block</button>
                        </div>
                    </form>

                    <div className="glass-card overflow-hidden">
                        <BulkBar count={selectedLics.size} label="Restore Selected" onAction={handleBulkUnblockLics} />
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="w-10"><input type="checkbox" className={chkClass} checked={revokedLics.length > 0 && selectedLics.size === revokedLics.length} onChange={() => toggleAll(setSelectedLics, revokedLics)} /></th>
                                    <th>License Key</th><th>Label</th><th>Status</th><th>Blocked At</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {licLoading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-4 rounded" /></td></tr>)
                                    : revokedLics.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-10 text-[13px] text-slate-400">No blocked licenses</td></tr>
                                    ) : revokedLics.map((l, i) => (
                                        <tr key={i} className={selectedLics.has(l.id) ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}>
                                            <td><input type="checkbox" className={chkClass} checked={selectedLics.has(l.id)} onChange={() => toggleSelection(setSelectedLics, l.id)} /></td>
                                            <td>
                                                <button onClick={() => openDrawer(l.license_key)} className="font-mono text-[12px] text-indigo-600 dark:text-indigo-400 hover:underline text-left">
                                                    {l.license_key?.substring(0, 24)}…
                                                </button>
                                            </td>
                                            <td className="text-[13px] text-slate-600 dark:text-slate-400">{l.name || '—'}</td>
                                            <td><span className="badge badge-blocked">{l.status}</span></td>
                                            <td className="text-[12px] text-slate-400">{formatWIB(l.updated_at || l.created_at)}</td>
                                            <td>
                                                <button onClick={() => handleUnblockLicense(l.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-500" title="Restore">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════ BLOCK DEVICE TAB ═══════════════ */}
            {tab === 'blocked-devices' && (
                <div className="space-y-4">
                    <form onSubmit={handleBlockDevice} className="glass-card p-4">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3">Block Device by ID</h3>
                        <div className="flex items-center gap-3 flex-wrap">
                            <input value={newDeviceId} onChange={e => setNewDeviceId(e.target.value)} placeholder="Enter Device ID" className="form-input flex-1 min-w-[250px]" required />
                            <button type="submit" className="btn-danger py-2 px-5"><Ban className="w-3.5 h-3.5" /> Block</button>
                        </div>
                    </form>

                    <div className="glass-card overflow-hidden">
                        <BulkBar count={selectedDevs.size} label="Unblock Selected" onAction={handleBulkUnblockDevs} />
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="w-10"><input type="checkbox" className={chkClass} checked={blockedDevs.length > 0 && selectedDevs.size === blockedDevs.length} onChange={() => toggleAll(setSelectedDevs, blockedDevs)} /></th>
                                    <th>Device</th><th>License</th><th>Last IP</th><th>Blocked At</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devLoading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-4 rounded" /></td></tr>)
                                    : blockedDevs.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-10 text-[13px] text-slate-400">No blocked devices</td></tr>
                                    ) : blockedDevs.map((d, i) => (
                                        <tr key={i} className={selectedDevs.has(d.id) ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}>
                                            <td><input type="checkbox" className={chkClass} checked={selectedDevs.has(d.id)} onChange={() => toggleSelection(setSelectedDevs, d.id)} /></td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{d.device_name || 'Unknown Device'}</span>
                                                    <span className="font-mono text-[10px] text-slate-400">{d.device_id?.substring(0, 16)}…</span>
                                                </div>
                                            </td>
                                            <td>
                                                <button onClick={() => openDrawer(d.license_key)} className="text-[12px] text-indigo-600 dark:text-indigo-400 hover:underline">
                                                    {d.license_name || d.license_key?.substring(0, 16)}
                                                </button>
                                            </td>
                                            <td className="font-mono text-[11px] text-slate-500">{d.ip_address || '—'}</td>
                                            <td className="text-[11px] text-slate-400">{timeAgo(d.last_seen)}</td>
                                            <td>
                                                <button onClick={() => handleUnblockDevice(d.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-500" title="Unblock">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════ ABUSE DETECTION TAB ═══════════════ */}
            {tab === 'abuse' && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4.5 h-4.5 text-red-500" />
                            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Abuse Alerts</span>
                            {abuseTotal > 0 && <span className="text-[10px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">{abuseTotal}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={markAllRead} className="btn-ghost py-1.5 px-3 text-[11px]"><CheckCheck className="w-3.5 h-3.5" /> Mark All Read</button>
                            <button onClick={refetchAbuse} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><RefreshCw className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>

                    {/* Filter pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1">
                        {ALERT_TYPES.map(t => {
                            const isActive = abuseFilter === t.key;
                            const colorMap = {
                                slate: isActive ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
                                amber: isActive ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20',
                                red: isActive ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20',
                                indigo: isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20',
                                purple: isActive ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20',
                                rose: isActive ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20',
                            };
                            return (
                                <button key={t.key} onClick={() => { setAbuseFilter(t.key); setAbusePage(1); }}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${colorMap[t.color]}`}>
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Abuse table */}
                    <div className="glass-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Time</th><th>Type</th><th>Severity</th><th>License</th><th>Device</th><th>Details</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {abuseLoading ? [...Array(5)].map((_, i) => (
                                        <tr key={i}><td colSpan={7}><div className="skeleton h-4 rounded" /></td></tr>
                                    )) : abuseAlerts.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-2">
                                                    <ShieldAlert className="w-8 h-8 text-emerald-400" />
                                                    <div className="text-[13px] text-slate-500 font-medium">No abuse alerts detected</div>
                                                    <div className="text-[11px] text-slate-400">Your system is clean!</div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : abuseAlerts.map(a => (
                                        <tr key={a.id} className={!a.is_read ? 'bg-red-50/30 dark:bg-red-500/5' : ''}>
                                            <td className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(a.created_at)}</td>
                                            <td><span className={`badge ${TYPE_BADGE[a.alert_type] || 'badge-info'} text-[9px]`}>{a.alert_type?.replace(/_/g, ' ')}</span></td>
                                            <td><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.medium}`}>{a.severity?.toUpperCase()}</span></td>
                                            <td>
                                                {a.license_key ? (
                                                    <button onClick={() => openDrawer(a.license_key)} className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">
                                                        {truncKey(a.license_key)}
                                                    </button>
                                                ) : <span className="text-slate-400 text-[11px]">—</span>}
                                            </td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{a.device_name || '—'}</span>
                                                    {a.device_id && <span className="font-mono text-[9px] text-slate-400">{a.device_id.substring(0, 12)}…</span>}
                                                    {a.ip_address && <span className="font-mono text-[10px] text-slate-500">{a.ip_address}</span>}
                                                </div>
                                            </td>
                                            <td className="text-[11px] text-slate-600 dark:text-slate-400 max-w-[300px]">
                                                <div className="line-clamp-3" title={a.details}>{a.details}</div>
                                            </td>
                                            <td>
                                                {!a.is_read && (
                                                    <button onClick={() => markRead(a.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-500" title="Mark as Read">
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {abuseTotalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-[11px] text-slate-400">{abuseTotal} alerts</span>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setAbusePage(p => Math.max(1, p - 1))} disabled={abusePage <= 1} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">
                                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                                    </button>
                                    {[...Array(Math.min(abuseTotalPages, 5))].map((_, i) => {
                                        const p = i + 1;
                                        return (
                                            <button key={p} onClick={() => setAbusePage(p)}
                                                className={`w-7 h-7 rounded text-[11px] font-semibold ${abusePage === p ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                                {p}
                                            </button>
                                        );
                                    })}
                                    <button onClick={() => setAbusePage(p => Math.min(abuseTotalPages, p + 1))} disabled={abusePage >= abuseTotalPages} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">
                                        <ChevronRight className="w-4 h-4 text-slate-500" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Slide-out Drawer */}
            <LicenseDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} license={drawerLicense} />
        </div>
    );
}
