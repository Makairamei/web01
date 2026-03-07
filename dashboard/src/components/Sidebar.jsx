import { useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLayout } from '../contexts/LayoutContext';
import { useAnalytics } from '../hooks/useAnalytics';
import Tooltip from './Tooltip';
import {
    LayoutDashboard, KeyRound, Smartphone, Activity, BarChart3,
    Play, Shield, Settings, Zap, TrendingUp, Radio,
    ChevronLeft, ChevronRight, Menu, ClipboardList
} from 'lucide-react';

const nav = [
    {
        label: 'Overview',
        items: [
            { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
    {
        label: 'Management',
        items: [
            { to: '/licenses', icon: KeyRound, label: 'Licenses' },
            { to: '/devices', icon: Smartphone, label: 'Devices' },
        ]
    },
    {
        label: 'Activity',
        items: [
            { to: '/activity/live', icon: Radio, label: 'Live Feed', live: true },
            { to: '/activity/playback', icon: Play, label: 'Playback Logs' },
            { to: '/activity/plugins', icon: BarChart3, label: 'Plugin Analytics' },
        ]
    },
    {
        label: 'System',
        items: [
            { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
            { to: '/security', icon: Shield, label: 'Security' },
            { to: '/admin-logs', icon: ClipboardList, label: 'Admin Logs' },
            { to: '/settings', icon: Settings, label: 'Settings' },
        ]
    },
];

export default function Sidebar() {
    const {
        collapsed, setCollapsed, toggleCollapsed,
        mobileOpen, setMobileOpen,
        hoverExpanded, setHoverExpanded,
        isToggling
    } = useLayout();

    const { track } = useAnalytics();
    const sidebarRef = useRef(null);
    const location = useLocation();

    // Interaction Lock: Don't expand on hover if currently toggling
    const handleMouseEnter = () => {
        if (!isToggling && collapsed && window.innerWidth >= 1024) {
            setHoverExpanded(true);
        }
    };

    const handleMouseLeave = () => {
        if (window.innerWidth >= 1024) {
            setHoverExpanded(false);
        }
    };

    // Calculate effective width for the VISUAL sidebar
    // Mobile: fixed 85%
    // Desktop: 
    //   - Expanded: 260px
    //   - Collapsed: 72px
    //   - Hover-Expanded (when collapsed): 260px
    const isDesktopExpanded = !collapsed || hoverExpanded;

    return (
        <>
            {/* Desktop Spacer (keeps layout structure) */}
            <div
                className={`hidden lg:block h-full shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
                aria-hidden="true"
            />

            {/* Actual Sidebar (Fixed/Absolute) */}
            <aside
                ref={sidebarRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    fixed lg:absolute inset-y-0 left-0 z-50 bg-white/95 dark:bg-[#080e1c]/95 backdrop-blur-xl
                    border-r border-slate-200/70 dark:border-slate-800/70
                    transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                    flex flex-col
                    ${mobileOpen ? 'translate-x-0 w-[85%] max-w-[300px] shadow-2xl' : '-translate-x-full lg:translate-x-0'}
                    ${!mobileOpen && (isDesktopExpanded ? 'lg:w-[260px]' : 'lg:w-[72px]')}
                    ${!mobileOpen && hoverExpanded && collapsed ? 'shadow-2xl ring-1 ring-black/5' : ''}
                `}
            >
                {/* Logo Section */}
                <div className={`flex items-center gap-3 h-[70px] shrink-0 transition-all duration-300 ${isDesktopExpanded ? 'px-6' : 'px-0 justify-center'}`}>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                        <Zap className="w-5 h-5 text-white" />
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ${isDesktopExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'}`}>
                        <div className="font-bold text-[15px] text-slate-900 dark:text-white leading-none tracking-tight">CS Premium</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1 font-semibold">Unknown</div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-8 custom-scrollbar">
                    {nav.map(group => (
                        <div key={group.label} className="px-3">
                            {isDesktopExpanded && (
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80 dark:text-slate-500 mb-2 px-3 animate-in fade-in duration-300">
                                    {group.label}
                                </div>
                            )}
                            <div className="space-y-1">
                                {group.items.map(item => (
                                    <Tooltip
                                        key={item.to}
                                        content={item.label}
                                        side="right"
                                        // Only show tooltip if collapsed AND NOT hovered (because hover expands it)
                                        // Actually if hovered, it expands, so labels are visible.
                                        // So tooltip only needed if collapsed and NOT hoverExpanded? 
                                        // But mouse is hovering to trigger tooltip...
                                        // Wait, if hover expands sidebar, then labels are visible, so tooltips are REDUNDANT/ANNOYING.
                                        // Correct logic: Disable tooltip if expanded.
                                        enabled={!isDesktopExpanded}
                                        delay={0}
                                    >
                                        <NavLink
                                            to={item.to}
                                            onClick={() => setMobileOpen(false)}
                                            className={({ isActive }) => `
                                                relative flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group
                                                ${isDesktopExpanded ? 'px-3' : 'justify-center px-0'}
                                                ${isActive
                                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'}
                                            `}
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    {isActive && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                                                    )}
                                                    <div className="relative shrink-0">
                                                        <item.icon className={`w-[20px] h-[20px] transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'opacity-70 group-hover:opacity-100'}`} />
                                                        {item.live && (
                                                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full pulse-dot border-2 border-white dark:border-[#080e1c]" />
                                                        )}
                                                    </div>

                                                    <span className={`whitespace-nowrap transition-all duration-300 ${isDesktopExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 absolute'}`}>
                                                        {item.label}
                                                    </span>
                                                </>
                                            )}
                                        </NavLink>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Collapse Toggle (Desktop Only) */}
                <div className="hidden lg:flex items-center justify-center h-16 border-t border-slate-100 dark:border-slate-800/60 shrink-0">
                    <button
                        onClick={toggleCollapsed}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </button>
                </div>
            </aside>
        </>
    );
}
