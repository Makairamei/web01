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
        <div className="h-screen w-full bg-slate-200/50 dark:bg-[#050812] flex justify-center overflow-hidden">
            <div className="flex w-full max-w-[1600px] h-full overflow-hidden bg-slate-50 dark:bg-[#0f172a] relative shadow-[0_0_40px_-15px_rgba(0,0,0,0.3)] dark:shadow-none dark:border-x dark:border-slate-800/60 transition-all">
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
                        className="flex-1 w-full overflow-y-auto overflow-x-hidden relative scroll-smooth"
                    >
                        <div className="min-h-full w-full bg-slate-50 dark:bg-[#0f172a]">
                            <div className="px-4 py-4 lg:px-8 lg:py-6 animate-in fade-in slide-in-from-bottom-4 duration-500 will-change-transform">
                                {/* Error Boundary could wrap Outlet here */}
                                <Outlet />
                            </div>
                        </div>
                    </main>
                </div>
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
