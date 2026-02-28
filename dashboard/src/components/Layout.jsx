import { useRef, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { LayoutProvider, useLayout } from '../contexts/LayoutContext';
import NavigationProgress from './NavigationProgress';

function LayoutContent({ dark, setDark }) {
    const { isLoggedIn } = useAuth();
    const { collapsed, mobileOpen, setMobileOpen } = useLayout();
    const location = useLocation();
    const mainContentRef = useRef(null);

    // Scroll to top on route change & close mobile sidebar
    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
        setMobileOpen(false);
    }, [location.pathname, setMobileOpen]);

    if (!isLoggedIn) return <Navigate to="/" replace />;

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0f172a]">
            {/* Progress Bar */}
            <NavigationProgress />

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                    onClick={() => setMobileOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <Sidebar />

            {/* Main Layout Area */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-out relative`}>
                <Header dark={dark} setDark={setDark} />

                {/* Scrollable Content */}
                <main
                    ref={mainContentRef}
                    className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 scroll-smooth relative"
                >
                    <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 will-change-transform">
                        {/* Error Boundary could wrap Outlet here */}
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function Layout(props) {
    return (
        <LayoutProvider>
            <LayoutContent {...props} />
        </LayoutProvider>
    );
}
