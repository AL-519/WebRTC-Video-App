// frontend/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
    Video, Keyboard, LogOut, Loader2, ChevronDown, 
    Palette, Moon, Sun, Monitor, Check, Calendar, User, Edit2, Mail
} from 'lucide-react';

export default function DashboardPage() {
    const router = useRouter();
    const [username, setUsername] = useState<string>('');
    const [userEmail, setUserEmail] = useState<string>('');
    const [joinCode, setJoinCode] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // UI States
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isThemePopupOpen, setIsThemePopupOpen] = useState(false);
    const [activeTheme, setActiveTheme] = useState('device');

    // Name Change States
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [newNameInput, setNewNameInput] = useState('');

    // Scheduling States
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');

    // 1. Check Authentication, Name, & Theme on Mount
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.push('/login');
            return;
        }

        // 1. Get raw data from storage
        let savedEmail = localStorage.getItem('email') || '';
        let savedUsername = localStorage.getItem('username') || '';

        // 2. FALLBACK: If email wasn't explicitly saved during login, 
        // but the username has an '@' symbol, treat the username as the email.
        if (!savedEmail && savedUsername.includes('@')) {
            savedEmail = savedUsername;
            localStorage.setItem('email', savedEmail); // Save it for next time
        }
        setUserEmail(savedEmail);

        // 3. Smart Name Extraction
        let displayName = localStorage.getItem('saved_display_name');
        
        // If they haven't manually changed their name yet, generate one
        if (!displayName) {
            displayName = savedUsername || savedEmail || 'User';
            // If the fallback name is an email, grab everything before the @
            if (displayName.includes('@')) {
                displayName = displayName.split('@')[0];
            }
        }

        setUsername(displayName);
        // Ensure the room lobby picks up this cleaned-up default
        localStorage.setItem('saved_display_name', displayName);

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'device';
        setActiveTheme(savedTheme);
        applyTheme(savedTheme);
    }, [router]);

    // Handle HTML Class toggling for themes
    const applyTheme = (theme: string) => {
        if (theme === 'dark' || (theme === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleThemeChange = (theme: string) => {
        setActiveTheme(theme);
        localStorage.setItem('theme', theme);
        applyTheme(theme);
        setIsThemePopupOpen(false); 
    };

    // Handle permanent display name change
    const handleSaveName = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newNameInput.trim();
        if (trimmedName) {
            setUsername(trimmedName);
            localStorage.setItem('saved_display_name', trimmedName);
            localStorage.setItem('username', trimmedName); // Keep main auth sync updated
            setIsNameModalOpen(false);
        }
    };

    // 2. Handle Room Creation & Scheduling
    const handleCreateRoom = async () => {
        setLoading(true);
        try {
            const payload = {
                host_email: userEmail || username, // Best effort to track unique host
                scheduled_time: isScheduling && scheduledTime ? new Date(scheduledTime).toISOString() : null
            };

            const response = await api.post('/rooms/create', payload);
            const newRoomCode = response.data.room_code;
            
            router.push(`/room/${newRoomCode}`);
        } catch (error) {
            console.error("Failed to create room:", error);
            alert("Could not create a room. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // 3. Handle Joining a Room
    const handleJoinRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.trim().length !== 6) {
            alert("Room codes must be exactly 6 characters.");
            return;
        }
        router.push(`/room/${joinCode.toUpperCase()}`);
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        localStorage.removeItem('saved_display_name');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col">
            
            {/* Theme Popup Modal */}
            {isThemePopupOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Choose Theme
                        </h3>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => handleThemeChange('light')}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${activeTheme === 'light' ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            >
                                <div className="flex items-center gap-3"><Sun className="w-5 h-5" /> Light</div>
                                {activeTheme === 'light' && <Check className="w-5 h-5" />}
                            </button>
                            
                            <button 
                                onClick={() => handleThemeChange('dark')}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${activeTheme === 'dark' ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            >
                                <div className="flex items-center gap-3"><Moon className="w-5 h-5" /> Dark</div>
                                {activeTheme === 'dark' && <Check className="w-5 h-5" />}
                            </button>
                            
                            <button 
                                onClick={() => handleThemeChange('device')}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${activeTheme === 'device' ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            >
                                <div className="flex items-center gap-3"><Monitor className="w-5 h-5" /> Device Default</div>
                                {activeTheme === 'device' && <Check className="w-5 h-5" />}
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => setIsThemePopupOpen(false)}
                            className="mt-6 w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-gray-800 dark:text-white font-semibold transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Change Name Modal */}
            {isNameModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Change Name
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This is how you will appear to others.</p>
                        
                        <form onSubmit={handleSaveName} className="space-y-4">
                            <input 
                                type="text"
                                value={newNameInput}
                                onChange={(e) => setNewNameInput(e.target.value)}
                                placeholder="Enter your display name"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                autoFocus
                            />
                            
                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsNameModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-gray-800 dark:text-white font-semibold transition"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={!newNameInput.trim()}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-gray-700 disabled:text-blue-100 text-white font-semibold rounded-xl transition"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Navigation Bar */}
            <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center relative z-40 transition-colors duration-300">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xl">
                    <Video className="w-6 h-6" />
                    <span>WebRTC Sync</span>
                </div>
                
                {/* User Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-medium bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 transition"
                    >
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                            {username ? username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="hidden sm:block truncate max-w-[120px]">{username}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                            
                            <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-1">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{username}</p>
                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">● Online</p>
                                </div>

                                {userEmail && (
                                    <button 
                                        className="w-full text-left px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-3 transition cursor-default"
                                    >
                                        <Mail className="w-4 h-4" /> 
                                        <span className="truncate">{userEmail}</span>
                                    </button>
                                )}

                                <button 
                                    onClick={() => { setIsDropdownOpen(false); setNewNameInput(username); setIsNameModalOpen(true); }}
                                    className="w-full text-left px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-3 transition"
                                >
                                    <User className="w-4 h-4" /> Change Display Name
                                </button>

                                <button 
                                    onClick={() => { setIsDropdownOpen(false); setIsThemePopupOpen(true); }}
                                    className="w-full text-left px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-3 transition"
                                >
                                    <Palette className="w-4 h-4" /> Theme Preferences
                                </button>
                                
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                
                                <button 
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition font-medium"
                                >
                                    <LogOut className="w-4 h-4" /> Logout
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-grow flex items-center justify-center p-6 relative z-10">
                <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
                    
                    {/* Create Room Card */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 text-center flex flex-col items-center justify-center space-y-6 transition-colors duration-300">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                            <Video className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Start a Meeting</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">Create a new secure room and share the code with others.</p>
                        </div>
                        
                        <div className="w-full space-y-3">
                            {isScheduling ? (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-200 text-left bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Select Date & Time
                                    </label>
                                    <input 
                                        type="datetime-local" 
                                        value={scheduledTime}
                                        onChange={(e) => setScheduledTime(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    />
                                    <div className="flex justify-between items-center mt-3">
                                        <button 
                                            onClick={() => { setIsScheduling(false); setScheduledTime(''); }}
                                            className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                                        >
                                            Cancel
                                        </button>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">Local Time</span>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsScheduling(true)}
                                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors w-full p-2 border border-dashed border-blue-200 dark:border-blue-900/50 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                    + Schedule for later
                                </button>
                            )}

                            <button
                                onClick={handleCreateRoom}
                                disabled={loading || (isScheduling && !scheduledTime)}
                                className="w-full flex justify-center items-center py-4 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-gray-700 disabled:text-blue-100 dark:disabled:text-gray-400 font-bold transition shadow-lg shadow-blue-600/30 dark:shadow-none"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isScheduling ? "Schedule Room" : "Start Now")}
                            </button>
                        </div>
                    </div>

                    {/* Join Room Card */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 text-center flex flex-col items-center justify-center space-y-6 transition-colors duration-300">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                            <Keyboard className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Join a Meeting</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">Enter your 6-character code to join an existing call.</p>
                        </div>
                        <form onSubmit={handleJoinRoom} className="w-full space-y-4">
                            <input
                                type="text"
                                placeholder="e.g. ABC123"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                                className="w-full px-4 py-3.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 text-center text-xl tracking-widest uppercase shadow-inner transition outline-none"
                            />
                            <button
                                type="submit"
                                disabled={joinCode.length !== 6}
                                className="w-full py-4 px-4 rounded-xl text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-gray-700 disabled:text-green-100 dark:disabled:text-gray-400 font-bold transition shadow-lg shadow-green-600/30 dark:shadow-none"
                            >
                                Join Room
                            </button>
                        </form>
                    </div>

                </div>
            </main>
        </div>
    );
}