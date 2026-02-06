import Link from 'next/link';
import { LayoutDashboard, ShoppingBag, Package, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

import ReviewsPanel from './ReviewsPanel';

export const metadata = {
  title: 'Admin Reviews',
  description: 'Manage review visibility'
};

export default async function AdminReviewsPage() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Admin Reviews</h1>
        <p className="mt-4 text-red-700">
          Missing Supabase environment variables. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>, then restart the dev server.
        </p>
      </div>
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: reviewsRows, error: reviewsError } = await supabase
    .from('reviews')
    .select('*')
    .order('creationTime', { ascending: false });

  if (reviewsError) console.error('Supabase error (reviews):', reviewsError);

  return (
    <div className="flex min-h-screen">
      <aside className="w-[250px] bg-[#E2E8F0] text-black">
        <div className="p-5 border-b border-[#cbd5e1]">
          <h2 className="text-2xl text-center">Dashboard</h2>
        </div>
        <nav aria-label="Sidebar" className="flex flex-col">
          <Link
            href="/dashboard"
            className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <button className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]">
            <ShoppingBag size={20} />
            <span>Orders</span>
          </button>
          <Link
            href="/admin-parts"
            className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]"
          >
            <Package size={20} />
            <span>Parts</span>
          </Link>
          <Link
            href="/dashboard/admin-reviews"
            className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1] bg-[#cbd5e1]"
          >
            <MessageSquare size={20} />
            <span>Reviews</span>
          </Link>
          <button className="text-lg flex items-center justify-center gap-2.5 p-5 border-b border-[#cbd5e1] hover:bg-[#cbd5e1]">
            <SettingsIcon size={20} />
            <span>Setting</span>
          </button>
        </nav>
      </aside>

      <ReviewsPanel
        initialReviews={reviewsRows || []}
        supabaseUrl={SUPABASE_URL}
        supabaseAnonKey={SUPABASE_ANON}
      />
    </div>
  );
}
