// frontend/app/(auth)/login/page.tsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Mail, KeyRound, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            await api.post('/auth/request-otp', { email });
            setStep(2); // Move to OTP verification step
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to request OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const response = await api.post('/auth/verify-otp', { email, otp });
            
            // Save the JWT and user data to localStorage
            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('username', response.data.username);
            
            // Redirect to the dashboard
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        {step === 1 ? 'WebRTC Video App' : 'Enter Security Code'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {step === 1 
                            ? 'Enter your email to receive a secure login code.' 
                            : `We sent a code to ${email}`}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={step === 1 ? handleRequestOTP : handleVerifyOTP}>
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="name@example.com"
                            />
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <KeyRound className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm tracking-widest text-center text-lg"                                
                                placeholder="123456"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin h-5 w-5" />
                        ) : (
                            <>
                                {step === 1 ? 'Send Login Code' : 'Verify & Login'}
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
                
                {step === 2 && (
                    <button 
                        onClick={() => setStep(1)}
                        className="w-full text-sm text-gray-500 hover:text-gray-900 text-center mt-4"
                    >
                        Use a different email
                    </button>
                )}
            </div>
        </div>
    );
}