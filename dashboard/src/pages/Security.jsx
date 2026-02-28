import { useState, useCallback } from 'react';
import { get, post, formatWIB, timeAgo } from '../lib/api';
import { useApi } from '../hooks/useApi';
import {
    Shield, AlertTriangle, Ban, CheckCircle, Plus, RefreshCw,
    Lock, Activity, X
} from 'lucide-react';

export default function Security() {
    const { data: stats, refetch: refetchStats } = useApi('/admin/dashboard', []);
    const { data: ipsData, loading: ipsLoading, refetch: refetchIps } = useApi('/admin/blocked-ips', []);
    const { data: failData, loading: failLoading } = useApi('/admin/failed-validations?limit=30', []);
    const { data: licData, loading: licLoading } = useApi('/admin/licenses?status=revoked&limit=20', []);

    const [newIp, setNewIp] = useState('');
    const [newIpReason, setNewIpReason] = useState('');
    const [tab, setTab] = useState('blocked-ips');

    const refetch = () => { refetchStats(); refetchIps(); };

    const blockedIps = ipsData?.blocked_ips || [];
    const failedVals = failData?.logs || failData?.feed || [];
    const revokedLics = licData?.licenses || [];

    const handleBlockIp = async (e) => {
        e.preventDefault();
        if (!newIp.trim()) return;
        try {
            await post('/admin/security/block-ip', { ip: newIp.trim(), reason: newIpReason.trim() });
            setNewIp(''); setNewIpReason(''); refetch();
        } catch { }
    };

    const handleUnblockIp = useCallback(async (ip) => {
        try { await post('/admin/security/unblock-ip', { ip }); refetch(); } catch { }
    }, [refetch]);

    const TABS = [
        { id: 'blocked-ips', label: 'Blocked IPs' },
        { id: 'blocked-licenses', label: 'Blocked Licenses' },
        { id: 'failed-validations', label: 'Failed Validations' },
    ];

    return (
        <div className="space-y-5">
            {/* Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 stagger">
                {[
                    { icon: Shield, label: 'API Security', value: 'Active', color: 'kpi-gradient-green', ok: true },
                    { icon: Activity, label: 'Rate Limiting', value: 'Enforced', color: 'kpi-gradient-blue', ok: true },
                    { icon: Ban, label: 'Blocked IPs', value: blockedIps.length || stats?.blocked_ips || 0, color: 'kpi-gradient-rose', ok: false },
                    { icon: AlertTriangle, label: 'Failed Val. Today', value: stats?.failed_validations_today || failedVals.length || 0, color: 'kpi-gradient-amber', ok: false },
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
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Blocked IPs Tab */}
            {tab === 'blocked-ips' && (
                <div className="space-y-4">
                    {/* Add IP form */}
                    <form onSubmit={handleBlockIp} className="glass-card p-4">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3">Block IP Address</h3>
                        <div className="flex items-center gap-3 flex-wrap">
                            <input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="IP address (e.g. 192.168.1.1)" className="form-input w-52" required />
                            <input value={newIpReason} onChange={e => setNewIpReason(e.target.value)} placeholder="Reason (optional)" className="form-input flex-1 min-w-[200px]" />
                            <button type="submit" className="btn-danger py-2">
                                <Ban className="w-3.5 h-3.5" /> Block
                            </button>
                        </div>
                    </form>
                    {/* Blocked IP list */}
                    <div className="glass-card overflow-hidden">
                        <table className="data-table">
                            <thead><tr><th>IP Address</th><th>Reason</th><th>Blocked At</th><th>Actions</th></tr></thead>
                            <tbody>
                                {ipsLoading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={4}><div className="skeleton h-4 rounded" /></td></tr>)
                                    : blockedIps.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-10 text-[13px] text-slate-400">No blocked IPs</td></tr>
                                    ) : blockedIps.map((ip, i) => (
                                        <tr key={i}>
                                            <td className="font-mono text-[13px] font-medium">{typeof ip === 'string' ? ip : ip.ip_address || ip.ip}</td>
                                            <td className="text-[12px] text-slate-500">{ip.reason || '—'}</td>
                                            <td className="text-[12px] text-slate-400">{timeAgo(ip.created_at || ip.blocked_at)}</td>
                                            <td>
                                                <button onClick={() => handleUnblockIp(typeof ip === 'string' ? ip : ip.ip_address || ip.ip)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-500" title="Unblock">
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

            {/* Blocked Licenses Tab */}
            {tab === 'blocked-licenses' && (
                <div className="glass-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Revoked / Suspended Licenses</h3>
                    </div>
                    <table className="data-table">
                        <thead><tr><th>License Key</th><th>Label</th><th>Status</th><th>Blocked At</th></tr></thead>
                        <tbody>
                            {licLoading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={4}><div className="skeleton h-4 rounded" /></td></tr>)
                                : revokedLics.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-10 text-[13px] text-slate-400">No blocked licenses</td></tr>
                                ) : revokedLics.map((l, i) => (
                                    <tr key={i}>
                                        <td className="font-mono text-[12px] text-indigo-600 dark:text-indigo-400">{l.license_key?.substring(0, 24)}…</td>
                                        <td className="text-[13px] text-slate-600 dark:text-slate-400">{l.name || '—'}</td>
                                        <td><span className="badge badge-blocked">{l.status}</span></td>
                                        <td className="text-[12px] text-slate-400">{formatWIB(l.updated_at || l.created_at)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Failed Validations Tab */}
            {tab === 'failed-validations' && (
                <div className="glass-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Recent Failed Validations</h3>
                    </div>
                    <table className="data-table">
                        <thead><tr><th>Event</th><th>IP Address</th><th>Key / Detail</th><th>Time</th></tr></thead>
                        <tbody>
                            {failLoading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan={4}><div className="skeleton h-4 rounded" /></td></tr>)
                                : failedVals.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-10 text-[13px] text-slate-400">No failed validations</td></tr>
                                ) : failedVals.filter(e => (e.action || '').includes('FAIL') || (e.action || '').includes('BLOCKED') || (e.action || '').includes('INVALID')).slice(0, 30).map((e, i) => (
                                    <tr key={i}>
                                        <td><span className="badge badge-blocked text-[9px]">{e.action}</span></td>
                                        <td className="font-mono text-[11px] text-slate-500">{e.ip_address || '—'}</td>
                                        <td className="text-[12px] text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{e.license_key?.substring(0, 16) || e.detail || '—'}</td>
                                        <td className="text-[11px] text-slate-400">{timeAgo(e.timestamp)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
