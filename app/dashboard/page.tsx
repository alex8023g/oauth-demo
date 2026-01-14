'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  userId: string;
  email: string;
  name: string;
  picture?: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/me');

        if (!response.ok) {
          throw new Error('Not authenticated');
        }

        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        setError('Failed to load user data');
        console.error(err);
        // Redirect to login if not authenticated
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Failed to logout');
    }
  };

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black'>
        <div className='text-zinc-900 dark:text-zinc-100'>Loading...</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black'>
        <div className='text-red-600 dark:text-red-400'>{error}</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-black'>
      <div className='mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-4 flex items-center justify-between'>
          <h1 className='text-3xl font-bold text-zinc-900 dark:text-zinc-50'>
            Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className='rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200'
          >
            Logout
          </button>
        </div>

        {/* User Profile Card */}
        <div className='rounded-lg bg-white p-8 shadow-sm dark:bg-zinc-900'>
          <div className='flex items-center gap-6'>
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className='h-24 w-24 rounded-full border-2 border-zinc-200 dark:border-zinc-700'
              />
            )}
            <div>
              <h2 className='text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
                Welcome, {user?.name}!
              </h2>
              <p className='mt-1 text-zinc-600 dark:text-zinc-400'>{user?.email}</p>
              <p className='mt-2 text-sm text-zinc-500 dark:text-zinc-500'>
                User ID: {user?.userId}
              </p>
            </div>
          </div>
        </div>

        {/* Additional Content */}
        <div className='mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          <div className='rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900'>
            <h3 className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
              Profile
            </h3>
            <p className='mt-2 text-sm text-zinc-600 dark:text-zinc-400'>
              View and edit your profile information
            </p>
            <button className='mt-4 text-sm font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300'>
              Manage Profile →
            </button>
          </div>

          <div className='rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900'>
            <h3 className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
              Settings
            </h3>
            <p className='mt-2 text-sm text-zinc-600 dark:text-zinc-400'>
              Customize your account settings
            </p>
            <button className='mt-4 text-sm font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300'>
              Go to Settings →
            </button>
          </div>

          <div className='rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900'>
            <h3 className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
              Security
            </h3>
            <p className='mt-2 text-sm text-zinc-600 dark:text-zinc-400'>
              Manage your security preferences
            </p>
            <button className='mt-4 text-sm font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300'>
              Security Settings →
            </button>
          </div>
        </div>

        {/* Session Info */}
        <div className='mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950'>
          <h3 className='text-sm font-semibold text-zinc-900 dark:text-zinc-50'>
            Session Information
          </h3>
          <div className='mt-4 space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-zinc-600 dark:text-zinc-400'>Status:</span>
              <span className='font-medium text-green-600 dark:text-green-400'>
                Active
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-zinc-600 dark:text-zinc-400'>Authentication:</span>
              <span className='font-medium text-zinc-900 dark:text-zinc-100'>
                JWT Token
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-zinc-600 dark:text-zinc-400'>Provider:</span>
              <span className='font-medium text-zinc-900 dark:text-zinc-100'>
                Google OAuth
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
