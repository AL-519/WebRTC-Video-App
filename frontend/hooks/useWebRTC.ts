// frontend/hooks/useWebRTC.ts
import { useEffect, useRef, useState } from 'react';

export function useWebRTC(roomCode: string) {
    // Local State
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [username, setUsername] = useState('User');
    const [hasJoined, setHasJoined] = useState(false);

    // Remote State
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [remoteUsername, setRemoteUsername] = useState('Remote Peer');
    const [remoteIsMuted, setRemoteIsMuted] = useState(false);
    const [remoteIsVideoOff, setRemoteIsVideoOff] = useState(false);

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const ws = useRef<WebSocket | null>(null);

    // PHASE 1: THE LOBBY
    useEffect(() => {
        // Grab the username they logged in with
        const storedName = localStorage.getItem('username');
        if (storedName) setUsername(storedName);

        let streamRef: MediaStream | null = null;
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                streamRef = stream;
                setLocalStream(stream);
            })
            .catch(err => console.error("Camera access denied", err));

        return () => {
            streamRef?.getTracks().forEach(track => track.stop());
        };
    }, []);

    // PHASE 2: ACTIVE ROOM
    useEffect(() => {
        if (!hasJoined || !localStream) return;
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peerConnection.current = pc;

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        pc.ontrack = (event) => setRemoteStream(event.streams[0]);

        const wsUrl = `ws://127.0.0.1:8000/rooms/ws/${roomCode}?token=${token}`;
        ws.current = new WebSocket(wsUrl);

        // Announce our media state as soon as we connect
        ws.current.onopen = () => {
            ws.current?.send(JSON.stringify({ type: 'media-state', username, isMuted, isVideoOff }));
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
                    // Introduce ourselves to the new peer
                    ws.current?.send(JSON.stringify({ type: 'media-state', username, isMuted, isVideoOff }));
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    ws.current?.send(JSON.stringify({ type: 'offer', offer }));
                } 
                else if (message.type === 'offer') {
                    ws.current?.send(JSON.stringify({ type: 'media-state', username, isMuted, isVideoOff }));
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
                    // Update our UI when the remote peer changes their settings
                    if (message.username) setRemoteUsername(message.username);
                    if (message.isMuted !== undefined) setRemoteIsMuted(message.isMuted);
                    if (message.isVideoOff !== undefined) setRemoteIsVideoOff(message.isVideoOff);
                }
                else if (message.type === 'peer-left') {
                    setRemoteStream(null);
                }
            } catch (err) {
                console.error("Signaling error:", err);
            }
        };

        return () => {
            pc.close();
            ws.current?.close();
        };
    }, [hasJoined, roomCode, localStream, username]);

    // Broadcast our media state whenever we click a button
    useEffect(() => {
        if (ws.current?.readyState === WebSocket.OPEN && hasJoined) {
            ws.current.send(JSON.stringify({ type: 'media-state', username, isMuted, isVideoOff }));
        }
    }, [isMuted, isVideoOff, hasJoined, username]);

    // UI CONTROLS
    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            setIsMuted(!audioTrack.enabled);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled;
            setIsVideoOff(!videoTrack.enabled);
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (!isScreenSharing) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                const sender = peerConnection.current?.getSenders().find(s => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(screenTrack);

                screenTrack.onended = () => {
                    navigator.mediaDevices.getUserMedia({ video: true }).then(camStream => {
                        const camTrack = camStream.getVideoTracks()[0];
                        sender?.replaceTrack(camTrack);
                        setIsScreenSharing(false);
                    });
                };
                setIsScreenSharing(true);
            } else {
                const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const camTrack = camStream.getVideoTracks()[0];
                const sender = peerConnection.current?.getSenders().find(s => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(camTrack);
                setIsScreenSharing(false);
            }
        } catch (error) {
            console.error("Error sharing screen:", error);
        }
    };

    const joinRoom = () => setHasJoined(true);

    return { 
        localStream, remoteStream, 
        toggleAudio, toggleVideo, toggleScreenShare, 
        isMuted, isVideoOff, isScreenSharing,
        joinRoom, hasJoined, 
        username, remoteUsername, remoteIsMuted, remoteIsVideoOff // <-- Exporting new states
    };
}