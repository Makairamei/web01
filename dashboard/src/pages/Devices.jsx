import { useState, useCallback } from 'react';
import { get, put, del, formatWIB, timeAgo } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import {
    Search, ChevronLeft, ChevronRight, RefreshCw, X,
    Monitor, ShieldOff, ShieldCheck, Trash2, Clock, Globe, Activity, Eye
} from 'lucide-react';
import { cleanPluginName } from '../lib/api';

const LIMIT = 10;


export default function Devices() {
    const toast = useToast();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [drawer, setDrawer] = useState(null);
    const [drawerData, setDrawerData] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [confirm, setConfirm] = useState(null);

    const { data, loading, refetch } = useApi(
        `/admin/devices?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`,
        [page, search]
    );

    const devices = data?.devices || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / LIMIT);

    /* ── open device drawer ── */
    const openDrawer = useCallback(async (dev) => {
        setDrawer(dev);
        setDrawerData(null);
        setDrawerLoading(true);
        try {
            // Get device activity from plugin_usage and playback_logs
            const acts = await get(`/admin/plugin-usage?search=${encodeURIComponent(dev.device_id)}&limit=30`);
            const plays = await get(`/admin/playback-logs?search=${encodeURIComponent(dev.device_id)}&limit=20`);
            setDrawerData({ activities: acts?.logs || [], playbacks: plays?.logs || [] });
        } catch { setDrawerData({ activities: [], playbacks: [] }); }
        finally { setDrawerLoading(false); }
    }, []);

    /* ── actions ── */
    const doAction = useCallback(async (id, action, msg) => {
        try {
            await put(`/admin/devices/${id}`, { action });
            toast(msg, 'success');
            refetch();
            if (drawer?.id === id) setDrawer(p => ({ ...p, is_blocked: action === 'block' ? 1 : 0 }));
        } catch { toast('Action failed', 'error'); }
    }, [toast, refetch, drawer]);

    const doDelete = useCallback(async (id) => {
        try {
            await put(`/admin/devices/${id}`, { action: 'delete' });
            toast('Device removed', 'success');
            refetch();
            if (drawer?.id === id) setDrawer(null);
        } catch { toast('Delete failed', 'error'); }
    }, [toast, refetch, drawer]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    /* ── device number within license ── */
    // Add a display number: count position within the filtered list (across pages it'll just be sequential)
    const deviceNumber = (index) => (page - 1) * LIMIT + index + 1;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5 toolbar-row">
                <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Search device, license, IP…"
                            className="form-input pl-8"
                        />
                    </div>
                </form>
                <button onClick={refetch} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="table-responsive-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-10">#</th>
                                <th>Device</th>
                                <th>License</th>
                                <th className="hide-mobile">IP Address</th>
                                <th>Status</th>
                                <th className="hide-mobile">Last Seen</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(LIMIT)].map((_, i) => (
                                    <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="skeleton h-4 rounded w-20" /></td>)}</tr>
                                ))
                            ) : devices.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center text-[13px] text-slate-400">No devices found</td></tr>
                            ) : devices.map((d, idx) => (
                                <tr key={d.id}>
                                    <td>
                                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold">
                                            {deviceNumber(idx)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                                                {d.device_name || `Device ${deviceNumber(idx)}`}
                                            </span>
                                            <span className="font-mono text-[10px] text-slate-400">{d.device_id?.substring(0, 18)}…</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-0.5">
                                            {d.license_name && <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{d.license_name}</span>}
                                            <span className="font-mono text-[10px] text-slate-400">{d.license_key?.substring(0, 16)}…</span>
                                        </div>
                                    </td>
                                    <td className="hide-mobile font-mono text-[11px] text-slate-500">{d.ip_address || '—'}</td>
                                    <td>
                                        {d.is_blocked
                                            ? <span className="badge badge-blocked">Blocked</span>
                                            : d.is_online
                                                ? <span className="badge badge-active">Online</span>
                                                : <span className="badge badge-expired">Offline</span>
                                        }
                                    </td>
                                    <td className="hide-mobile">
                                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                            <Clock className="w-3 h-3" />
                                            {timeAgo(d.last_seen)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openDrawer(d)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600" title="View activity">
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            {d.is_blocked
                                                ? <button onClick={() => setConfirm({ title: 'Unblock Device', msg: `Unblock this device?`, action: () => doAction(d.id, 'unblock', 'Device unblocked') })} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-500" title="Unblock"><ShieldCheck className="w-3.5 h-3.5" /></button>
                                                : <button onClick={() => setConfirm({ title: 'Block Device', msg: 'Block this device? It will not be able to use any license.', action: () => doAction(d.id, 'block', 'Device blocked'), danger: true })} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-500" title="Block"><ShieldOff className="w-3.5 h-3.5" /></button>
                                            }
                                            <button onClick={() => setConfirm({ title: 'Remove Device', msg: 'Remove this device? The license slot will be freed.', action: () => doDelete(d.id), danger: true })} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600" title="Delete">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-[12px] text-slate-500">
                    <span className="pager-text">{total} total · Page {page}/{totalPages || 1}</span>
                    <div className="flex items-center gap-1.5">
                        <button disabled={page <= 1} onClick={() => setPage(1)} className="px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">«</button>
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            let p;
                            if (totalPages <= 7) p = i + 1;
                            else if (page <= 4) p = i + 1;
                            else if (page >= totalPages - 3) p = totalPages - 6 + i;
                            else p = page - 3 + i;
                            if (p < 1 || p > totalPages) return null;
                            return <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-lg text-[12px] font-medium ${p === page ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{p}</button>;
                        })}
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                        <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">»</button>
                    </div>
                </div>
            </div>

            {/* ══ Device Detail Drawer ══ */}
            {drawer && (
                <>
                    <div className="drawer-overlay" onClick={() => setDrawer(null)} />
                    <div className="drawer-panel">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                        <Monitor className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="text-[14px] font-bold text-slate-900 dark:text-white">
                                            {drawer.device_name || 'Unnamed Device'}
                                        </div>
                                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">{drawer.device_id}</div>
                                    </div>
                                </div>
                                <button onClick={() => setDrawer(null)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {/* Device Meta */}
                            <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                                {[
                                    { icon: Globe, label: 'IP Address', val: drawer.ip_address || '—' },
                                    { icon: Clock, label: 'Last Seen', val: timeAgo(drawer.last_seen) },
                                    { icon: Activity, label: 'Status', val: drawer.is_blocked ? 'Blocked' : (drawer.is_online ? 'Online' : 'Offline') },
                                    { icon: Clock, label: 'First Seen', val: formatWIB(drawer.first_seen) },
                                ].map(r => (
                                    <div key={r.label} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                        <r.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <div>
                                            <div className="text-[9px] uppercase tracking-wide text-slate-400">{r.label}</div>
                                            <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{r.val}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Actions */}
                            <div className="flex gap-2 mt-3">
                                {drawer.is_blocked
                                    ? <button onClick={() => setConfirm({ title: 'Unblock', msg: 'Unblock this device?', action: () => doAction(drawer.id, 'unblock', 'Unblocked') })} className="btn-ghost text-emerald-600 text-[12px] py-1.5 flex-1 justify-center"><ShieldCheck className="w-3.5 h-3.5" /> Unblock</button>
                                    : <button onClick={() => setConfirm({ title: 'Block', msg: 'Block this device?', action: () => doAction(drawer.id, 'block', 'Blocked'), danger: true })} className="btn-ghost text-amber-600 text-[12px] py-1.5 flex-1 justify-center"><ShieldOff className="w-3.5 h-3.5" /> Block</button>
                                }
                                <button onClick={() => setConfirm({ title: 'Remove Device', msg: 'Remove this device?', action: () => doDelete(drawer.id), danger: true })} className="btn-ghost text-red-600 text-[12px] py-1.5 flex-1 justify-center"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                            </div>
                        </div>

                        {/* Activity */}
                        <div className="p-4">
                            <h3 className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-3">Recent Plugin Activity</h3>
                            {drawerLoading ? (
                                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}</div>
                            ) : drawerData?.activities?.length === 0 ? (
                                <div className="py-6 text-center text-[13px] text-slate-400">No plugin activity</div>
                            ) : drawerData?.activities?.slice(0, 20).map((a, i) => (
                                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-2 border-slate-200 dark:border-slate-700 mb-1">
                                    <div>
                                        <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200">{cleanPluginName(a.plugin_name)}</span>
                                        <span className="ml-2 badge badge-info text-[9px]">{a.action}</span>
                                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{a.ip_address}</div>
                                    </div>
                                    <span className="text-[10px] text-slate-400">{timeAgo(a.used_at)}</span>
                                </div>
                            ))}

                            {drawerData?.playbacks?.length > 0 && (
                                <>
                                    <h3 className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-3 mt-5">Recent Playbacks</h3>
                                    {drawerData.playbacks.slice(0, 10).map((p, i) => (
                                        <div key={i} className="py-2 px-3 mb-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-2 border-amber-300 dark:border-amber-500/40">
                                            <div className="text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate">{p.video_title || 'Unknown'}</div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                                <span>{cleanPluginName(p.plugin_name)}</span>
                                                {p.source_provider && <><span>·</span><span>{p.source_provider}</span></>}
                                                <span className="ml-auto">{timeAgo(p.played_at)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                open={!!confirm}
                title={confirm?.title}
                message={confirm?.msg}
                danger={confirm?.danger}
                onConfirm={confirm?.action}
                onClose={() => setConfirm(null)}
            />
        </div>
    );
}
