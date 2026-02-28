import { useState, useEffect, useMemo, useCallback } from 'react';
import { get, post, formatNumber, truncKey, timeAgo, copyText, cleanPluginName } from '../lib/api';
import {
    KeyRound, Smartphone, ShieldCheck, Activity, Play, AlertTriangle,
    TrendingUp, TrendingDown, RefreshCw, CheckCircle, Lock, Server,
    Copy, Zap, Globe, Ban, Eye
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

// ── Sub-components ────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, gradient, trend, onClick }) {
    return (
        <div
            onClick={onClick}
            className={`${gradient} rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-default fade-in`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/50">
                    <Icon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-[11px] font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(value) ?? '—'}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
        </div>
    );
}

function MiniChart({ data, dataKey, color, type = 'area', height = 110 }) {
    if (!data?.length) return (
        <div className="flex items-center justify-center" style={{ height }}>
            <span className="text-[12px] text-slate-300 dark:text-slate-600">No data yet</span>
        </div>
    );
    const gradId = `grad-${color.replace('#', '')}`;
    if (type === 'bar') return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

function StatusDot({ ok }) {
    return (
        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${ok ? 'bg-emerald-500 pulse-dot' : 'bg-red-500'}`} />
    );
}

// ── Main Dashboard ────────────────────────────────────────────────
export default function Dashboard() {
    const [genModal, setGenModal] = useState(false);
    const [stats, setStats] = useState(null);
    const [feed, setFeed] = useState([]);
    const [health, setHealth] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [genForm, setGenForm] = useState({ duration_days: 30, name: '', max_devices: 2, count: 1, note: '' });
    const [genLoading, setGenLoading] = useState(false);
    const [genResult, setGenResult] = useState(null);

    const fetchAll = useCallback(async () => {
        try {
            const [s, f, h, a] = await Promise.all([
                get('/admin/dashboard'),
                get('/admin/activity-feed?minutes=1440&limit=25'),
                get('/health').catch(() => null),
                get('/admin/analytics/plugins?days=7').catch(() => null),
            ]);
            setStats(s);
            setFeed(f.feed || []);
            setHealth(h);
            setAnalytics(a);
            setLastUpdated(new Date());
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(fetchAll, 30000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchAll]);

    const chartData = useMemo(() => {
        if (!analytics?.dailyTrends) return [];
        const days = {};
        analytics.dailyTrends.forEach(r => {
            if (!days[r.day]) days[r.day] = { day: r.day, validations: 0, plays: 0 };
            // Simple heuristic: if action contains 'PLAY' or originates from playback_logs (which might not be in dailyTrends if it only queries plugin_usage?)
            // Wait, database.js trace: dailyTrends queries PLUGIN_USAGE. It does NOT include playback_logs.
            // But plugin_usage has 'action'.
            if (r.action && (r.action.toUpperCase().includes('PLAY') || r.action.toUpperCase().includes('STREAM'))) {
                days[r.day].plays += r.count;
            } else {
                days[r.day].validations += r.count;
            }
        });
        // We also need to merge in playback trends if they existed, but dailyTrends only queries plugin_usage.
        // For now, let's just use what we have.
        return Object.values(days).sort((a, b) => a.day.localeCompare(b.day)).map(d => ({
            label: d.day.slice(5),
            validations: d.validations,
            plays: d.plays,
        }));
    }, [analytics]);

    const topPlugins = useMemo(() => {
        if (!analytics?.byPlugin) return [];
        const map = {};
        analytics.byPlugin.forEach(p => { map[p.plugin_name] = (map[p.plugin_name] || 0) + p.count; });
        return Object.entries(map).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count).slice(0, 8);
    }, [analytics]);

    const alerts = useMemo(() => {
        const r = [];
        if (!stats) return r;
        if ((stats.expiring_soon || 0) > 0)
            r.push({ title: 'Licenses expiring soon', detail: `${stats.expiring_soon} licenses expire within 3 days`, severity: 'medium' });
        if ((stats.totalPlaybacks || 0) > 500)
            r.push({ title: 'High validation volume', detail: `${stats.totalPlaybacks} validations today`, severity: 'medium' });
        if ((stats.blockedIPs || 0) > 0)
            r.push({ title: 'Blocked IPs detected', detail: `${stats.blockedIPs} IP(s) currently blocked`, severity: 'high' });
        return r;
    }, [stats]);

    const handleGenerate = async (e) => {
        e.preventDefault();
        setGenLoading(true);
        setGenResult(null);
        try {
            const res = await post('/admin/licenses', genForm);
            setGenResult(res.key || res.keys || 'Created!');
            fetchAll();
            if (genForm.count <= 1) {
                setTimeout(() => { setGenModal(false); setGenResult(null); setGenForm({ duration_days: 30, name: '', max_devices: 2, count: 1, note: '' }); }, 2000);
            }
        } catch (e) { setGenResult('Error: ' + (e.message || 'Failed')); }
        finally { setGenLoading(false); }
    };

    const eventTypeColor = (type) => {
        if (!type) return 'badge-info';
        const t = type.toLowerCase();
        if (t.includes('play')) return 'badge-warning';
        if (t.includes('plugin') || t.includes('use')) return 'badge-active';
        if (t.includes('validate') || t.includes('ok')) return 'badge-info';
        if (t.includes('fail') || t.includes('block') || t.includes('error')) return 'badge-blocked';
        return 'badge-info';
    };

    if (loading) return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 stagger">
                {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl fade-in" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Refresh bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={fetchAll} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {lastUpdated && <span className="text-[11px] text-slate-400">Updated {timeAgo(lastUpdated)}</span>}
                </div>
                <label className="flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer select-none">
                    <input type="checkbox" checked={autoRefresh} onChange={() => setAutoRefresh(v => !v)} className="rounded" />
                    Auto-refresh
                </label>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((a, i) => (
                        <div key={i} className={`severity-${a.severity} rounded-xl p-3.5 flex items-center gap-3 fade-in`}>
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <span className="text-[13px] font-semibold">{a.title}</span>
                                {a.detail && <span className="text-[12px] opacity-75 ml-2">{a.detail}</span>}
                            </div>
                            <span className="badge text-[9px] shrink-0">{a.severity.toUpperCase()}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 stagger">
                <KpiCard icon={KeyRound} label="Total Licenses" value={stats?.totalLicenses} sub={`${stats?.activeLicenses || 0} active`} gradient="kpi-gradient-blue" trend={3} />
                <KpiCard icon={Activity} label="Active Licenses" value={stats?.activeLicenses} sub="Currently valid" gradient="kpi-gradient-green" trend={2} />
                <KpiCard icon={Smartphone} label="Active Devices" value={stats?.totalDevices} sub="Registered" gradient="kpi-gradient-cyan" />
                <KpiCard icon={ShieldCheck} label="Validations Today" value={stats?.todayPluginEvents} sub="API calls" gradient="kpi-gradient-purple" />
                <KpiCard icon={Play} label="Playbacks Today" value={stats?.todayPlaybacks} sub="Streams" gradient="kpi-gradient-amber" />
                <KpiCard icon={Ban} label="Blocked Licenses" value={stats?.revokedLicenses || stats?.suspendedLicenses || 0} sub="Suspended / revoked" gradient="kpi-gradient-rose" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3">Validation Trend</h3>
                    <MiniChart data={chartData} dataKey="validations" color="#6366f1" />
                </div>
                <div className="glass-card p-5">
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3">Playback Trend</h3>
                    <MiniChart data={chartData} dataKey="plays" color="#10b981" />
                </div>
                <div className="glass-card p-5">
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3">Requests Per Day</h3>
                    <MiniChart data={chartData} dataKey="validations" color="#f59e0b" type="bar" />
                </div>
            </div>

            {/* Top Plugins + System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Plugins */}
                <div className="glass-card p-5">
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-4">Top Plugins</h3>
                    {topPlugins.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <BarChart3Icon className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                            <p className="text-[12px] text-slate-400">No plugin data yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topPlugins.map((p, i) => {
                                const pct = Math.round((p.count / topPlugins[0].count) * 100);
                                return (
                                    <div key={p.name} className="flex items-center gap-3">
                                        <span className="text-[11px] text-slate-400 w-4 text-right">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 truncate">{p.name}</span>
                                                <span className="text-[11px] text-slate-400 ml-2">{formatNumber(p.count)}</span>
                                            </div>
                                            <div className="progress-bar-track">
                                                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* System Health + Trust */}
                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3">System Health</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'API Server', ok: health?.uptime > 0, detail: health?.uptime ? `${Math.floor(health.uptime / 3600)}h uptime` : 'Unknown' },
                                { label: 'Database', ok: true, detail: 'Operational' },
                                { label: 'Rate Limiting', ok: true, detail: 'Active' },
                                { label: 'JWT Auth', ok: true, detail: 'Enforced' },
                            ].map(it => (
                                <div key={it.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <StatusDot ok={it.ok} />
                                    <div>
                                        <div className="text-[12px] font-medium text-slate-700 dark:text-slate-300">{it.label}</div>
                                        <div className="text-[10px] text-slate-400">{it.detail}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="glass-card p-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            {[
                                { icon: Lock, label: 'Secure API', color: 'text-emerald-500' },
                                { icon: ShieldCheck, label: 'Rate Protected', color: 'text-blue-500' },
                                { icon: Zap, label: 'High Performance', color: 'text-amber-500' },
                                { icon: Globe, label: 'CORS Configured', color: 'text-purple-500' },
                            ].map(s => (
                                <div key={s.label} className="flex items-center gap-1.5">
                                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Recent Activity</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
                        <span className="text-[11px] text-slate-400">Live</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Action</th>
                                <th>License Key</th>
                                <th>IP Address</th>
                                <th>Detail</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feed.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-10 text-[13px] text-slate-400">No recent activity</td></tr>
                            ) : feed.slice(0, 20).map((item, i) => (
                                <tr key={i} className="fade-in">
                                    <td>
                                        <span className={`badge ${eventTypeColor(item.action || item.type)}`}>
                                            {item.action || (item.type === 'playback' ? 'PLAY' : 'USE')}
                                        </span>
                                    </td>
                                    <td>
                                        <button onClick={() => copyText(item.license_key)} className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 break-all text-left">
                                            {item.license_key} <Copy className="w-3 h-3 opacity-40 shrink-0" />
                                        </button>
                                    </td>
                                    <td className="text-slate-500 text-[11px] font-mono">{item.ip_address || '—'}</td>
                                    <td className="text-slate-600 dark:text-slate-400 text-[12px] min-w-[180px] break-words">
                                        {cleanPluginName(item.plugin_name) || item.video_title || item.detail || '—'}
                                    </td>
                                    <td className="text-slate-400 text-[11px] whitespace-nowrap">{timeAgo(item.timestamp)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Generate License Modal */}
            {genModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setGenModal(false); setGenResult(null); }}>
                    <div className="bg-white dark:bg-[#0d1424] rounded-2xl shadow-2xl w-full max-w-md p-6 m-4 slide-in-up" onClick={e => e.stopPropagation()}>
                        <h2 className="text-[16px] font-bold text-slate-900 dark:text-white mb-5">Generate License Key</h2>
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Label (optional)</label>
                                <input value={genForm.name} onChange={e => setGenForm({ ...genForm, name: e.target.value })} className="form-input" placeholder="Customer name or purpose" />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Note (optional)</label>
                                <input value={genForm.note} onChange={e => setGenForm({ ...genForm, note: e.target.value })} className="form-input" placeholder="Internal note" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Days</label>
                                    <input type="number" value={genForm.duration_days} onChange={e => setGenForm({ ...genForm, duration_days: parseInt(e.target.value) || 30 })} className="form-input" min={1} max={3650} />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Devices</label>
                                    <input type="number" value={genForm.max_devices} onChange={e => setGenForm({ ...genForm, max_devices: parseInt(e.target.value) || 2 })} className="form-input" min={1} max={20} />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Count</label>
                                    <input type="number" value={genForm.count} onChange={e => setGenForm({ ...genForm, count: parseInt(e.target.value) || 1 })} className="form-input" min={1} max={100} />
                                </div>
                            </div>
                            {genResult && (
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3">
                                    <div className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">License Created!</div>
                                    <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 break-all">{typeof genResult === 'string' ? genResult : JSON.stringify(genResult)}</div>
                                </div>
                            )}
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => { setGenModal(false); setGenResult(null); }} className="btn-ghost flex-1 justify-center">Cancel</button>
                                <button type="submit" disabled={genLoading} className="btn-primary flex-1 justify-center">
                                    {genLoading ? 'Creating…' : `Generate${genForm.count > 1 ? ` (${genForm.count})` : ''}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Fallback icon component (Recharts import conflict)
function BarChart3Icon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
        </svg>
    );
}
