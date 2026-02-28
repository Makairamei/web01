import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { formatWIB } from '../lib/api';
import {
    Activity, ShieldAlert, Key, Trash2, Edit3, UserCheck, Search, Users, Settings, Eye, X
} from 'lucide-react';

export default function AdminLogs() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [viewLog, setViewLog] = useState(null);

    const limit = 50;
    const { data: logData, loading } = useApi(`/admin/admin-logs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, [page, search]);

    const logs = logData?.logs || [];
    const total = logData?.total || 0;
    const maxPage = Math.ceil(total / limit) || 1;

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    const actionBadge = (action) => {
        const u = action.toUpperCase();
        if (u.includes('LOGIN')) {
            if (u.includes('FAIL')) return <span className="badge badge-blocked text-[10px]"><ShieldAlert className="w-3 h-3 mr-1" /> {action}</span>;
            return <span className="badge badge-active text-[10px]"><UserCheck className="w-3 h-3 mr-1" /> {action}</span>;
        }
        if (u.includes('CREATE')) return <span className="badge text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"><Key className="w-3 h-3 mr-1" /> {action}</span>;
        if (u.includes('DELETE')) return <span className="badge badge-blocked text-[10px]"><Trash2 className="w-3 h-3 mr-1" /> {action}</span>;
        if (u.includes('UPDATE_SETTINGS')) return <span className="badge badge-info text-[10px]"><Settings className="w-3 h-3 mr-1" /> {action}</span>;

        return <span className="badge text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><Edit3 className="w-3 h-3 mr-1" /> {action}</span>;
    };

    return (
        <div className="space-y-4 fade-in">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl kpi-gradient-indigo flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Admin Audit Logs</h2>
                        <p className="text-[11px] text-slate-500">History of all admin actions</p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="form-input pl-9 w-full text-[12px] py-1.5"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                    />
                </form>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-32">Admin User</th>
                                <th className="w-48">Action</th>
                                <th>Details</th>
                                <th className="w-32">IP Address</th>
                                <th className="w-40 text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5}><div className="skeleton h-6 rounded" /></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-[13px] text-slate-400">
                                        No admin activity found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                    {(log.admin_username || 'S')[0].toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-[12px] text-slate-700 dark:text-slate-200">
                                                    {log.admin_username}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{actionBadge(log.action)}</td>
                                        <td className="text-[12px] text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <span className="max-w-[200px] sm:max-w-md block truncate">
                                                    {(log.details || '').split('\n')[0]}
                                                </span>
                                                {((log.details || '').includes('\n') || (log.details || '').length > 40 || (log.action || '').includes('BULK') || (log.action || '').includes('SETTINGS')) && (
                                                    <button
                                                        onClick={() => setViewLog(log)}
                                                        title="View full details"
                                                        className="text-indigo-600 dark:text-indigo-400 p-1 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="font-mono text-[11px] text-slate-500">{log.ip_address}</td>
                                        <td className="text-right text-[11px] text-slate-400">{formatWIB(log.created_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {maxPage > 1 && (
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="text-[11px] text-slate-500 font-medium">
                            Showing page {page} of {maxPage} ({total} events)
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                            >
                                Prev
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(maxPage, p + 1))}
                                disabled={page === maxPage}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* View Details Modal */}
            {viewLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm backdrop-fade" onClick={() => setViewLog(null)} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl shadow-modal overflow-hidden modal-spring border border-slate-200/50 dark:border-white/5 flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0f172a]">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg kpi-gradient-indigo flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Action Details</h3>
                            </div>
                            <button onClick={() => setViewLog(null)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between gap-4 text-[12px]">
                                <div>
                                    <span className="text-slate-400 block mb-1 font-medium">Action</span>
                                    {actionBadge(viewLog.action)}
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-1 font-medium">Admin</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{viewLog.admin_username}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block mb-1 font-medium">Time</span>
                                    <span className="text-slate-600 dark:text-slate-300">{formatWIB(viewLog.created_at)}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                <span className="text-slate-400 font-medium text-[12px] block mb-2">Detailed Log</span>
                                <div className="p-3 bg-slate-50 dark:bg-[#080e1c] rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-x-auto">
                                    <pre className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                                        {viewLog.details}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 flex justify-end bg-slate-50/50 dark:bg-[#0f172a]">
                            <button onClick={() => setViewLog(null)} className="btn-ghost text-[12px] py-1.5 px-4 font-semibold">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
