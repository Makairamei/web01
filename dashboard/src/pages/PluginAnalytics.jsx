import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { formatWIB, formatNumber } from '../lib/api';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    LineChart, Line, Legend
} from 'recharts';
import { RefreshCw, Download } from 'lucide-react';

export default function PluginAnalytics() {
    const [days, setDays] = useState('7');
    const { data, loading, refetch } = useApi(`/admin/analytics/plugins?days=${days}`, [days]);

    const topPlugins = useMemo(() => {
        if (!data?.byPlugin) return [];
        const map = {};
        data.byPlugin.forEach(p => { map[p.plugin_name] = (map[p.plugin_name] || 0) + p.count; });
        return Object.entries(map).map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count).slice(0, 10);
    }, [data]);

    const trendData = useMemo(() => {
        if (!data?.dailyTrends) return [];
        return [...data.dailyTrends].reverse().map(d => ({
            day: d.day?.slice(5) || '',
            uses: d.plugin_uses || 0,
            plays: d.playbacks || 0,
        }));
    }, [data]);

    const pluginRows = useMemo(() => {
        if (!data?.byPlugin) return [];
        const map = {};
        data.byPlugin.forEach(p => {
            if (!map[p.plugin_name]) map[p.plugin_name] = { uses: 0, last: p.created_at };
            map[p.plugin_name].uses += p.count;
            if (p.created_at > map[p.plugin_name].last) map[p.plugin_name].last = p.created_at;
        });
        return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.uses - a.uses);
    }, [data]);

    if (loading) return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
            </div>
            <div className="skeleton h-64 rounded-2xl" />
        </div>
    );

    const exportCsv = () => {
        if (pluginRows.length === 0) return;
        const csv = ['Plugin Name,Total Uses,Last Used\n']
            .concat(pluginRows.map(p => `"${p.name}",${p.uses},"${p.last}"`)).join('\n');
        const win = window.open('', '_blank');
        win.document.write(`<pre>${csv}</pre>`);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <select
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className="form-input py-1.5 text-[12px] font-semibold bg-white dark:bg-slate-800 w-auto cursor-pointer"
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
                <button onClick={refetch} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top 10 bar */}
                <div className="glass-card p-5">
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-4">Top Plugins ({days === 'all' ? 'All-time' : `${days} days`})</h3>
                    {topPlugins.length === 0 ? <div className="py-10 text-center text-[13px] text-slate-400">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={topPlugins} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f1f5f9', opacity: 0.4 }} contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="count" fill="url(#colorCount)" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Daily trend */}
                <div className="glass-card p-5">
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-4">Usage Trend ({days === 'all' ? 'All-time' : `${days} days`})</h3>
                    {trendData.length === 0 ? <div className="py-10 text-center text-[13px] text-slate-400">No data</div> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={trendData} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorUses" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Line type="monotone" dataKey="uses" stroke="#6366f1" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 4 }} name="Plugin Uses" />
                                <Line type="monotone" dataKey="plays" stroke="#10b981" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 4 }} name="Playbacks" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Plugin table */}
            <div className="glass-card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Plugin Stats</h3>
                    <button onClick={exportCsv} className="btn-ghost py-1 px-2 text-[11px]">
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Plugin Name</th>
                                <th>Total Uses</th>
                                <th>Last Used</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pluginRows.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-10 text-[13px] text-slate-400">No plugin data</td></tr>
                            ) : pluginRows.map((p, i) => (
                                <tr key={p.name}>
                                    <td className="text-slate-400 text-[12px]">#{i + 1}</td>
                                    <td className="font-medium text-[13px]">{p.name}</td>
                                    <td className="text-[13px]">{formatNumber(p.uses)}</td>
                                    <td className="text-[12px] text-slate-400">{formatWIB(p.last)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
