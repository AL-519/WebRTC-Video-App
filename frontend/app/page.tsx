// frontend/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // Check for the authentication token
        const token = localStorage.getItem('access_token');
        
        // Redirect based on auth state
        if (token) {
            router.push('/dashboard');
        } else {
            router.push('/login');
        }
    }, [router]);

    // Show a simple loading spinner while we check the routing
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600 border-solid border-r-transparent"></div>
        </div>
    );
}