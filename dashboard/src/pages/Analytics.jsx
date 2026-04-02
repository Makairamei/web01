import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { formatNumber, truncKey, copyText } from '../lib/api';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { PlayCircle, ShieldAlert, Monitor, Activity, Users, Film, CheckCircle, AlertTriangle, Copy, Package, Clock, RefreshCw } from 'lucide-react';

// Reusable Top10 Card Component
function TopListCard({ title, icon: Icon, items, type }) {
    if (!items || items.length === 0) {
        return (
            <div className="glass-card p-5 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
                </div>
                <div className="flex items-center justify-center flex-1 text-[13px] text-slate-400">No data available</div>
            </div>
        );
    }

    return (
        <div className="glass-card p-5 h-full">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Icon className="w-4 h-4 text-indigo-500" />
                <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            </div>
            <div className="space-y-3">
                {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-[11px] font-mono text-slate-400 w-4">{idx + 1}.</span>
                            {type === 'user' && (
                                <div className="flex flex-col truncate">
                                    <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.license_name || 'Unnamed License'}</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-[10px] font-mono text-slate-500">{truncKey(item.license_key)}</span>
                                        <button onClick={() => copyText(item.license_key)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy className="w-3 h-3 text-slate-400 hover:text-indigo-500" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            {type === 'device' && (
                                <div className="flex flex-col truncate">
                                    <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.device_name || 'Unknown Device'}</span>
                                    <span className="text-[10px] text-slate-500 truncate">{item.license_name || truncKey(item.license_key)}</span>
                                </div>
                            )}
                            {type === 'plugin' && (
                                <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 truncate">{item.plugin_name}</span>
                            )}
                            {type === 'video' && (
                                <div className="flex flex-col truncate">
                                    <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300 truncate" title={item.video_title}>{item.video_title}</span>
                                    <span className="text-[10px] text-slate-500">{item.plugin_name}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-800/80 rounded-md px-2 py-1 min-w-[32px]">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{formatNumber(item.activity || item.count || item.play_count)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Analytics() {
    const { data: stats, loading, refetch } = useApi('/admin/dashboard', []);

    // Transform dailyTrend data for charts
    const trendData = (stats?.dailyTrend || []).map(d => ({
        day: d.day?.slice(5) || '', // MM-DD
        Validations: d.validations || 0,
        Failures: d.failures || 0
    }));

    const playbacksData = (stats?.dailyPlaybacks || []).map(d => ({
        day: d.day?.slice(5) || '',
        Playbacks: d.count || 0
    }));

    if (loading) return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="skeleton h-64 rounded-2xl" />
                <div className="skeleton h-64 rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-80 rounded-2xl" />)}
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Analytics Deep Dive</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">Real-time metrics, health status, and top usage tracking.</p>
                </div>
                <button onClick={refetch} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Top KPI ROW - Core Activity & Validation Health */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
                {/* Playbacks */}
                <div className="glass-card p-4 border-l-4 border-l-indigo-500 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">Playback Today</div>
                            <div className="text-2xl font-bold text-slate-800 dark:text-white">{formatNumber(stats?.todayPlaybacks)}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10"><PlayCircle className="w-5 h-5 text-indigo-500" /></div>
                    </div>
                </div>

                {/* Validation Valid */}
                <div className="glass-card p-4 border-l-4 border-l-emerald-500 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">License Validated</div>
                            <div className="text-2xl font-bold text-slate-800 dark:text-white">{formatNumber(stats?.validationsToday)}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10"><CheckCircle className="w-5 h-5 text-emerald-500" /></div>
                    </div>
                </div>

                {/* Validation Failed */}
                <div className="glass-card p-4 border-l-4 border-l-rose-500 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">Validation Failed</div>
                            <div className="text-2xl font-bold text-slate-800 dark:text-white">{formatNumber(stats?.validationFailedToday)}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10"><ShieldAlert className="w-5 h-5 text-rose-500" /></div>
                    </div>
                </div>

                {/* System API Load */}
                <div className="glass-card p-4 border-l-4 border-l-blue-500 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">Total Validations</div>
                            <div className="text-2xl font-bold text-slate-800 dark:text-white">{formatNumber(stats?.totalPluginEvents)}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10"><Activity className="w-5 h-5 text-blue-500" /></div>
                    </div>
                </div>
            </div>

            {/* Second Row: Detailed Device Status & Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Device Status Block (4 cols) */}
                <div className="lg:col-span-4 glass-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Monitor className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">Device Overview</h3>
                    </div>
                    
                    <div className="flex flex-col gap-4 mt-6">
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] text-slate-500">Total Devices</span>
                            <span className="text-[18px] font-bold text-slate-800 dark:text-white">{formatNumber(stats?.totalDevices)}</span>
                        </div>
                        
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Online</span>
                            </div>
                            <span className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(stats?.activeDevices)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Offline</span>
                            </div>
                            <span className="text-[14px] font-bold text-slate-600 dark:text-slate-400">{formatNumber(stats?.offlineDevices)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Blocked</span>
                            </div>
                            <span className="text-[14px] font-bold text-rose-600 dark:text-rose-400">{formatNumber(stats?.blockedDevices)}</span>
                        </div>
                    </div>
                    
                    <div className="mt-8 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 flex gap-3">
                        <Clock className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-[12px] font-semibold text-orange-800 dark:text-orange-400">Expiring Licenses</div>
                            <div className="text-[11px] text-orange-600/80 dark:text-orange-500/80 mt-0.5">
                                <strong>{stats?.expiringSoon || 0}</strong> licenses will expire in the next 7 days.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Validation Chart (4 cols) */}
                <div className="lg:col-span-4 glass-card p-5">
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-4">API Requests &amp; Security (7d)</h3>
                    {trendData.length === 0 ? (
                        <div className="flex h-48 items-center justify-center text-[12px] text-slate-400">No data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={trendData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValid" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorFail" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={formatNumber} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Legend wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
                                <Area type="monotone" dataKey="Validations" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValid)" />
                                <Area type="monotone" dataKey="Failures" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorFail)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Playbacks Chart (4 cols) */}
                <div className="lg:col-span-4 glass-card p-5">
                    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-4">Playback Trend (7d)</h3>
                    {playbacksData.length === 0 ? (
                        <div className="flex h-48 items-center justify-center text-[12px] text-slate-400">No data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={playbacksData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={formatNumber} />
                                <Tooltip cursor={{ fill: '#f1f5f9', opacity: 0.4 }} contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="Playbacks" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* TOP 10 LISTS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <TopListCard 
                    title="Top Users" 
                    icon={Users} 
                    items={stats?.topUsers} 
                    type="user" 
                />
                
                <TopListCard 
                    title="Top Devices" 
                    icon={Monitor} 
                    items={stats?.topDevices} 
                    type="device" 
                />
                
                <TopListCard 
                    title="Top Plugins" 
                    icon={Package} 
                    items={stats?.topPlugins} 
                    type="plugin" 
                />
                
                <TopListCard 
                    title="Top Videos" 
                    icon={Film} 
                    items={stats?.topVideos} 
                    type="video" 
                />
            </div>
            
            {/* Context Summary row */}
            <div className="glass-card p-5 mt-4 text-center">
                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                    Showing statistics and trends for the entire system. "Top Lists" and "Trend Charts" are scoped to the <strong className="text-slate-700 dark:text-slate-300 border-b border-dashed border-slate-400">last 7 days</strong> by default to help quickly identify recent traffic patterns and active abuse.
                </p>
            </div>
        </div>
    );
}
