// frontend/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Video, Keyboard, LogOut, Loader2 } from 'lucide-react';

export default function DashboardPage() {
    const router = useRouter();
    const [username, setUsername] = useState<string>('');
    const [joinCode, setJoinCode] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // 1. Check Authentication on Mount
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const storedUsername = localStorage.getItem('username');
        
        if (!token) {
            router.push('/login');
        } else {
            setUsername(storedUsername || 'User');
        }
    }, [router]);

    // 2. Handle Room Creation
    const handleCreateRoom = async () => {
        setLoading(true);
        try {
            // Hit our new backend route
            const response = await api.post('/rooms/create');
            const newRoomCode = response.data.room_code;
            
            // Redirect straight to the actual video call room
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
        // Redirect to the video call room
        router.push(`/room/${joinCode.toUpperCase()}`);
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('username');
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Navigation Bar */}
            <nav className="bg-white border-b px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
                    <Video className="w-6 h-6" />
                    <span>WebRTC Sync</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-gray-600 font-medium">Hello, {username}</span>
                    <button 
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-grow flex items-center justify-center p-6">
                <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
                    
                    {/* Create Room Card */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border text-center flex flex-col items-center justify-center space-y-6">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <Video className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Start a Meeting</h2>
                            <p className="text-gray-500 mt-2">Create a new secure room and share the code with others.</p>
                        </div>
                        <button
                            onClick={handleCreateRoom}
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-medium transition disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Room"}
                        </button>
                    </div>

                    {/* Join Room Card */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border text-center flex flex-col items-center justify-center space-y-6">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <Keyboard className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Join a Meeting</h2>
                            <p className="text-gray-500 mt-2">Enter your 6-character code to join an existing call.</p>
                        </div>
                        <form onSubmit={handleJoinRoom} className="w-full space-y-4">
                            <input
                                type="text"
                                placeholder="e.g. ABC123"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-xl tracking-widest uppercase"
                            />
                            <button
                                type="submit"
                                disabled={joinCode.length !== 6}
                                className="w-full py-3 px-4 rounded-lg text-white bg-green-600 hover:bg-green-700 font-medium transition disabled:opacity-70"
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