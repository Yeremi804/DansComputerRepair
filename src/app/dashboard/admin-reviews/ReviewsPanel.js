'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from "@/lib/supabase/client";
import { Star, Eye, EyeOff, Filter, ArrowUpDown } from 'lucide-react';
import dayjs from 'dayjs';

export default function ReviewsPanel({ initialReviews}) {
  const [reviews, setReviews] = useState([]);
  const [filterSource, setFilterSource] = useState('all');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const [loading, setLoading] = useState(false);

 

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data: yelpRows, error: yelpError } = await supabase
        .from('Yelp_Embed_Reviews')
        .select('*')
        .order('id', { ascending: true });

      if (yelpError) {
        console.error('Error fetching Yelp reviews:', yelpError);
      }

      const normalizedYelp = (yelpRows || []).map((row) => ({
        id: `yelp-${row.id}`,
        real_id: row.id,
        name: row.name || 'Yelp Review',
        rating: Number(row.rating || 5),
        review_text: row.embed || 'Embedded Yelp review',
        created_at: row.created_at || new Date().toISOString(),
        source: 'Yelp',
        show_on_site: row.show_on_site !== false,
      }));

      const normalizedLocal = (initialReviews || []).map((row) => ({
        id: row.id,
        name: row.name,
        rating: row.rating,
        review_text: row.reviewText,
        created_at: row.creationTime,
        source: 'Local',
        show_on_site: row.show_on_site !== false,
      }));

      setReviews([...normalizedLocal, ...normalizedYelp]);
      setLoading(false);
    };

    loadData();
  }, [initialReviews, supabase]);

  const handleToggleVisibility = async (review) => {
    const newVisibility = !review.show_on_site;
    const tableName = review.source === 'Local' ? 'reviews' : 'Yelp_Embed_Reviews';
    const idToUpdate = review.source === 'Local' ? review.id : review.real_id;

    const { error } = await supabase
      .from(tableName)
      .update({ show_on_site: newVisibility })
      .eq('id', idToUpdate);

    if (error) {
      console.error('Error updating visibility:', error);
      alert('Failed to update visibility');
      return;
    }

    setReviews((prev) =>
      prev.map((r) => (r.id === review.id ? { ...r, show_on_site: newVisibility } : r))
    );
  };

  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviews];

    if (filterSource !== 'all') {
      result = result.filter((r) => r.source.toLowerCase() === filterSource.toLowerCase());
    }

    result.sort((a, b) => {
      if (sortOrder === 'date-desc') return dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf();
      if (sortOrder === 'date-asc') return dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf();
      if (sortOrder === 'rating-desc') return b.rating - a.rating;
      if (sortOrder === 'rating-asc') return a.rating - b.rating;
      return 0;
    });

    return result;
  }, [reviews, filterSource, sortOrder]);

  useEffect(() => {
    const existing = document.getElementById('yelp-embed-script');

  
    if (existing) {
      existing.remove();
    }

    const script = document.createElement('script');
    script.id = 'yelp-embed-script';
    script.src = 'https://www.yelp.com/embed/widgets.js';
    script.async = true;

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [filteredAndSortedReviews]); 

  return (
    <main className="flex-1 p-8 bg-main-bg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-main-text">Customer Reviews</h1>

        <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
          <Filter size={18} className="text-gray-500" />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700"
          >
            <option value="all">All Sources</option>
            <option value="local">Local Site</option>
            <option value="yelp">Yelp.com</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
          <ArrowUpDown size={18} className="text-gray-500" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="rating-desc">Highest Rated</option>
            <option value="rating-asc">Lowest Rated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading reviews...</p>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredAndSortedReviews.length === 0 ? (
            <p className="text-gray-500 col-span-full">No reviews found.</p>
          ) : (
            filteredAndSortedReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                      {review.name ? review.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{review.name || 'Anonymous'}</h3>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        {dayjs(review.created_at).format('MMM D, YYYY')}
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        {review.source}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleVisibility(review)}
                    className={`transition-colors p-1 ${
                      review.show_on_site ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={review.show_on_site ? 'Hide from site' : 'Show on site'}
                  >
                    {review.show_on_site ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>

                {review.source !== 'Yelp' && (
                  <div className="flex mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={`${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>
                )}

                {review.source === 'Yelp' ? (
                  <div className="flex-1 min-h-[180px]">
                    <div
                      className="yelp-wrapper block w-full overflow-visible"
                      dangerouslySetInnerHTML={{ __html: review.review_text }}
                    />
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">
                    "{review.review_text || review.comment}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
