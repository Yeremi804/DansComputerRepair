import Sidebar from "../../components/Sidebar";
import { supabase } from "@/lib/supabase/client";

import ReviewsPanel from './ReviewsPanel';

export const metadata = {
  title: 'Admin Reviews',
  description: 'Manage review visibility'
};

export default async function AdminReviewsPage() {
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
