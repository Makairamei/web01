import { useState, useEffect, useMemo, useCallback } from 'react';
import { get, post, formatNumber, truncKey, timeAgo, copyText, cleanPluginName, formatWIB } from '../lib/api';
import {
    KeyRound, Smartphone, ShieldCheck, Activity, Play, AlertTriangle,
    TrendingUp, TrendingDown, RefreshCw, Copy, Ban, Wifi, WifiOff, Monitor, Clock
} from 'lucide-react';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

// ── Sub-components ────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, gradient, accent }) {
    return (
        <div className={`${gradient} rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-default fade-in`}>
            <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/50">
                    <Icon className={`w-4 h-4 ${accent || 'text-slate-700 dark:text-slate-300'}`} />
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(value) ?? '—'}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-xl min-w-[140px]">
                <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2.5 uppercase tracking-wider">{label}</p>
                <div className="space-y-2">
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}60` }} />
                                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200 capitalize">{entry.name}</span>
                            </div>
                            <span className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums">
                                {formatNumber(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

function SalesChart({ data, height = 280 }) {
    if (!data?.length) return (
        <div className="flex items-center justify-center" style={{ height }}>
            <span className="text-[13px] text-slate-400 dark:text-slate-500 font-medium">No data yet</span>
        </div>
    );
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }} barGap={2} barCategoryGap="25%">
                <defs>
                    <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="gradExpirations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="gradBlocks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800/50" />
                <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} dy={8} />
                <YAxis tick={{ fontSize: 10.5, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} dx={-8} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)', radius: 6 }} />
                <Bar dataKey="sales" name="New Licenses" fill="url(#gradSales)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expirations" name="Expired" fill="url(#gradExpirations)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="blocks" name="Blocked" fill="url(#gradBlocks)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
        </ResponsiveContainer>
    );
}

function LicenseStatusChart({ data, height = 280 }) {
    if (!data?.length) return (
        <div className="flex items-center justify-center" style={{ height }}>
            <span className="text-[13px] text-slate-400 dark:text-slate-500 font-medium">No license data yet</span>
        </div>
    );
    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={data}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
            </PieChart>
        </ResponsiveContainer>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────
const RANGE_OPTIONS = [
    { value: '7', label: 'Last 7 Days' },
    { value: '30', label: 'Last 30 Days' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatChartLabel(raw, range) {
    if (!raw) return '';
    // Monthly format: "2026-03" → "Mar 2026"
    if (range === 'year' || range === 'all') {
        const [y, m] = raw.split('-');
        return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
    }
    // Daily format: "2026-03-07" → "07 Mar"
    const parts = raw.split('-');
    if (parts.length === 3) {
        return `${parts[2]} ${MONTH_NAMES[parseInt(parts[1], 10) - 1]}`;
    }
    return raw;
}

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [feed, setFeed] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [salesData, setSalesData] = useState(null);
    const [salesRange, setSalesRange] = useState('30');
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchSales = useCallback(async (range) => {
        try {
            const sales = await get(`/admin/analytics/sales?days=${range}`);
            setSalesData(sales);
        } catch { }
    }, []);

    const fetchAll = useCallback(async () => {
        try {
            const [s, f, a] = await Promise.all([
                get('/admin/dashboard'),
                get('/admin/activity-feed?minutes=1440&limit=25'),
                get('/admin/analytics/plugins?days=7').catch(() => null),
            ]);
            setStats(s);
            setFeed(f.feed || []);
            setAnalytics(a);
            setLastUpdated(new Date());
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); fetchSales(salesRange); }, [fetchAll, fetchSales, salesRange]);
    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(() => { fetchAll(); fetchSales(salesRange); }, 30000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchAll, fetchSales, salesRange]);

    // Build license activity chart data (licenses vs expirations vs blocks)
    const salesChartData = useMemo(() => {
        if (!salesData?.salesTrend) return [];
        const days = {};

        const addData = (arr, key) => {
            (arr || []).forEach(r => {
                if (!days[r.day]) days[r.day] = { day: r.day, sales: 0, expirations: 0, blocks: 0 };
                days[r.day][key] += r.count;
            });
        };

        addData(salesData.salesTrend, 'sales');
        addData(salesData.expirationsTrend, 'expirations');
        addData(salesData.blocksTrend, 'blocks');

        return Object.values(days).sort((a, b) => a.day.localeCompare(b.day)).map(d => ({
            label: formatChartLabel(d.day, salesRange),
            sales: d.sales,
            expirations: d.expirations,
            blocks: d.blocks
        }));
    }, [salesData, salesRange]);

    // Build license health pie chart data
    const licenseHealthData = useMemo(() => {
        if (!salesData?.licenseHealth) return [];
        const { active, expired, revoked } = salesData.licenseHealth;
        return [
            { name: 'Active', value: active, color: '#10b981' },
            { name: 'Expired', value: expired, color: '#f59e0b' },
            { name: 'Blocked', value: revoked, color: '#ef4444' }
        ].filter(d => d.value > 0);
    }, [salesData]);

    // Top plugins list
    const topPlugins = useMemo(() => {
        if (!analytics?.byPlugin) return [];
        const map = {};
        analytics.byPlugin.forEach(p => { map[p.plugin_name] = (map[p.plugin_name] || 0) + p.count; });
        return Object.entries(map).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count).slice(0, 8);
    }, [analytics]);

    // Top content (most watched)
    const topContent = useMemo(() => {
        if (!analytics?.topContent) return [];
        return analytics.topContent.slice(0, 6);
    }, [analytics]);

    // Alerts
    const alerts = useMemo(() => {
        const r = [];
        if (!stats) return r;
        if ((stats.expiring_soon || 0) > 0)
            r.push({ title: 'Licenses expiring soon', detail: `${stats.expiring_soon} licenses expire within 3 days`, severity: 'medium' });
        if ((stats.blockedIPs || 0) > 0)
            r.push({ title: 'Blocked IPs detected', detail: `${stats.blockedIPs} IP(s) currently blocked`, severity: 'high' });
        return r;
    }, [stats]);

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 stagger">
                {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl fade-in" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
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
                        </div>
                    ))}
                </div>
            )}

            {/* KPI Row — 5 cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 stagger">
                <KpiCard icon={KeyRound} label="Total Licenses" value={stats?.totalLicenses} sub={`${stats?.activeLicenses || 0} active · ${stats?.expiredLicenses || 0} expired`} gradient="kpi-gradient-blue" accent="text-blue-600" />
                <KpiCard icon={Wifi} label="Online Devices" value={stats?.activeDevices} sub={`${stats?.totalDevices || 0} registered`} gradient="kpi-gradient-green" accent="text-emerald-600" />
                <KpiCard icon={Activity} label="Plugins Today" value={stats?.todayPluginEvents} sub="Plugin events" gradient="kpi-gradient-purple" accent="text-indigo-600" />
                <KpiCard icon={Play} label="Playbacks Today" value={stats?.todayPlaybacks} sub="Video streams" gradient="kpi-gradient-amber" accent="text-amber-600" />
                <KpiCard icon={Ban} label="Blocked" value={(stats?.revokedLicenses || 0) + (stats?.blockedIPs || 0) + (stats?.blockedDevices || 0)} sub={`${stats?.revokedLicenses || 0} licenses · ${stats?.blockedDevices || 0} devices · ${stats?.blockedIPs || 0} IPs`} gradient="kpi-gradient-rose" accent="text-red-500" />
            </div>

            {/* Charts Row — 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="glass-card p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">License Activity Trend</h3>
                        <select
                            value={salesRange}
                            onChange={e => setSalesRange(e.target.value)}
                            className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                        >
                            {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <SalesChart data={salesChartData} />
                    <div className="flex items-center justify-center gap-6 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(to bottom, #818cf8, #6366f1)' }} />
                            <span className="text-[10.5px] font-medium text-slate-500">New Licenses</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(to bottom, #fbbf24, #f59e0b)' }} />
                            <span className="text-[10.5px] font-medium text-slate-500">Expired</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(to bottom, #f87171, #ef4444)' }} />
                            <span className="text-[10.5px] font-medium text-slate-500">Blocked</span>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5 lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">License Health Overview</h3>
                        <span className="text-[10px] text-slate-400">All Time</span>
                    </div>
                    <LicenseStatusChart data={licenseHealthData} />
                    <div className="flex items-center justify-center gap-4 mt-3">
                        {licenseHealthData.map((d, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                                <span className="text-[10px] text-slate-500">{d.name} <span className="font-semibold text-slate-700 dark:text-slate-300">{d.value}</span></span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Plugins + Most Watched */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Plugins */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Top Plugins</h3>
                        <span className="text-[10px] text-slate-400">7 days</span>
                    </div>
                    {topPlugins.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <BarChart3Icon className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                            <p className="text-[12px] text-slate-400">No plugin data yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {topPlugins.map((p, i) => {
                                const pct = Math.round((p.count / topPlugins[0].count) * 100);
                                const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-rose-500'];
                                return (
                                    <div key={p.name} className="group">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white ${colors[i % colors.length]}`}>
                                                    {i + 1}
                                                </span>
                                                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 truncate">{cleanPluginName(p.name)}</span>
                                            </div>
                                            <span className="text-[11px] font-semibold text-slate-500 ml-2 tabular-nums">{formatNumber(p.count)}</span>
                                        </div>
                                        <div className="ml-[30px]">
                                            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <div className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-700`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Most Watched Content */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Most Watched</h3>
                        <span className="text-[10px] text-slate-400">7 days</span>
                    </div>
                    {topContent.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <Play className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                            <p className="text-[12px] text-slate-400">No playback data yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {topContent.map((c, i) => (
                                <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                                        <Play className="w-3 h-3 text-amber-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[12px] font-medium text-slate-700 dark:text-slate-300 truncate">{c.video_title || 'Unknown'}</div>
                                        <div className="text-[10px] text-slate-400 truncate">{cleanPluginName(c.plugin_name)}</div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[12px] font-semibold text-slate-600 dark:text-slate-400 tabular-nums">{c.play_count}×</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
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
                {feed.length === 0 ? (
                    <div className="py-12 text-center text-[13px] text-slate-400">No recent activity</div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {feed.slice(0, 15).map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors fade-in">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'playback'
                                    ? 'bg-amber-50 dark:bg-amber-500/10'
                                    : 'bg-indigo-50 dark:bg-indigo-500/10'
                                    }`}>
                                    {item.type === 'playback'
                                        ? <Play className="w-3.5 h-3.5 text-amber-500" />
                                        : <Activity className="w-3.5 h-3.5 text-indigo-500" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 truncate">
                                            {cleanPluginName(item.plugin_name) || item.video_title || item.detail || '—'}
                                        </span>
                                        <span className={`badge ${eventTypeColor(item.action || item.type)} text-[9px] shrink-0`}>
                                            {item.action || (item.type === 'playback' ? 'PLAY' : 'USE')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                        {item.device_name && <span>{item.device_name}</span>}
                                        {item.device_name && item.ip_address && <span>·</span>}
                                        {item.ip_address && <span className="font-mono">{item.ip_address}</span>}
                                        {item.video_title && item.plugin_name && (
                                            <><span>·</span><span className="truncate">{item.video_title}</span></>
                                        )}
                                    </div>
                                </div>
                                <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{timeAgo(item.timestamp)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
