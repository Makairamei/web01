import { useState, useEffect, useCallback, useRef } from 'react';
import { get, timeAgo, truncKey, copyText } from '../lib/api';
import { Activity, Radio, Copy, Pause, Play, RefreshCw, Wifi } from 'lucide-react';

const EVENT_TYPES = ['All', 'VALIDATE_OK', 'VALIDATE_FAIL', 'PLUGIN_USE', 'PLAY', 'LOGIN_OK', 'LOGIN_FAIL'];

const EVENT_COLORS = {
    VALIDATE_OK: { bg: 'event-validate', badge: 'badge-info', icon: Activity },
    VALIDATE_FAIL: { bg: 'event-error', badge: 'badge-blocked', icon: Activity },
    PLUGIN_USE: { bg: 'event-plugin', badge: 'badge-active', icon: Radio },
    PLAY: { bg: 'event-play', badge: 'badge-warning', icon: Play },
    LOGIN_OK: { bg: 'event-device', badge: 'badge-info', icon: Wifi },
    LOGIN_FAIL: { bg: 'event-error', badge: 'badge-blocked', icon: Wifi },
};

export default function LiveActivity() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paused, setPaused] = useState(false);
    const [filter, setFilter] = useState('All');
    const [counter, setCounter] = useState(0);
    const lastTs = useRef(null);

    const fetchFeed = useCallback(async () => {
        try {
            const data = await get('/admin/activity-feed?minutes=60&limit=100');
            const feed = data.feed || [];
            if (!paused) {
                setEvents(prev => {
                    // Merge new events (de-dupe by timestamp+action)
                    const existingKeys = new Set(prev.map(e => `${e.timestamp}|${e.action}|${e.license_key}`));
                    const newEvts = feed.filter(e => !existingKeys.has(`${e.timestamp}|${e.action}|${e.license_key}`));
                    const merged = [...newEvts, ...prev].slice(0, 200);
                    setCounter(merged.filter(e => {
                        const d = new Date(e.timestamp);
                        return Date.now() - d.getTime() < 60000;
                    }).length);
                    return merged;
                });
            }
        } catch { } finally { setLoading(false); }
    }, [paused]);

    useEffect(() => { fetchFeed(); }, []);
    useEffect(() => {
        const id = setInterval(fetchFeed, 5000);
        return () => clearInterval(id);
    }, [fetchFeed]);

    const filtered = events.filter(e => {
        if (filter === 'All') return true;
        return (e.action || '').toUpperCase().includes(filter.replace('_', ''));
    });

    const getColor = (action) => {
        const a = (action || '').toUpperCase();
        for (const [key, val] of Object.entries(EVENT_COLORS)) {
            if (a.includes(key.split('_')[0])) return val;
        }
        return { bg: '', badge: 'badge-info', icon: Activity };
    };

    return (
        <div className="space-y-4">
            {/* Header bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-dot" />
                        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Live Feed</span>
                    </div>
                    <span className="badge badge-info">{counter} / min</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Filter */}
                    <div className="flex items-center gap-1">
                        {['All', 'VALIDATE_OK', 'VALIDATE_FAIL', 'PLAY'].map(t => (
                            <button key={t} onClick={() => setFilter(t)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${filter === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                                {t === 'All' ? 'All' : t.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setPaused(v => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${paused ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {paused ? <><Play className="w-3 h-3" /> Resume</> : <><Pause className="w-3 h-3" /> Pause</>}
                    </button>
                    <button onClick={fetchFeed} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Feed */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>License Info</th>
                                <th>Event Type</th>
                                <th>Device & IP</th>
                                <th>Plugin</th>
                                <th>Content Title</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(8)].map((_, i) => (
                                    <tr key={i}>{[...Array(5)].map((_, j) => <td key={j}><div className="skeleton h-4 w-24 rounded" /></td>)}</tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12 text-[13px] text-slate-400">No events yet — waiting for activity…</td></tr>
                            ) : filtered.map((ev, i) => {
                                const { badge } = getColor(ev.action);
                                return (
                                    <tr key={i} className="fade-in">
                                        <td>
                                            {ev.license_key ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">
                                                        {ev.license_name || 'Unnamed License'}
                                                    </span>
                                                    <button onClick={() => copyText(ev.license_key)} className="flex items-center gap-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">
                                                        {truncKey(ev.license_key)} <Copy className="w-3 h-3 opacity-40" />
                                                    </button>
                                                </div>
                                            ) : <span className="text-slate-400 text-[12px]">—</span>}
                                        </td>
                                        <td><span className={`badge ${badge}`}>{ev.action || ev.type || 'EVENT'}</span></td>
                                        <td className="text-[12px] text-slate-600 dark:text-slate-400">
                                            {ev.ip_address || ev.device_name || ev.device_id ? (
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-[11px] text-slate-700 dark:text-slate-300">
                                                        {ev.device_name || 'Unknown Device'}
                                                    </span>
                                                    <span className="font-mono text-[10px] text-slate-500">
                                                        {ev.ip_address || '—'}
                                                    </span>
                                                    {ev.device_id && (
                                                        <span className="font-mono text-[9px] text-slate-400/80 mt-0.5" title="Raw Device ID">
                                                            ID: {ev.device_id.length > 15 ? ev.device_id.substring(0, 15) + '…' : ev.device_id}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : '—'}
                                        </td>
                                        <td className="text-[12px] text-slate-600 dark:text-slate-400">{ev.plugin_name || '—'}</td>
                                        <td className="text-[12px] text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{ev.video_title || ev.detail || '—'}</td>
                                        <td className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(ev.timestamp)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {paused && (
                    <div className="flex items-center justify-center gap-2 py-3 bg-amber-50 dark:bg-amber-500/5 text-[12px] text-amber-600 dark:text-amber-400 border-t border-amber-100 dark:border-amber-500/10">
                        <Pause className="w-3.5 h-3.5" /> Feed paused — click Resume to continue
                    </div>
                )}
            </div>
        </div>
    );
}
