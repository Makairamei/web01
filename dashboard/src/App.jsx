import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Licenses from './pages/Licenses';
import Devices from './pages/Devices';
import LiveActivity from './pages/LiveActivity';
import PlaybackLogs from './pages/PlaybackLogs';
import PluginAnalytics from './pages/PluginAnalytics';
import Analytics from './pages/Analytics';
import Security from './pages/Security';
import SettingsPage from './pages/Settings';
import AdminLogs from './pages/AdminLogs';

export default function App() {
    const [dark, setDark] = useState(() => localStorage.getItem('cs_theme') === 'dark');

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        localStorage.setItem('cs_theme', dark ? 'dark' : 'light');
    }, [dark]);

    return (
        <ToastProvider>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route element={<Layout dark={dark} setDark={setDark} />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/licenses" element={<Licenses />} />
                        <Route path="/devices" element={<Devices />} />
                        <Route path="/activity/live" element={<LiveActivity />} />
                        <Route path="/activity/playback" element={<PlaybackLogs />} />
                        <Route path="/activity/plugins" element={<PluginAnalytics />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/security" element={<Security />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/admin-logs" element={<AdminLogs />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </AuthProvider>
        </ToastProvider>
    );
}
