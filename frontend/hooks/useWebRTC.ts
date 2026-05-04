// frontend/hooks/useWebRTC.ts
import { useEffect, useRef, useState } from 'react';

export interface ChatMessageInterface {
    sender: string;
    text: string;
    timestamp: number;
    isLocal: boolean;
    isSystem?: boolean;
    imageUrl?: string;
}

export function useWebRTC(roomCode: string) {
    // Local State
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [username, setUsername] = useState('User');
    const [hasJoined, setHasJoined] = useState(false);
    const [amISpeakingRightNow, setAmISpeakingRightNow] = useState(false);

    // Remote State
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [remoteUsername, setRemoteUsername] = useState('Remote Peer');
    const [remoteIsMuted, setRemoteIsMuted] = useState(false);
    const [remoteIsVideoOff, setRemoteIsVideoOff] = useState(false);
    const [remoteIsScreenSharing, setRemoteIsScreenSharing] = useState(false); // NEW STATE
    const [isPartnerSpeakingRightNow, setIsPartnerSpeakingRightNow] = useState(false);

    // Chat & Data States
    const [chatMessageHistory, setChatMessageHistory] = useState<ChatMessageInterface[]>([]);
    const [currentlyDisplayingReaction, setCurrentlyDisplayingReaction] = useState<{ emoji: string, id: number } | null>(null);

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const peerToPeerDataChannel = useRef<RTCDataChannel | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const incomingFileChunksRef = useRef<{ [fileId: string]: string[] }>({});
    
    const localStreamRef = useRef<MediaStream | null>(null);

    const isMutedRef = useRef(isMuted);
    const isVideoOffRef = useRef(isVideoOff);
    const isScreenSharingRef = useRef(isScreenSharing); // NEW REF
    const amISpeakingRef = useRef(amISpeakingRightNow);

    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { isVideoOffRef.current = isVideoOff; }, [isVideoOff]);
    useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]); // KEEP SYNCED
    useEffect(() => { amISpeakingRef.current = amISpeakingRightNow; }, [amISpeakingRightNow]);

    // Clear emoji reaction after 2 seconds
    useEffect(() => {
        if (currentlyDisplayingReaction) {
            const timer = setTimeout(() => setCurrentlyDisplayingReaction(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [currentlyDisplayingReaction]);

    // Audio Analyzer for speaking indicators
    useEffect(() => {
        if (!localStream || localStream.getAudioTracks().length === 0) {
            setAmISpeakingRightNow(false);
            return;
        }
        
        let audioCtx: AudioContext;
        let animationFrame: number;

        try {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();

            const analyzer = audioCtx.createAnalyser();
            analyzer.fftSize = 256;
            const source = audioCtx.createMediaStreamSource(localStream);
            source.connect(analyzer);
            const dataArray = new Uint8Array(analyzer.frequencyBinCount);

            const checkVolume = () => {
                analyzer.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setAmISpeakingRightNow(average > 15);
                animationFrame = requestAnimationFrame(checkVolume);
            };
            checkVolume();
        } catch (err) { console.error("Audio Analyzer Error:", err); }

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
            if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
        };
    }, [localStream]);

    // PHASE 1: THE LOBBY
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localStreamRef.current = stream; 
                setLocalStream(stream);
            })
            .catch(err => console.error("Camera access denied", err));

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // PHASE 2: ACTIVE ROOM
    useEffect(() => {
        if (!hasJoined || !localStreamRef.current) return;
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peerConnection.current = pc;

        const setupDataChannel = (channel: RTCDataChannel) => {
            peerToPeerDataChannel.current = channel;
            channel.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                if (data.type === 'chat') {
                    setChatMessageHistory(prev => [...prev, { ...data, isLocal: false }]);
                } 
                else if (data.type === 'command' && data.action === 'reaction') {
                    setCurrentlyDisplayingReaction({ emoji: data.emoji, id: Date.now() });
                }
                else if (data.type === 'file-chunk') {
                    const { fileId, chunk, chunkIndex, totalChunks, sender, timestamp } = data;
                    if (!incomingFileChunksRef.current[fileId]) incomingFileChunksRef.current[fileId] = [];
                    incomingFileChunksRef.current[fileId][chunkIndex] = chunk;
                    
                    if (Object.keys(incomingFileChunksRef.current[fileId]).length === totalChunks) {
                        const completeBase64Image = incomingFileChunksRef.current[fileId].join('');
                        setChatMessageHistory(prev => [...prev, { sender, text: '', imageUrl: completeBase64Image, timestamp, isLocal: false }]);
                        delete incomingFileChunksRef.current[fileId];
                    }
                }
            };
        };

        pc.ondatachannel = (event) => setupDataChannel(event.channel);

        // Always add from the raw camera stream initially
        localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
        pc.ontrack = (event) => setRemoteStream(event.streams[0]);

        const wsUrl = `ws://127.0.0.1:8000/api/rooms/ws/${roomCode}?token=${token}`;
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            ws.current?.send(JSON.stringify({ type: 'media-state', username, isMuted: isMutedRef.current, isVideoOff: isVideoOffRef.current, isSpeaking: amISpeakingRef.current, isScreenSharing: isScreenSharingRef.current }));
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
            }
        };

        ws.current.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            try {
                if (message.type === 'peer-joined') {
                    ws.current?.send(JSON.stringify({ type: 'media-state', username, isMuted: isMutedRef.current, isVideoOff: isVideoOffRef.current, isSpeaking: amISpeakingRef.current, isScreenSharing: isScreenSharingRef.current }));
                    const newDataChannel = pc.createDataChannel('chat');
                    setupDataChannel(newDataChannel);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    ws.current?.send(JSON.stringify({ type: 'offer', offer }));
                } 
                else if (message.type === 'offer') {
                    ws.current?.send(JSON.stringify({ type: 'media-state', username, isMuted: isMutedRef.current, isVideoOff: isVideoOffRef.current, isSpeaking: amISpeakingRef.current, isScreenSharing: isScreenSharingRef.current }));
                    await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    ws.current?.send(JSON.stringify({ type: 'answer', answer }));
                } 
                else if (message.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
                } 
                else if (message.type === 'ice-candidate') {
                    await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                } 
                else if (message.type === 'media-state') {
                    if (message.username) setRemoteUsername(message.username);
                    if (message.isMuted !== undefined) setRemoteIsMuted(message.isMuted);
                    if (message.isVideoOff !== undefined) setRemoteIsVideoOff(message.isVideoOff);
                    if (message.isSpeaking !== undefined) setIsPartnerSpeakingRightNow(message.isSpeaking);
                    if (message.isScreenSharing !== undefined) setRemoteIsScreenSharing(message.isScreenSharing); // NEW: Catch remote state
                }
                else if (message.type === 'peer-left') {
                    setRemoteStream(null);
                    setRemoteUsername("Remote Peer");
                    setRemoteIsScreenSharing(false); // Reset on leave
                }
                else if (message.type === 'command') {
                    if (message.action === 'kick') {
                        leaveRoom();
                        window.location.href = '/dashboard?kicked=true'; 
                    } else if (message.action === 'mute') {
                        if (!isMutedRef.current) toggleAudio();
                    } else if (message.action === 'video-off') {
                        if (!isVideoOffRef.current) toggleVideo();
                    }
                }
            } catch (err) {
                console.error("Signaling error:", err);
            }
        };

        return () => {
            pc.close();
            ws.current?.close();
        };
    }, [hasJoined, roomCode, username]);

    // NEW: Broadcast state changes instantly
    useEffect(() => {
        if (ws.current?.readyState === WebSocket.OPEN && hasJoined) {
            ws.current.send(JSON.stringify({ type: 'media-state', username, isMuted, isVideoOff, isSpeaking: amISpeakingRightNow, isScreenSharing }));
        }
    }, [isMuted, isVideoOff, amISpeakingRightNow, isScreenSharing, hasJoined, username]);

    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = async () => {
        try {
            if (!isVideoOff) {
                if (localStreamRef.current) {
                    localStreamRef.current.getVideoTracks().forEach(track => track.stop());
                }
                setIsVideoOff(true);
            } else {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newVideoTrack = newStream.getVideoTracks()[0];

                if (localStreamRef.current) {
                    localStreamRef.current.getVideoTracks().forEach(track => localStreamRef.current?.removeTrack(track));
                    localStreamRef.current.addTrack(newVideoTrack);
                    
                    if (!isScreenSharing) {
                        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                    }
                }

                if (peerConnection.current && !isScreenSharing) {
                    const sender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) sender.replaceTrack(newVideoTrack);
                    else peerConnection.current.addTrack(newVideoTrack, localStreamRef.current!);
                }
                setIsVideoOff(false);
            }
        } catch (error) {
            console.error("Error toggling video:", error);
            alert("Could not access camera. Please check your permissions.");
        }
    };

    const stopScreenShare = () => {
        if (localStreamRef.current) {
            const camTrack = localStreamRef.current.getVideoTracks()[0];
            const sender = peerConnection.current?.getSenders().find(s => s.track?.kind === 'video');
            
            if (sender && camTrack) {
                sender.replaceTrack(camTrack);
            }
            
            setLocalStream(localStreamRef.current);
            setIsScreenSharing(false);
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (!isScreenSharing) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: { cursor: "always" } as any, 
                    audio: false 
                });
                const screenTrack = screenStream.getVideoTracks()[0];
                
                const sender = peerConnection.current?.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }

                setLocalStream(screenStream);
                setIsScreenSharing(true);

                screenTrack.onended = () => {
                    stopScreenShare();
                };
            } else {
                if (localStream && localStream !== localStreamRef.current) {
                    localStream.getTracks().forEach(track => track.stop());
                }
                stopScreenShare();
            }
        } catch (error) {
            console.error("Error sharing screen:", error);
        }
    };

    const sendTextMessageToChat = (text: string) => {
        if (peerToPeerDataChannel.current?.readyState === 'open' && text.trim() !== '') {
            const payload = { type: 'chat', sender: username, text, timestamp: Date.now() };
            peerToPeerDataChannel.current.send(JSON.stringify(payload));
            setChatMessageHistory(prev => [...prev, { ...payload, isLocal: true }]);
        }
    };

    const sendEmojiReactionToPartner = (emoji: string) => {
        if (peerToPeerDataChannel.current?.readyState === 'open') {
            peerToPeerDataChannel.current.send(JSON.stringify({ type: 'command', action: 'reaction', emoji }));
            setCurrentlyDisplayingReaction({ emoji, id: Date.now() });
        }
    };

    const sendImageFileToChat = (imageFile: File) => {
        if (imageFile.size > 2 * 1024 * 1024) {
            alert("Please select an image under 2MB for direct peer-to-peer transfer.");
            return;
        }

        if (peerToPeerDataChannel.current?.readyState === 'open') {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result as string;
                const chunkSize = 16384; 
                const fileId = Date.now().toString();
                const totalChunks = Math.ceil(base64String.length / chunkSize);
                const timestamp = Date.now();

                for (let i = 0; i < totalChunks; i++) {
                    const chunk = base64String.slice(i * chunkSize, (i + 1) * chunkSize);
                    peerToPeerDataChannel.current?.send(JSON.stringify({
                        type: 'file-chunk', fileId, chunk, chunkIndex: i, totalChunks, sender: username, timestamp
                    }));
                }

                setChatMessageHistory(prev => [...prev, { sender: username, text: '', imageUrl: base64String, timestamp, isLocal: true }]);
            };
            reader.readAsDataURL(imageFile);
        }
    };

    const downloadChatHistoryAsPDF = async () => {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        
        let yOffset = 20;
        const margin = 15;
        const pageHeight = doc.internal.pageSize.height;
        const maxWidth = doc.internal.pageSize.width - margin * 2;

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(`Sync Room Chat: ${roomCode}`, margin, yOffset);
        yOffset += 15;

        for (const msg of chatMessageHistory) {
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            if (yOffset > pageHeight - 20) { doc.addPage(); yOffset = 20; }

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(100);
            doc.text(`[${time}] ${msg.sender}:`, margin, yOffset);
            yOffset += 6;

            if (msg.imageUrl) {
                try {
                    const img = new window.Image();
                    img.src = msg.imageUrl;
                    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });

                    let imgWidth = img.width;
                    let imgHeight = img.height;
                    const maxImgWidth = 100; 

                    if (imgWidth > maxImgWidth) {
                        const ratio = maxImgWidth / imgWidth;
                        imgWidth = maxImgWidth;
                        imgHeight = imgHeight * ratio;
                    }

                    if (yOffset + imgHeight > pageHeight - 15) { doc.addPage(); yOffset = 20; }
                    doc.addImage(msg.imageUrl, margin, yOffset, imgWidth, imgHeight);
                    yOffset += imgHeight + 10;
                } catch (e) {
                    console.error("Could not load image for PDF", e);
                    doc.setFont("helvetica", "italic");
                    doc.text("[Image could not be loaded]", margin, yOffset);
                    yOffset += 10;
                }
            } else {
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0);
                const textLines = doc.splitTextToSize(msg.text, maxWidth);
                
                if (yOffset + (textLines.length * 5) > pageHeight - 15) { doc.addPage(); yOffset = 20; }
                doc.text(textLines, margin, yOffset);
                yOffset += (textLines.length * 5) + 8;
            }
        }
        doc.save(`Chat_History_${roomCode}.pdf`);
    };

    const joinRoom = (displayName: string) => {
        setUsername(displayName);
        localStorage.setItem('saved_display_name', displayName);
        setHasJoined(true);
    };

    const leaveRoom = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            localStreamRef.current = null;
        }
        if (peerConnection.current) peerConnection.current.close();
        if (ws.current) ws.current.close();
        
        setLocalStream(null);
        setHasJoined(false);
    };

    const sendHostCommand = (action: 'kick' | 'mute' | 'video-off') => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'command', action }));
        }
    };

    return { 
        localStream, remoteStream, 
        toggleAudio, toggleVideo, toggleScreenShare, 
        isMuted, isVideoOff, isScreenSharing,
        joinRoom, leaveRoom, hasJoined, 
        username, remoteUsername, remoteIsMuted, remoteIsVideoOff,
        remoteIsScreenSharing, // NEW: Export the remote state
        amISpeakingRightNow, isPartnerSpeakingRightNow,
        chatMessageHistory, sendTextMessageToChat, sendEmojiReactionToPartner, sendImageFileToChat,
        currentlyDisplayingReaction, downloadChatHistoryAsPDF,
        sendHostCommand 
    };
}