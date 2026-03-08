import { useState, useCallback } from 'react';
import { get, put, timeAgo, truncKey, copyText } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { ShieldAlert, Check, CheckCheck, RefreshCw, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import LicenseDrawer from '../components/LicenseDrawer';

const ALERT_TYPES = [
    { key: '', label: 'All Alerts', color: 'slate' },
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

export default function AbuseAlerts() {
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerLicense, setDrawerLicense] = useState(null);

    const { data, loading, refetch } = useApi(
        `/admin/abuse-alerts?page=${page}&limit=20${filter ? `&type=${filter}` : ''}`,
        [page, filter]
    );
    const alerts = data?.alerts || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const openDrawer = (key) => {
        if (!key) return;
        setDrawerLicense({ license_key: key });
        setDrawerOpen(true);
    };

    const markRead = async (id) => {
        try { await put(`/admin/abuse-alerts/${id}/read`); refetch(); } catch { }
    };

    const markAllRead = async () => {
        try { await put('/admin/abuse-alerts/read-all'); refetch(); } catch { }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Abuse Detection</h2>
                    {total > 0 && <span className="text-[11px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">{total} alerts</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={markAllRead} className="btn-ghost py-1.5 px-3 text-[11px]">
                        <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
                    </button>
                    <button onClick={refetch} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1">
                {ALERT_TYPES.map(t => {
                    const isActive = filter === t.key;
                    const colorMap = {
                        slate: isActive ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
                        amber: isActive ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20',
                        red: isActive ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20',
                        indigo: isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20',
                        purple: isActive ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20',
                        rose: isActive ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20',
                    };
                    return (
                        <button key={t.key} onClick={() => { setFilter(t.key); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${colorMap[t.color]}`}>
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Type</th>
                                <th>Severity</th>
                                <th>License</th>
                                <th>Device</th>
                                <th>Details</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? [...Array(5)].map((_, i) => (
                                <tr key={i}><td colSpan={7}><div className="skeleton h-4 rounded" /></td></tr>
                            )) : alerts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2">
                                            <ShieldAlert className="w-8 h-8 text-emerald-400" />
                                            <div className="text-[13px] text-slate-500 font-medium">No abuse alerts detected</div>
                                            <div className="text-[11px] text-slate-400">Your system is clean!</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : alerts.map(a => (
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
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400">{total} alerts</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">
                                <ChevronLeft className="w-4 h-4 text-slate-500" />
                            </button>
                            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                const p = i + 1;
                                return (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`w-7 h-7 rounded text-[11px] font-semibold ${page === p ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                        {p}
                                    </button>
                                );
                            })}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <LicenseDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} license={drawerLicense} />
        </div>
    );
}
