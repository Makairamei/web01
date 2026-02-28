import { useState, useEffect, useCallback } from 'react';
import { get, formatWIB, timeAgo, truncKey } from '../lib/api';
import { useInterval } from '../hooks/useApi';
import { Radio, RefreshCw, Wifi } from 'lucide-react';

export default function ActiveSessions() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSessions = useCallback(async () => {
        try { const d = await get('/admin/active-sessions'); setSessions(d.sessions || []); }
        catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);
    useInterval(fetchSessions, 20000);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{sessions.length} active sessions</span>
                </div>
                <button onClick={fetchSessions} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><RefreshCw className="w-4 h-4" /></button>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead><tr><th>IP Address</th><th>License Key</th><th>Status</th><th>Name</th><th>Expires</th></tr></thead>
                        <tbody>
                            {loading ? (
                                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(5)].map((_, j) => <td key={j}><div className="skeleton h-4 w-20 rounded" /></td>)}</tr>)
                            ) : sessions.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12"><Radio className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" /><p className="text-sm text-slate-400">No active sessions</p></td></tr>
                            ) : sessions.map((s, i) => (
                                <tr key={i}>
                                    <td className="font-mono text-xs text-slate-600 dark:text-slate-400">{s.ip}</td>
                                    <td className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{truncKey(s.key)}</td>
                                    <td><span className={`badge badge-${s.license?.status || 'info'}`}>{s.license?.status || 'Unknown'}</span></td>
                                    <td className="text-sm text-slate-600 dark:text-slate-400">{s.license?.name || '—'}</td>
                                    <td className="text-xs text-slate-500 whitespace-nowrap">{s.expiresAt ? timeAgo(new Date(s.expiresAt)) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
