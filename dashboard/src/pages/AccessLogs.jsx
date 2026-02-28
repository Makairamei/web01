import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { formatWIB, truncKey, copyText } from '../lib/api';
import { Search, ChevronLeft, ChevronRight, Copy, FileText } from 'lucide-react';

export default function AccessLogs() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const { data, loading } = useApi(`/admin/logs?page=${page}&limit=30&search=${encodeURIComponent(search)}&action=${actionFilter}`, [page, search, actionFilter]);

    const logs = data?.logs || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / 30);

    const actionColor = (a) => {
        if (a?.includes('FAIL') || a?.includes('BLOCK')) return 'badge-expired';
        if (a?.includes('OK') || a?.includes('CREATE')) return 'badge-active';
        if (a?.includes('VALIDATE')) return 'badge-info';
        return 'badge-info';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && setSearch(searchInput)} placeholder="Search logs…" className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm w-64 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                    <option value="">All Actions</option>
                    <option value="LOGIN_OK">Login OK</option>
                    <option value="LOGIN_FAIL">Login Fail</option>
                    <option value="VALIDATE">Validate</option>
                    <option value="CREATE">Create</option>
                    <option value="BLOCK">Block</option>
                </select>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead><tr><th>Action</th><th>License Key</th><th>IP Address</th><th>Device</th><th>Details</th><th>Time (WIB)</th></tr></thead>
                        <tbody>
                            {loading ? (
                                [...Array(5)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="skeleton h-4 w-16 rounded" /></td>)}</tr>)
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12"><FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" /><p className="text-sm text-slate-400">No access logs</p></td></tr>
                            ) : logs.map((l, i) => (
                                <tr key={i}>
                                    <td><span className={`badge ${actionColor(l.action)}`}>{l.action}</span></td>
                                    <td>{l.license_key ? <button onClick={() => copyText(l.license_key)} className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">{truncKey(l.license_key)} <Copy className="w-3 h-3 opacity-40" /></button> : <span className="text-xs text-slate-400">—</span>}</td>
                                    <td className="text-xs font-mono text-slate-500">{l.ip_address || '—'}</td>
                                    <td className="text-xs text-slate-500">{l.device_name || l.device_id?.substring(0, 10) || '—'}</td>
                                    <td className="text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{l.details || '—'}</td>
                                    <td className="text-xs text-slate-400 whitespace-nowrap">{formatWIB(l.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-400">{total} total</span>
                        <div className="flex items-center gap-2">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{page}/{totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
