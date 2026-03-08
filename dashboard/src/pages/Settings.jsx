import { useState, useEffect } from 'react';
import { get, post, put, del } from '../lib/api';
import { Save, Server, Shield, GitBranch, User, Eye, EyeOff, CheckCircle, Trash2, Plus, Globe, Code, Box, Loader2, X, Database, Download } from 'lucide-react';

const TABS = [
    { id: 'general', label: 'General', icon: Server },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'repos', label: 'Repositories', icon: Globe },
    { id: 'account', label: 'Account', icon: User },
];

export default function SettingsPage() {
    const [tab, setTab] = useState('general');
    const [saved, setSaved] = useState(false);

    const [general, setGeneral] = useState({ server_url: window.location.origin, app_name: 'CS Premium', max_devices_default: 2 });
    const [security, setSecurity] = useState({ max_attempts: 10, block_duration: 3600, rate_limit_window: 60 });
    const [account, setAccount] = useState({ username: 'admin', current_password: '', new_password: '', confirm_password: '' });
    const [showPw, setShowPw] = useState(false);
    const [repos, setRepos] = useState([]);
    const [newRepoUrl, setNewRepoUrl] = useState('');
    const [testResult, setTestResult] = useState(null);
    const [validating, setValidating] = useState(false);
    const [viewPlugins, setViewPlugins] = useState(null); // Array of plugins to view

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (tab === 'repos') loadRepos();
    }, [tab]);

    const loadRepos = async () => {
        try {
            const d = await get('/admin/repos');
            setRepos(d.repos || []);
        } catch (e) { setError('Failed to load repos'); }
    };

    const handleTestRepo = async () => {
        if (!newRepoUrl) return;
        setValidating(true);
        setTestResult(null);
        setError('');
        try {
            const res = await post('/admin/repos/validate', { url: newRepoUrl });
            setTestResult(res);
        } catch (e) {
            setError(e.message || 'Validation failed');
        } finally {
            setValidating(false);
        }
    };

    const handleAddRepo = async () => {
        if (!testResult?.valid) return;
        setLoading(true);
        try {
            await post('/admin/repos', {
                name: 'Plugin Repository',
                url: newRepoUrl,
                count: testResult.count
            });
            setNewRepoUrl('');
            setTestResult(null);
            loadRepos();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const handleDeleteRepo = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await del(`/admin/repos/${id}`);
            loadRepos();
        } catch (e) { setError(e.message); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setError('');
        try {
            if (tab === 'account') {
                if (account.new_password && account.new_password !== account.confirm_password) {
                    setError('Passwords do not match'); setLoading(false); return;
                }
                await post('/admin/change-password', {
                    current_password: account.current_password,
                    new_password: account.new_password,
                });
            } else {
                await put('/admin/settings', { ...(tab === 'general' ? general : security) });
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) { setError(e.message || 'Failed to save settings'); }
        finally { setLoading(false); }
    };

    const handleBackup = () => {
        const token = localStorage.getItem('cs_token');
        if (!token) return;
        window.open(`/api/admin/backup?token=${token}`, '_blank');
    };

    return (
        <div className="max-w-5xl space-y-5">
            {/* Tab Switcher */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                <div className="lg:col-span-2 space-y-5">
                    {/* Form card */}
                    <div className="glass-card p-6">
                        {saved && (
                            <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[13px] font-medium fade-in">
                                <CheckCircle className="w-4 h-4" /> Settings saved successfully!
                            </div>
                        )}
                        {error && (
                            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-[13px]">{error}</div>
                        )}

                        <form onSubmit={handleSave} className="space-y-5">
                            {/* General */}
                            {tab === 'general' && (
                                <>
                                    <h2 className="text-[14px] font-bold text-slate-900 dark:text-white">General Settings</h2>
                                    <div>
                                        <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Application Name</label>
                                        <input value={general.app_name} onChange={e => setGeneral({ ...general, app_name: e.target.value })} className="form-input" />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Server / API Base URL</label>
                                        <input value={general.server_url} onChange={e => setGeneral({ ...general, server_url: e.target.value })} className="form-input" placeholder="https://your-server.com" />
                                        <p className="mt-1 text-[11px] text-slate-400">Used for documentation and webhook references</p>
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Default Max Devices per License</label>
                                        <input type="number" value={general.max_devices_default} onChange={e => setGeneral({ ...general, max_devices_default: parseInt(e.target.value) || 2 })} className="form-input w-32" min={1} max={20} />
                                    </div>
                                </>
                            )}

                            {/* Security */}
                            {tab === 'security' && (
                                <>
                                    <h2 className="text-[14px] font-bold text-slate-900 dark:text-white">Security Settings</h2>
                                    <div>
                                        <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Max Failed Attempts (before block)</label>
                                        <input type="number" value={security.max_attempts} onChange={e => setSecurity({ ...security, max_attempts: parseInt(e.target.value) || 10 })} className="form-input w-32" min={1} max={100} />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Block Duration (seconds)</label>
                                        <input type="number" value={security.block_duration} onChange={e => setSecurity({ ...security, block_duration: parseInt(e.target.value) || 3600 })} className="form-input w-44" min={60} />
                                        <p className="mt-1 text-[11px] text-slate-400">{Math.floor(security.block_duration / 3600)}h {Math.floor((security.block_duration % 3600) / 60)}m</p>
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Rate Limit Window (seconds)</label>
                                        <input type="number" value={security.rate_limit_window} onChange={e => setSecurity({ ...security, rate_limit_window: parseInt(e.target.value) || 60 })} className="form-input w-32" min={10} />
                                    </div>
                                </>
                            )}

                            {/* Repositories */}
                            {tab === 'repos' && (
                                <>
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[14px] font-bold text-slate-900 dark:text-white">Plugin Repositories</h2>
                                        <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{repos.length} active</span>
                                    </div>

                                    {/* Existing Repos List */}
                                    <div className="space-y-3">
                                        {repos.length === 0 ? (
                                            <div className="text-center py-6 text-[12px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                                No repositories added yet.
                                            </div>
                                        ) : repos.map(repo => (
                                            <div key={repo.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                                                        <Box className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-[13px] font-medium text-slate-900 dark:text-white truncate">{repo.name || 'Unnamed Repo'}</div>
                                                        <div className="text-[11px] text-slate-500 truncate">{repo.url}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-[11px] font-bold text-slate-500 bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                                                        {repo.plugin_count} plugins
                                                    </div>
                                                    <button type="button" onClick={() => handleDeleteRepo(repo.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-slate-100 dark:border-slate-800 my-4" />

                                    {/* Add New Repo */}
                                    <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                            <Plus className="w-4 h-4" /> Add New Repository
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <input
                                                    value={newRepoUrl}
                                                    onChange={e => setNewRepoUrl(e.target.value)}
                                                    placeholder="https://raw.githubusercontent.com/..."
                                                    className="form-input flex-1 text-[12px]"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleTestRepo}
                                                    disabled={validating || !newRepoUrl}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-medium rounded-lg disabled:opacity-50 flex items-center gap-2 transition-colors"
                                                >
                                                    {validating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Code className="w-3.5 h-3.5" />}
                                                    Test
                                                </button>
                                            </div>

                                            {/* Test Result */}
                                            {testResult && (
                                                <div className={`p-3 rounded-lg border text-[12px] animate-in fade-in slide-in-from-top-2 ${testResult.valid ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 font-medium">
                                                            {testResult.valid ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                                            {testResult.valid ? `Valid! Found ${testResult.count} plugins.` : 'Invalid Repository'}
                                                        </div>
                                                        {testResult.valid && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setViewPlugins(testResult.plugins)}
                                                                    className="underline opacity-80 hover:opacity-100"
                                                                >
                                                                    View Plugins
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleAddRepo}
                                                                    disabled={loading}
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md text-[11px] font-bold shadow-sm transition-colors"
                                                                >
                                                                    {loading ? 'Saving...' : 'Add Repository'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Plugins Modal */}
                                    {viewPlugins && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setViewPlugins(null)}>
                                            <div className="bg-white dark:bg-[#1a2236] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                    <h3 className="font-bold text-slate-900 dark:text-white">Plugin Preview</h3>
                                                    <button onClick={() => setViewPlugins(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="w-5 h-5" /></button>
                                                </div>
                                                <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                                                    {viewPlugins.map((p, i) => (
                                                        <div key={i} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group">
                                                            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                                                                {p.icon ? <img src={p.icon} className="w-5 h-5 object-contain" onError={e => e.target.style.display = 'none'} /> : <Box className="w-4 h-4 text-slate-400" />}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-[13px] font-medium text-slate-900 dark:text-white truncate">{p.name || p.package}</div>
                                                                <div className="text-[11px] text-slate-500 font-mono truncate">{p.package}</div>
                                                            </div>
                                                            <div className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                                                v{p.version}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-[11px] text-slate-400">
                                        <strong>Note:</strong> Repositories are used to fetch plugin updates and metadata.
                                    </p>
                                </>
                            )}

                            {/* Account */}
                            {tab === 'account' && (
                                <>
                                    <h2 className="text-[14px] font-bold text-slate-900 dark:text-white">Change Password</h2>
                                    <div>
                                        <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Current Password</label>
                                        <div className="relative">
                                            <input type={showPw ? 'text' : 'password'} value={account.current_password} onChange={e => setAccount({ ...account, current_password: e.target.value })} className="form-input pr-10" required />
                                            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">New Password</label>
                                        <input type="password" value={account.new_password} onChange={e => setAccount({ ...account, new_password: e.target.value })} className="form-input" minLength={8} required />
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Confirm New Password</label>
                                        <input type="password" value={account.confirm_password} onChange={e => setAccount({ ...account, confirm_password: e.target.value })} className="form-input" required />
                                    </div>
                                </>
                            )}

                            {tab !== 'repos' && (
                                <div className="pt-1">
                                    <button type="submit" disabled={loading} className="btn-primary">
                                        <Save className="w-3.5 h-3.5" />
                                        {loading ? 'Saving…' : 'Save Changes'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Backup Database */}
                    <div className="glass-card p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Database Backup</h3>
                                <div className="text-[11px] text-slate-500">Download the SQLite file</div>
                            </div>
                        </div>
                        <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                            Ensure you keep regular backups of your database. Download the <code>database.sqlite</code> file containing all licenses, devices, plugins, and activity records.
                        </p>
                        <button type="button" onClick={handleBackup} className="w-full flex justify-center items-center gap-2 btn flex-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-indigo-600 transition-colors py-2 text-[12px] font-semibold">
                            <Download className="w-4 h-4" /> Export Database
                        </button>
                    </div>

                    {/* Info card */}
                    <div className="glass-card p-5">
                        <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-4">System Information</h3>
                        <div className="space-y-3 text-[12px]">
                            {[
                                { label: 'Panel Version', value: 'v2.0.0' },
                                { label: 'Node.js', value: 'Express.js API' },
                                { label: 'Database', value: 'SQLite (sql.js)' },
                                { label: 'Frontend', value: 'React + Vite + Tailwind' },
                            ].map(i => (
                                <div key={i.label} className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">{i.label}</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-medium">{i.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
