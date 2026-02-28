import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Search, X, Bell, CheckCircle, Menu } from 'lucide-react';
import { get, truncKey } from '../lib/api';
import { useLayout } from '../contexts/LayoutContext';

const TITLES = {
    '/dashboard': 'Dashboard',
    '/licenses': 'Licenses',
    '/devices': 'Devices',
    '/activity/live': 'Live Activity',
    '/activity/playback': 'Playback Logs',
    '/activity/plugins': 'Plugin Analytics',
    '/analytics': 'Analytics',
    '/security': 'Security',
    '/settings': 'Settings',
};

export default function Header({ dark, setDark }) {
    const loc = useLocation();
    const nav = useNavigate();
    const { collapsed, setCollapsed, setMobileOpen } = useLayout();
    const title = TITLES[loc.pathname] || 'Dashboard';

    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [showAlerts, setShowAlerts] = useState(false);
    const inputRef = useRef();
    const bellRef = useRef();

    // Fetch alert summary (Preserved existing logic)
    useEffect(() => {
        get('/admin/dashboard').then(d => {
            const a = [];
            if ((d.expiring_soon || 0) > 0)
                a.push({ type: 'warning', text: `${d.expiring_soon} license(s) expiring within 3 days` });
            if ((d.blockedIPs || 0) > 0) // Updated to camelCase per recent fixes
                a.push({ type: 'error', text: `${d.blockedIPs} blocked IP(s) detected` });
            if ((d.totalPlaybacks || 0) > 500) // Updated keys
                a.push({ type: 'info', text: 'High validation volume today' });
            setAlerts(a);
        }).catch(() => { });
    }, [loc.pathname]);

    useEffect(() => {
        if (searchOpen && inputRef.current) inputRef.current.focus();
    }, [searchOpen]);

    useEffect(() => {
        if (!query || query.length < 3) { setResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const [lic, dev] = await Promise.allSettled([
                    get(`/admin/licenses?search=${encodeURIComponent(query)}&limit=5`),
                    get(`/admin/devices?search=${encodeURIComponent(query)}&limit=5`),
                ]);
                const r = [];
                if (lic.status === 'fulfilled' && lic.value.licenses?.length)
                    lic.value.licenses.forEach(l => r.push({ type: 'License', label: truncKey(l.license_key), sub: l.name || l.status, full: l.license_key, to: '/licenses' }));
                if (dev.status === 'fulfilled' && dev.value.devices?.length)
                    dev.value.devices.forEach(d => r.push({ type: 'Device', label: d.device_name || d.device_id, sub: d.license_key || '—', to: '/devices' }));
                setResults(r);
            } catch { }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    // Handle Mobile/Collapsed Toggle
    // Mobile: Opens drawer
    // Desktop: If collapsed, Expands sidebar
    const handleMenuClick = () => {
        if (window.innerWidth < 1024) {
            setMobileOpen(prev => !prev);
        } else {
            setCollapsed(false);
        }
    };

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 py-4 glass-panel border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md transition-all duration-300">
            <div className="flex items-center gap-3">
                {/* Hamburger: Visible on Mobile OR when Desktop is Collapsed */}
                <button
                    onClick={handleMenuClick}
                    className={`p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors
                        ${!collapsed ? 'lg:hidden' : ''} 
                    `}
                    aria-label="Toggle menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 truncate">
                    {title}
                </h1>
            </div>

            <div className="flex items-center gap-2 lg:gap-3">
                {/* Search Bar */}
                <div className={`flex items-center bg-slate-100 dark:bg-slate-800/50 rounded-xl px-3 py-1.5 transition-all duration-300 ${searchOpen ? 'w-full absolute left-0 top-0 h-full z-50 rounded-none px-4 md:w-[320px] md:relative md:rounded-xl md:h-auto' : 'w-[36px] lg:w-[240px] cursor-pointer'}`} onClick={() => setSearchOpen(true)}>
                    <Search className={`w-4 h-4 text-slate-400 shrink-0 ${searchOpen ? 'text-indigo-500' : ''}`} />
                    <input
                        ref={inputRef}
                        className={`bg-transparent border-none outline-none text-[13px] ml-2 w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-400 ${!searchOpen ? 'hidden lg:block' : ''}`}
                        placeholder="Search..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                    />
                    {searchOpen && (
                        <button onClick={(e) => { e.stopPropagation(); setSearchOpen(false); }} className="md:hidden p-1">
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    )}

                    {/* Search Results Dropdown */}
                    {searchOpen && results.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a2236] rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
                            {results.map((r, i) => (
                                <div key={i} onClick={() => nav(r.to)} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center gap-3">
                                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${r.type === 'License' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                                        {r.type}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-medium text-slate-900 dark:text-white truncate">{r.label}</div>
                                        <div className="text-[11px] text-slate-500 truncate">{r.sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="relative" ref={bellRef}>
                    <button onClick={() => setShowAlerts(!showAlerts)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-500 transition-colors relative">
                        <Bell className="w-5 h-5" />
                        {alerts.length > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#0f172a]" />
                        )}
                    </button>
                    {showAlerts && (
                        <div className="absolute top-full right-0 mt-2 w-[280px] bg-white dark:bg-[#1a2236] rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">Notifications</span>
                                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">{alerts.length} new</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {alerts.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 text-[12px]">No new notifications</div>
                                ) : alerts.map((a, i) => (
                                    <div key={i} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-0 flex gap-3">
                                        <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${a.type === 'error' ? 'bg-red-500' : a.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                        <div className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">{a.text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={() => setDark(!dark)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-yellow-400 transition-colors"
                >
                    {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            </div>
        </header>
    );
}
