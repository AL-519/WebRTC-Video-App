// frontend/app/(auth)/login/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestOtp, verifyOtp } from '@/lib/api'; 
import { Mail, KeyRound, ArrowRight, Loader2, Video } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        
        setLoading(true);
        try {
            await requestOtp(email.trim());
            setStep(2);
        } catch (error) {
            console.error("Failed to request OTP:", error);
            alert("Could not send the login code.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp.trim()) return;

        setLoading(true);
        try {
            // Pass empty strings for the name/username since we ask for it later now
            const data = await verifyOtp(email.trim(), otp.trim(), '', '');
            localStorage.setItem('access_token', data.access_token);
            router.push('/dashboard');
        } catch (error) {
            console.error("Failed to verify OTP:", error);
            alert("Invalid or expired code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col items-center justify-center p-6">
            
            {/* Branding Header */}
            <div className="flex items-center gap-3 mb-10">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                    <Video className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white transition-colors duration-300">
                    WebRTC Sync
                </h1>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                
                {step === 1 ? (
                    /* STEP 1: REQUEST OTP */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Enter your email to receive a secure login code.</p>
                        </div>

                        <form onSubmit={handleRequestOtp} className="space-y-6">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                                <input 
                                    type="email" 
                                    required 
                                    placeholder="you@example.com" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition shadow-inner placeholder-gray-400 dark:placeholder-gray-500"
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={loading || !email.trim()} 
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-gray-700 disabled:text-blue-100 dark:disabled:text-gray-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 dark:shadow-none"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Login Code"}
                            </button>
                        </form>
                    </div>
                ) : (
                    /* STEP 2: VERIFY OTP */
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check Your Email</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Code sent to <span className="text-blue-600 dark:text-blue-400 font-medium">{email}</span>
                            </p>
                        </div>

                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="123456" 
                                    value={otp} 
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition text-center tracking-[0.5em] font-mono text-lg shadow-inner placeholder-gray-400 dark:placeholder-gray-500"
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={loading || !otp.trim()} 
                                className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-300 dark:disabled:bg-gray-700 disabled:text-green-100 dark:disabled:text-gray-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 mt-4 shadow-lg shadow-green-600/30 dark:shadow-none"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Login <ArrowRight className="w-5 h-5" /></>}
                            </button>

                            {/* Back button to re-enter email */}
                            <div className="text-center mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    Use a different email address
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}