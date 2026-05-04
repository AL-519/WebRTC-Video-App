// frontend/app/room/[code]/page.tsx
"use client";

import { useEffect, useRef, use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import api from '@/lib/api';
import { 
    Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, 
    MessageSquare, Smile, Paperclip, Send, Download, Image as ImageIcon,
    Copy, Check, Clock, Loader2, AlertCircle, Users, ShieldBan
} from 'lucide-react';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
    const router = useRouter();
    const { code } = use(params); 

    const { 
        localStream, remoteStream, 
        toggleAudio, toggleVideo, toggleScreenShare, 
        isMuted, isVideoOff, isScreenSharing,
        joinRoom, leaveRoom, hasJoined, 
        username, remoteUsername, remoteIsMuted, remoteIsVideoOff,
        amISpeakingRightNow, isPartnerSpeakingRightNow,
        chatMessageHistory, sendTextMessageToChat, sendEmojiReactionToPartner, sendImageFileToChat,
        currentlyDisplayingReaction, downloadChatHistoryAsPDF,
        sendHostCommand 
    } = useWebRTC(code);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sidebar States
    const [activeSidebar, setActiveSidebar] = useState<'none' | 'chat'>('none');
    const [chatInput, setChatInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    // Scheduling & Status States
    const [roomStatus, setRoomStatus] = useState<'loading' | 'ready' | 'scheduled' | 'error'>('loading');
    const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState('');
    
    // Host Logic
    const [isHost, setIsHost] = useState(false);

    useEffect(() => {
        setNameInput(localStorage.getItem('saved_display_name') || '');
        checkRoomStatus();
    }, []);

    // Scroll chat to bottom
    useEffect(() => {
        if (activeSidebar === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessageHistory, activeSidebar]);

    // Attach video streams
    useEffect(() => {
        if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
    }, [localStream, hasJoined, roomStatus]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    }, [remoteStream, hasJoined]);

    // Countdown Timer Logic
    useEffect(() => {
        if (roomStatus === 'scheduled' && scheduledTime) {
            const timer = setInterval(() => {
                const now = new Date().getTime();
                const distance = scheduledTime.getTime() - now;

                if (distance < 0) {
                    clearInterval(timer);
                    setRoomStatus('ready');
                    return;
                }

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                if (days > 0) setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
                else if (hours > 0) setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
                else setTimeRemaining(`${minutes}m ${seconds}s`);
                
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [roomStatus, scheduledTime]);

    // Ping the backend to see if we can join AND check if we are the host
    const checkRoomStatus = async () => {
        try {
            const response = await api.get(`/rooms/${code}/status`);
            
            // Check if the current logged-in user is the Host
            const myUsername = localStorage.getItem('username');
            if (response.data.host === myUsername) {
                setIsHost(true);
            }

            if (response.data.status === 'scheduled') {
                setScheduledTime(new Date(response.data.scheduled_time + 'Z'));
                setRoomStatus('scheduled');
            } else {
                setRoomStatus('ready');
            }
        } catch (error: any) {
            setRoomStatus('error');
            setErrorMessage(error.response?.data?.detail || "Room not found or unavailable.");
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            sendTextMessageToChat(chatInput);
            setChatInput('');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            sendImageFileToChat(file);
            e.target.value = ''; 
        }
    };

    const AvatarOverlay = ({ name }: { name: string }) => (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10 transition-colors duration-300">
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-xl border-4 border-white dark:border-gray-700 transition-colors duration-300">
                {name.charAt(0).toUpperCase()}
            </div>
        </div>
    );

    // ==========================================
    // VIEW 1: THE LOBBY / WAITING ROOM
    // ==========================================
    if (!hasJoined) {
        if (roomStatus === 'loading') {
            return (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="mt-4 text-gray-500 font-medium">Checking room status...</p>
                </div>
            );
        }

        if (roomStatus === 'error') {
            return (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-red-100 dark:border-red-900/30">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Cannot Join Room</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">{errorMessage}</p>
                        <button 
                            onClick={() => router.push('/dashboard')}
                            className="w-full py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl font-bold transition text-gray-900 dark:text-white"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 transition-colors duration-300">
                <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center transition-colors duration-300">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {roomStatus === 'scheduled' ? "Meeting Scheduled" : "Ready to join?"}
                    </h1>
                    
                    <div className="flex items-center gap-3 mb-8 bg-gray-100 dark:bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                        <p className="text-gray-600 dark:text-gray-400 font-mono tracking-widest">Code: {code}</p>
                        <button 
                            onClick={handleCopyCode} 
                            className="p-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            title="Copy Room Code"
                        >
                            {isCopied ? <Check className="w-4 h-4 text-green-600 dark:text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    
                    {roomStatus === 'scheduled' ? (
                        <div className="w-full max-w-2xl aspect-video bg-blue-50 dark:bg-blue-900/10 rounded-2xl flex flex-col items-center justify-center border-2 border-blue-100 dark:border-blue-900/30 mb-8 p-6 text-center">
                            <Clock className="w-16 h-16 text-blue-500 mb-4 animate-pulse" />
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Waiting for meeting to start</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Scheduled for: {scheduledTime?.toLocaleDateString()} at {scheduledTime?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            <div className="text-4xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wider bg-white dark:bg-gray-900 px-8 py-4 rounded-2xl shadow-inner">
                                {timeRemaining}
                            </div>
                        </div>
                    ) : (
                        <div className={`w-full max-w-2xl aspect-video bg-black rounded-2xl overflow-hidden mb-8 relative border-2 transition-all ${amISpeakingRightNow ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'border-gray-300 dark:border-gray-600 shadow-lg'}`}>
                            {isVideoOff && <AvatarOverlay name={nameInput || 'Guest'} />}
                            
                            {localStream ? (
                                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">Requesting hardware access...</div>
                            )}
                            
                            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-sm text-white backdrop-blur-sm flex items-center gap-2 z-20 shadow-md">
                                {nameInput || 'Guest'} (You) {isHost && "(Host)"}
                                {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-6 mb-8">
                        <button disabled={roomStatus === 'scheduled'} onClick={toggleAudio} className={`p-5 rounded-full transition shadow-lg ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                            {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                        </button>
                        <button disabled={roomStatus === 'scheduled'} onClick={toggleVideo} className={`p-5 rounded-full transition shadow-lg ${isVideoOff ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                            {isVideoOff ? <VideoOff className="w-7 h-7" /> : <Video className="w-7 h-7" />}
                        </button>
                    </div>

                    <div className="w-full max-w-md mb-6">
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2 ml-1 font-medium transition-colors">Your Display Name</label>
                        <input 
                            type="text" 
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition text-gray-900 dark:text-white shadow-inner"
                        />
                    </div>

                    <button 
                        onClick={() => joinRoom(nameInput || 'Guest')} 
                        disabled={roomStatus === 'scheduled' || !localStream || !nameInput.trim()}
                        className="w-full max-w-md py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition shadow-lg shadow-blue-600/30 dark:shadow-none"
                    >
                        {roomStatus === 'scheduled' ? 'Waiting to Start' : 'Join Room'}
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // VIEW 2: THE ACTIVE ROOM
    // ==========================================
    return (
        <div className="h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col overflow-hidden transition-colors duration-300">
            
            {/* FLOATING EMOJI REACTION */}
            {currentlyDisplayingReaction && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                    <span className="text-9xl animate-bounce drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                        {currentlyDisplayingReaction.emoji}
                    </span>
                </div>
            )}

            {/* HEADER */}
            <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center px-6 shadow-sm z-10 flex-shrink-0 transition-colors duration-300">
                <h1 className="font-bold text-xl flex items-center gap-2">
                    <Video className="w-6 h-6 text-blue-600 dark:text-blue-500" /> Sync Room
                    {isHost && <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 px-2 py-1 rounded-md">Host</span>}
                </h1>
                
                <button 
                    onClick={handleCopyCode}
                    className="group flex items-center gap-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 shadow-inner transition-all"
                    title="Copy Room Code"
                >
                    <span className="font-mono tracking-widest font-semibold text-sm text-gray-800 dark:text-gray-200">{code}</span>
                    {isCopied ? (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-500" />
                    ) : (
                        <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                    )}
                </button>
            </div>

            {/* MAIN CONTENT AREA (Videos + Sidebar) */}
            <div className="flex-grow flex overflow-hidden">
                
                {/* VIDEO GRID */}
                <div className="flex-1 p-4 flex flex-col md:flex-row gap-4 items-center justify-center overflow-y-auto">
                    {/* Local Video */}
                    <div className={`relative w-full ${remoteStream && activeSidebar !== 'none' ? 'md:w-full max-w-2xl' : remoteStream ? 'md:w-1/2' : 'max-w-4xl'} aspect-video bg-black rounded-2xl overflow-hidden border-4 transition-all duration-300 shadow-xl ${amISpeakingRightNow ? 'border-green-500' : 'border-gray-300 dark:border-gray-700'}`}>
                        {isVideoOff && <AvatarOverlay name={username} />}
                        <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${!isScreenSharing ? 'transform scale-x-[-1]' : ''}`} />
                        
                        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-sm text-white backdrop-blur-sm flex items-center gap-2 z-20 shadow-md">
                            {username} (You) {isHost && "(Host)"} {isScreenSharing && <span className="text-blue-400 ml-1">- Sharing</span>}
                            {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                        </div>
                    </div>

                    {/* Remote Video */}
                    <div className={`relative w-full ${remoteStream && activeSidebar !== 'none' ? 'md:w-full max-w-2xl' : remoteStream ? 'md:w-1/2' : 'hidden'} aspect-video bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden border-4 transition-all duration-300 shadow-xl flex items-center justify-center ${isPartnerSpeakingRightNow ? 'border-green-500' : 'border-gray-300 dark:border-gray-700'}`}>
                        {remoteStream ? (
                            <>
                                {remoteIsVideoOff && <AvatarOverlay name={remoteUsername} />}
                                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-sm text-white backdrop-blur-sm flex items-center gap-2 z-20 shadow-md">
                                    {remoteUsername} {!isHost && "(Host)"}
                                    {remoteIsMuted && <MicOff className="w-4 h-4 text-red-500" />}
                                </div>
                            </>
                        ) : (
                            <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center">
                                <div className="w-16 h-16 border-4 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                <p>Waiting for {remoteUsername}...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* DYNAMIC SIDEBAR (Chat) */}
                {activeSidebar !== 'none' && (
                    <div className="w-80 md:w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 shadow-2xl z-20 animate-in slide-in-from-right duration-300 transition-colors">
                        
                        {/* TAB HEADER */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur">
                            <button 
                                onClick={() => setActiveSidebar('chat')}
                                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeSidebar === 'chat' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                <MessageSquare className="w-4 h-4" /> Chat
                            </button>
                        </div>

                        {/* SIDEBAR CONTENT: CHAT */}
                        {activeSidebar === 'chat' && (
                            <>
                                <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-end">
                                    <button onClick={downloadChatHistoryAsPDF} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition">
                                        <Download className="w-3 h-3" /> Export PDF
                                    </button>
                                </div>
                                <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-4 bg-gray-50/50 dark:bg-gray-900/50">
                                    {chatMessageHistory.map((msg, idx) => (
                                        <div key={idx} className={`flex flex-col ${msg.isLocal ? 'items-end' : 'items-start'}`}>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 mx-1">
                                                {msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <div className={`max-w-[85%] rounded-2xl p-3 ${msg.isLocal ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-sm shadow-sm'}`}>
                                                {msg.imageUrl ? (
                                                    <img src={msg.imageUrl} alt="Shared file" className="rounded-lg max-w-full h-auto" />
                                                ) : (
                                                    <p className="break-words text-sm">{msg.text}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            ref={fileInputRef} 
                                            onChange={handleFileUpload} 
                                        />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl transition text-gray-600 dark:text-gray-300">
                                            <ImageIcon className="w-5 h-5" />
                                        </button>
                                        <input 
                                            type="text" 
                                            value={chatInput} 
                                            onChange={(e) => setChatInput(e.target.value)} 
                                            placeholder="Message..." 
                                            className="flex-grow bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition text-sm"
                                        />
                                        <button type="submit" disabled={!chatInput.trim()} className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 rounded-xl transition text-white shadow-sm disabled:shadow-none">
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* BOTTOM CONTROL BAR */}
            <div className="h-24 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-center items-center gap-4 px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.3)] z-20 flex-shrink-0 transition-colors duration-300">
                <button onClick={toggleAudio} className={`p-4 rounded-full transition shadow-lg ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white'}`}>
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button onClick={toggleVideo} className={`p-4 rounded-full transition shadow-lg ${isVideoOff ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white'}`}>
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
                <button onClick={toggleScreenShare} className={`p-4 rounded-full transition shadow-lg ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white'}`}>
                    <MonitorUp className="w-6 h-6" />
                </button>

                {/* EMOJI HOVER BRIDGE */}
                <div 
                    className="relative"
                    onMouseEnter={() => setShowEmojiPicker(true)}
                    onMouseLeave={() => setShowEmojiPicker(false)}
                >
                    <button className="p-4 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white transition shadow-lg">
                        <Smile className="w-6 h-6" />
                    </button>
                    {showEmojiPicker && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-4 z-50">
                            <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl p-3 flex gap-3 animate-in fade-in zoom-in-95 duration-200">
                                {['👍', '❤️', '😂', '😮', '😢', '👏'].map(emoji => (
                                    <button 
                                        key={emoji} 
                                        onClick={() => {
                                            sendEmojiReactionToPartner(emoji);
                                            setShowEmojiPicker(false);
                                        }} 
                                        className="text-2xl hover:scale-125 transition-transform"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-px h-10 bg-gray-300 dark:bg-gray-700 mx-2"></div>

                <button 
                    onClick={() => setActiveSidebar(activeSidebar === 'chat' ? 'none' : 'chat')} 
                    className={`p-4 rounded-full transition shadow-lg ${activeSidebar === 'chat' ? 'bg-blue-600 text-white shadow-blue-600/30' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white'}`}
                >
                    <MessageSquare className="w-6 h-6" />
                </button>

                <button 
                    onClick={() => {
                        leaveRoom();
                        router.push('/dashboard');
                    }} 
                    className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition px-8 flex items-center gap-2 font-medium shadow-lg shadow-red-600/30 dark:shadow-none ml-2"
                >
                    <PhoneOff className="w-5 h-5" /> Leave
                </button>
            </div>
        </div>
    );
}