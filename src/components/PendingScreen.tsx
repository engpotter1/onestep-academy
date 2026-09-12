'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import SignOutButton from './SignOutButton';

export default function PendingScreen({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          if (payload.new && (payload.new.status === 'approved' || payload.new.is_approved === true)) {
            router.refresh();
            router.push('/dashboard');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4" dir="rtl">
      <div className="max-w-md w-full bg-gray-800 border border-gray-700 p-8 rounded-2xl text-center shadow-xl">
        <div className="w-16 h-16 bg-yellow-500/20 text-yellow-400 mx-auto rounded-full flex items-center justify-center mb-4 text-3xl">
          ⏳
        </div>
        <h2 className="text-2xl font-bold mb-2">الحساب قيد المراجعة</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          تم استلام طلب تسجيلك بنجاح، سيتم تفعيل حسابك فور مراجعة بياناتك من قِبل إدارة الأكاديمية. لا حاجة لتحديث الصفحة، سيتم توجيهك تلقائياً بمجرد التفعيل.
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}