// frontend/app/room/[code]/page.tsx
"use client";

import { useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, User } from 'lucide-react';

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
    const router = useRouter();
    const { code } = use(params); 

    const { 
        localStream, remoteStream, 
        toggleAudio, toggleVideo, toggleScreenShare, 
        isMuted, isVideoOff, isScreenSharing,
        joinRoom, hasJoined,
        username, remoteUsername, remoteIsMuted, remoteIsVideoOff
    } = useWebRTC(code);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, hasJoined]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, hasJoined]);

    // Helper component for the Avatar overlay
    const AvatarOverlay = ({ name }: { name: string }) => (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-xl border-4 border-gray-700">
                {name.charAt(0).toUpperCase()}
            </div>
        </div>
    );

    // ==========================================
    // VIEW 1: THE LOBBY
    // ==========================================
    if (!hasJoined) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-3xl bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-700 flex flex-col items-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Ready to join, {username}?</h1>
                    <p className="text-gray-400 mb-8 font-mono">Room Code: {code}</p>
                    
                    <div className="w-full max-w-2xl aspect-video bg-black rounded-2xl overflow-hidden mb-8 relative border-2 border-gray-600 shadow-lg">
                        {isVideoOff && <AvatarOverlay name={username} />}
                        
                        {localStream ? (
                            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Requesting hardware access...
                            </div>
                        )}
                        
                        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-sm text-white backdrop-blur-sm flex items-center gap-2 z-20 shadow-md">
                            {username} (You)
                            {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                        </div>
                    </div>

                    <div className="flex gap-6 mb-8">
                        <button onClick={toggleAudio} className={`p-5 rounded-full transition shadow-lg ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-500'}`}>
                            {isMuted ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-white" />}
                        </button>
                        <button onClick={toggleVideo} className={`p-5 rounded-full transition shadow-lg ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-500'}`}>
                            {isVideoOff ? <VideoOff className="w-7 h-7 text-white" /> : <Video className="w-7 h-7 text-white" />}
                        </button>
                    </div>

                    <button 
                        onClick={joinRoom} 
                        disabled={!localStream}
                        className="w-full max-w-md py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition shadow-lg"
                    >
                        Join Room
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // VIEW 2: THE ACTIVE ROOM
    // ==========================================
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            <div className="p-4 bg-gray-800 flex justify-between items-center shadow-md">
                <h1 className="font-bold text-xl">Conference Room</h1>
                <div className="bg-gray-700 px-4 py-1 rounded-md font-mono tracking-widest border border-gray-600 shadow-inner">
                    CODE: {code}
                </div>
            </div>

            <div className="flex-grow p-4 md:p-8 flex flex-col md:flex-row gap-4 items-center justify-center">
                
                {/* Local Video Panel */}
                <div className="relative w-full md:w-1/2 aspect-video bg-black rounded-2xl overflow-hidden border-2 border-gray-700 shadow-xl">
                    {isVideoOff && <AvatarOverlay name={username} />}
                    <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${!isScreenSharing ? 'transform scale-x-[-1]' : ''}`} />
                    
                    <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-sm backdrop-blur-sm flex items-center gap-2 z-20 shadow-md">
                        {username} (You) {isScreenSharing && <span className="text-blue-400 ml-1">- Sharing Screen</span>}
                        {isMuted && <MicOff className="w-4 h-4 text-red-500" />}
                    </div>
                </div>

                {/* Remote Video Panel */}
                <div className="relative w-full md:w-1/2 aspect-video bg-gray-800 rounded-2xl overflow-hidden border-2 border-gray-700 shadow-xl flex items-center justify-center">
                    {remoteStream ? (
                        <>
                            {remoteIsVideoOff && <AvatarOverlay name={remoteUsername} />}
                            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            
                            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-sm backdrop-blur-sm flex items-center gap-2 z-20 shadow-md">
                                {remoteUsername}
                                {remoteIsMuted && <MicOff className="w-4 h-4 text-red-500" />}
                            </div>
                        </>
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center">
                            <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                            <p>Waiting for someone to join...</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="h-24 bg-gray-800 border-t border-gray-700 flex justify-center items-center gap-6 shadow-up">
                <button onClick={toggleAudio} className={`p-4 rounded-full transition shadow-lg ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-500'}`}>
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button onClick={toggleVideo} className={`p-4 rounded-full transition shadow-lg ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-500'}`}>
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
                <button onClick={toggleScreenShare} className={`p-4 rounded-full transition shadow-lg ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-500'}`}>
                    <MonitorUp className="w-6 h-6" />
                </button>
                <button onClick={() => router.push('/dashboard')} className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition px-8 flex items-center gap-2 font-medium shadow-lg ml-4">
                    <PhoneOff className="w-5 h-5" /> Leave
                </button>
            </div>
        </div>
    );
}