import Sidebar from "../../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

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
      <div className="p-8 bg-main-bg text-main-text min-h-screen">
        <h1 className="text-xl font-semibold">Admin Reviews</h1>
        <p className="mt-4 text-red-700 dark:text-red-400">
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
    <div className="flex min-h-screen bg-main-bg">
      <Sidebar />

      <ReviewsPanel
        initialReviews={reviewsRows || []}
      />
    </div>
  );
}
