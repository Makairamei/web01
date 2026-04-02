import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi, useInterval } from '../hooks/useApi';
import { get, formatNumber, truncKey, copyText } from '../lib/api';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
    PlayCircle, ShieldAlert, Monitor, Activity, Users, Film, Copy, Package,
    Clock, RefreshCw, Key, CheckCircle, AlertTriangle, Zap, Smartphone,
    TrendingUp, BarChart3, Eye, Shield, UserCheck, Wifi, WifiOff, Ban,
    Plus, LogIn, AlertOctagon, Server, Timer
} from 'lucide-react';

// ── Mini KPI Card ───────────────────────────────────────
function KPI({ label, value, icon: Icon, color = 'slate', sub, pulse }) {
    const colorMap = {
        indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500',
        emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500',
        rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-500',
        amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-500',
        blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500',
        violet: 'bg-violet-50 dark:bg-violet-500/10 text-violet-500',
        cyan: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-500',
        slate: 'bg-slate-50 dark:bg-slate-800 text-slate-500',
        orange: 'bg-orange-50 dark:bg-orange-500/10 text-orange-500',
        pink: 'bg-pink-50 dark:bg-pink-500/10 text-pink-500',
        teal: 'bg-teal-50 dark:bg-teal-500/10 text-teal-500',
    };
    const borderMap = {
        indigo: 'border-l-indigo-500', emerald: 'border-l-emerald-500', rose: 'border-l-rose-500',
        amber: 'border-l-amber-500', blue: 'border-l-blue-500', violet: 'border-l-violet-500',
        cyan: 'border-l-cyan-500', slate: 'border-l-slate-400', orange: 'border-l-orange-500',
        pink: 'border-l-pink-500', teal: 'border-l-teal-500',
    };
    return (
        <div className={`glass-card px-3 py-2.5 border-l-[3px] ${borderMap[color] || borderMap.slate} flex items-center gap-3 min-h-[56px]`}>
            <div className={`p-1.5 rounded-lg ${colorMap[color] || colorMap.slate} shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight truncate">{label}</div>
                <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-bold text-slate-800 dark:text-white leading-tight ${pulse ? 'animate-pulse' : ''}`}>
                        {typeof value === 'number' ? formatNumber(value) : (value ?? '—')}
                    </span>
                    {sub && <span className="text-[10px] text-slate-400 truncate">{sub}</span>}
                </div>
            </div>
        </div>
    );
}

// ── Insight List (compact) ───────────────────────────────
function InsightList({ items, type, emptyText = 'No data' }) {
    if (!items || items.length === 0) {
        return <div className="flex items-center justify-center py-6 text-[11px] text-slate-400">{emptyText}</div>;
    }
    return (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
            {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2 py-1.5 transition-colors">
                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">{idx + 1}.</span>
                        {type === 'user' && (
                            <div className="flex flex-col truncate min-w-0">
                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.license_name || 'Unnamed'}</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-mono text-slate-400">{truncKey(item.license_key)}</span>
                                    <button onClick={() => copyText(item.license_key)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Copy className="w-2.5 h-2.5 text-slate-400 hover:text-indigo-500" />
                                    </button>
                                </div>
                            </div>
                        )}
                        {type === 'device' && (
                            <div className="flex flex-col truncate min-w-0">
                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                                    {(item.device_alias && item.device_alias.trim()) ? `${item.device_name || 'Device'} (${item.device_alias})` : (item.device_name || 'Unknown')}
                                </span>
                                <span className="text-[9px] text-slate-400 truncate">{item.license_name || truncKey(item.license_key)}</span>
                            </div>
                        )}
                        {type === 'plugin' && (
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.plugin_name}</span>
                        )}
                        {type === 'video' && (
                            <div className="flex flex-col truncate min-w-0">
                                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate" title={item.video_title}>{item.video_title}</span>
                                <span className="text-[9px] text-slate-400">{item.plugin_name}</span>
                            </div>
                        )}
                        {type === 'devices_per_user' && (
                            <div className="flex flex-col truncate min-w-0">
                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.license_name || 'Unnamed'}</span>
                                <span className="text-[9px] font-mono text-slate-400">{truncKey(item.license_key)}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 rounded-md px-2 py-0.5 ml-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {formatNumber(item.activity || item.count || item.play_count || item.device_count)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Tab Button ───────────────────────────────────────
function TabBtn({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                active
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
            {children}
        </button>
    );
}

// ── Insight Card with tabs ───────────────────────────
function InsightCard({ title, icon: Icon, tabs, type }) {
    const [activeTab, setActiveTab] = useState(0);
    const currentData = tabs[activeTab]?.data || [];

    return (
        <div className="glass-card p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-indigo-500" />
                    <h3 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
                </div>
                <div className="flex gap-1">
                    {tabs.map((tab, i) => (
                        <TabBtn key={i} active={activeTab === i} onClick={() => setActiveTab(i)}>{tab.label}</TabBtn>
                    ))}
                </div>
            </div>
            <InsightList items={currentData} type={type} />
        </div>
    );
}

// Custom chart tooltip
const ChartTooltipContent = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-[10px] text-slate-500">{entry.name}:</span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{formatNumber(entry.value)}</span>
                </div>
            ))}
        </div>
    );
};

