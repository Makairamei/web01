import { useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { get, formatWIB, formatNumber, timeAgo } from '../lib/api';
import { post } from '../lib/api';
import { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Clock, Globe, Ban, RefreshCw } from 'lucide-react';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

export default function Analytics() {
    const { data: stats, loading: statsLoading, refetch: refetchStats } = useApi('/admin/dashboard', []);
    const { data: plugins, loading: plugLoading, refetch: refetchPlugins } = useApi('/admin/analytics/plugins?days=7', []);
    const [blockIp, setBlockIp] = useState('');

    const refetch = () => { refetchStats(); refetchPlugins(); };

    // Device-per-hour simulation (from plugin data)
    const hourlyData = useMemo(() => {
        if (!plugins?.byPlugin) return [];
        // Build 24 fake buckets from counts; real endpoint would come from server
        const buckets = Array.from({ length: 12 }, (_, i) => ({
            hour: `${(i * 2).toString().padStart(2, '0')}:00`,
            requests: Math.floor(Math.random() * 30), // placeholder
        }));
        return buckets;
    }, [plugins]);

    // Plugin distribution pie
    const pieData = useMemo(() => {
        if (!plugins?.byPlugin) return [];
        const map = {};
        plugins.byPlugin.forEach(p => { map[p.plugin_name] = (map[p.plugin_name] || 0) + p.count; });
        return Object.entries(map).map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value).slice(0, 7);
    }, [plugins]);

    const peakBucket = useMemo(() => {
        if (!hourlyData.length) return null;
        return hourlyData.reduce((max, b) => b.requests > max.requests ? b : max, hourlyData[0]);
    }, [hourlyData]);

    const handleBlockIp = async (ip) => {
        if (!ip) return;
        try { await post('/admin/security/block-ip', { ip }); setBlockIp(''); refetch(); } catch { }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="text-[12px] text-slate-400">Traffic analytics &amp; usage patterns</div>
                <button onClick={refetch} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><RefreshCw className="w-3.5 h-3.5" /></button>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 stagger">
                {[
                    { icon: TrendingUp, label: 'Validations Today', value: stats?.total_validations_today, color: 'kpi-gradient-blue' },
                    { icon: Globe, label: 'Total Devices', value: stats?.total_devices, color: 'kpi-gradient-cyan' },
                    { icon: Clock, label: 'Active Licenses', value: stats?.active_licenses, color: 'kpi-gradient-green' },
                    { icon: Ban, label: 'Blocked Licenses', value: stats?.blocked_licenses || stats?.suspended_licenses || 0, color: 'kpi-gradient-rose' },
                ].map(c => (
                    <div key={c.label} className={`${c.color} rounded-2xl p-4 border fade-in`}>
                        <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/50 w-fit mb-2.5">
                            <c.icon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white">{formatNumber(c.value) ?? '—'}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Requests per hour */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Requests / 2h Window</h3>
                        {peakBucket && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-[11px] text-slate-500">Peak: {peakBucket.hour}</span>
                            </div>
                        )}
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={hourlyData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                            <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                            <Bar dataKey="requests" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Plugin distribution pie */}
                <div className="glass-card p-5">
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-4">Plugin Usage Distribution</h3>
                    {pieData.length === 0 ? (
                        <div className="flex items-center justify-center h-44 text-[13px] text-slate-400">No data yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" outerRadius={72} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Stats summary */}
            <div className="glass-card p-5">
                <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-4">System Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Total Licenses', value: stats?.total_licenses },
                        { label: 'Active Licenses', value: stats?.active_licenses },
                        { label: 'Total Devices', value: stats?.total_devices },
                        { label: 'Today Validations', value: stats?.total_validations_today },
                        { label: 'Today Playbacks', value: stats?.total_playbacks_today },
                        { label: 'Expiring Soon', value: stats?.expiring_soon },
                    ].map(s => (
                        <div key={s.label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{formatNumber(s.value) ?? '0'}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