// PIE chart colors
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// ═══════════════════════════════════════════════════════════
// MAIN ANALYTICS COMPONENT
// ═══════════════════════════════════════════════════════════
export default function Analytics() {
    const [period, setPeriod] = useState('week');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            else setRefreshing(true);
            const data = await get(`/admin/analytics/overview?period=${period}`);
            setStats(data);
            setLastUpdate(new Date());
        } catch (e) {
            console.error('Analytics fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    // Initial load & on period change
    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh every 10 seconds
    useInterval(() => { fetchData(true); }, 10000);

    // ── Build chart data ──────────────────────────────
    // Merge daily validations + failures + playbacks into one dataset for the trend chart
    const buildTrendData = () => {
        if (!stats) return [];
        const dayMap = {};
        (stats.dailyValidations || []).forEach(d => {
            dayMap[d.day] = { ...dayMap[d.day], day: d.day?.slice(5) || d.day, Validations: d.count };
        });
        (stats.dailyPlaybacks || []).forEach(d => {
            dayMap[d.day] = { ...dayMap[d.day], day: d.day?.slice(5) || d.day, Playbacks: d.count };
        });
        (stats.dailyFailures || []).forEach(d => {
            dayMap[d.day] = { ...dayMap[d.day], day: d.day?.slice(5) || d.day, Failures: d.count };
        });
        return Object.values(dayMap).sort((a, b) => (a.day > b.day ? 1 : -1)).map(d => ({
            day: d.day, Validations: d.Validations || 0, Playbacks: d.Playbacks || 0, Failures: d.Failures || 0
        }));
    };

    const trendData = buildTrendData();

    // Build hourly activity data  
    const hourlyData = (stats?.hourlyActivity || []).map(d => ({
        hour: `${d.hour}:00`,
        Activity: d.count || 0
    }));

    // Build pie data for license distribution
    const licPieData = stats ? [
        { name: 'Active', value: stats.activeLicenses || 0 },
        { name: 'Expired', value: stats.expiredLicenses || 0 },
        { name: 'Revoked', value: stats.revokedLicenses || 0 },
        { name: 'Trial', value: stats.trialLicenses || 0 },
    ].filter(d => d.value > 0) : [];

    // ── Skeleton ──────────────────────────────────────
    if (loading && !stats) return (
        <div className="space-y-3">
            <div className="h-10 skeleton rounded-xl" />
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
            </div>
        </div>
    );

    return (
        <div className="space-y-3">
            {/* ── HEADER ──────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        Analytics Dashboard
                    </h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                        Real-time metrics • Auto-refresh every 10s
                        {lastUpdate && <span className="ml-2 text-emerald-500">● Updated {lastUpdate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
                        {[
                            { key: 'today', label: 'Today' },
                            { key: 'week', label: 'This Week' },
                            { key: 'month', label: 'This Month' },
                        ].map(p => (
                            <button
                                key={p.key}
                                onClick={() => setPeriod(p.key)}
                                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                                    period === p.key
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-400'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => fetchData(true)}
                        className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all ${refreshing ? 'animate-spin' : ''}`}
                        title="Refresh now"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── ROW 1: LICENSE KPIs (6 columns) ──────── */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
                <KPI label="Total License" value={stats?.totalLicenses} icon={Key} color="indigo" />
                <KPI label="Active" value={stats?.activeLicenses} icon={CheckCircle} color="emerald" />
                <KPI label="Expired" value={stats?.expiredLicenses} icon={Clock} color="rose" />
                <KPI label="Expiring Soon" value={stats?.expiringSoon} icon={AlertTriangle} color="amber" sub="7 days" />
                <KPI label="Suspended" value={stats?.revokedLicenses} icon={Ban} color="pink" />
                <KPI label="Renewal Rate" value={stats?.licenseRenewalRate != null ? `${stats.licenseRenewalRate}%` : '—'} icon={TrendingUp} color="teal" />
            </div>

            {/* ── ROW 2: DEVICE KPIs (6 columns) ──────── */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
                <KPI label="Device ON" value={stats?.devicesOnline} icon={Wifi} color="emerald" pulse={stats?.devicesOnline > 0} />
                <KPI label="Device OFF" value={stats?.devicesOffline} icon={WifiOff} color="slate" />
                <KPI label="Dev. Expired" value={stats?.devicesExpired} icon={Clock} color="orange" />
                <KPI label="Dev. Blocked" value={stats?.devicesBlocked} icon={Ban} color="rose" />
                <KPI label="New Today" value={stats?.newDevicesToday} icon={Plus} color="cyan" />
                <KPI label="Login Today" value={stats?.deviceLoginToday} icon={LogIn} color="blue" />
            </div>

            {/* ── ROW 3: ACTIVITY KPIs (6 columns) ──────── */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
                <KPI label="Playback Today" value={stats?.todayPlaybacks} icon={PlayCircle} color="indigo" />
                <KPI label="Validation Today" value={stats?.todayValidations} icon={ShieldAlert} color="emerald" />
                <KPI label="Playback OK" value={stats?.playbackSuccess} icon={CheckCircle} color="teal" />
                <KPI label="Validation Fail" value={stats?.validationFailed} icon={AlertOctagon} color="rose" />
                <KPI label="API Requests" value={stats?.apiRequestCount} icon={Server} color="violet" />
                <KPI label="Suspicious" value={stats?.suspiciousDevices} icon={AlertTriangle} color="amber" />
            </div>

            {/* ── ROW 4: CHARTS (3 columns) ──────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Trend Line Chart */}
                <div className="glass-card p-4">
                    <h3 className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                        Activity Trend ({period === 'today' ? '24h' : period === 'month' ? '30d' : '7d'})
                    </h3>
                    {trendData.length === 0 ? (
                        <div className="flex h-[160px] items-center justify-center text-[11px] text-slate-400">No data for this period</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={trendData} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="gPlay" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={formatNumber} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Area type="monotone" dataKey="Validations" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#gVal)" />
                                <Area type="monotone" dataKey="Playbacks" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gPlay)" />
                                <Area type="monotone" dataKey="Failures" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#gFail)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Playback Bar Chart */}
                <div className="glass-card p-4">
                    <h3 className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                        Playback Trend
                    </h3>
                    {(stats?.dailyPlaybacks || []).length === 0 ? (
                        <div className="flex h-[160px] items-center justify-center text-[11px] text-slate-400">No data for this period</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={(stats?.dailyPlaybacks || []).map(d => ({ day: d.day?.slice(5) || d.day, Playbacks: d.count || 0 }))} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={formatNumber} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="Playbacks" fill="#10b981" radius={[3, 3, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Hourly Activity + License Pie */}
                <div className="glass-card p-4">
                    <h3 className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-violet-500" />
                        Activity by Hour (24h)
                    </h3>
                    {hourlyData.length === 0 ? (
                        <div className="flex h-[160px] items-center justify-center text-[11px] text-slate-400">No hourly data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={hourlyData} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3} />
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#94a3b8' }} interval={2} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={formatNumber} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="Activity" fill="#8b5cf6" radius={[2, 2, 0, 0]} barSize={14} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── ROW 5: ADVANCED INSIGHTS (3 columns) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* User Insight */}
                <InsightCard
                    title="User Insight"
                    icon={Users}
                    type="user"
                    tabs={[
                        { label: 'Today', data: stats?.topUsersToday },
                        { label: 'Week', data: stats?.topUsersWeek },
                    ]}
                />

                {/* Plugin Insight */}
                <InsightCard
                    title="Plugin Insight"
                    icon={Package}
                    type="plugin"
                    tabs={[
                        { label: 'Today', data: stats?.topPluginsToday },
                        { label: 'Week', data: stats?.topPluginsWeek },
                        { label: 'All Time', data: stats?.mostPopularPlugin },
                    ]}
                />

                {/* Video Insight */}
                <InsightCard
                    title="Video Insight"
                    icon={Film}
                    type="video"
                    tabs={[
                        { label: 'Today', data: stats?.topVideosToday },
                        { label: 'Week', data: stats?.topVideosWeek },
                        { label: 'All Time', data: stats?.mostPopularVideo },
                    ]}
                />
            </div>

            {/* ── ROW 6: DEVICE + LICENSE INSIGHTS ──── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Top Devices */}
                <InsightCard
                    title="Top Devices"
                    icon={Smartphone}
                    type="device"
                    tabs={[
                        { label: 'Today', data: stats?.topDevicesToday },
                        { label: 'Week', data: stats?.topDevicesWeek },
                    ]}
                />

                {/* Most Devices Per User */}
                <div className="glass-card p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <Monitor className="w-3.5 h-3.5 text-indigo-500" />
                        <h3 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">Devices per License</h3>
                        <span className="text-[9px] ml-auto text-slate-400">
                            avg: {stats?.avgDevicesPerLicense ?? '—'}
                        </span>
                    </div>
                    <InsightList items={stats?.mostDevicesPerUser} type="devices_per_user" />
                </div>

                {/* License Distribution Pie */}
                <div className="glass-card p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <Key className="w-3.5 h-3.5 text-indigo-500" />
                        <h3 className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">License Distribution</h3>
                    </div>
                    {licPieData.length === 0 ? (
                        <div className="flex h-[180px] items-center justify-center text-[11px] text-slate-400">No data</div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="50%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={licPieData}
                                        cx="50%" cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={3}
                                        dataKey="value"
                                        strokeWidth={0}
                                    >
                                        {licPieData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltipContent />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2">
                                {licPieData.map((entry, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        <span className="text-[11px] text-slate-600 dark:text-slate-400">{entry.name}</span>
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 ml-auto">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
