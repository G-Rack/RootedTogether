import { supabase } from './supabaseClient';

// Star rating + review helpers. Every write here is gated by the
// offering_reviews_owner_insert RLS policy on the database side — a
// reviewer must already own a row in offering_purchases for that offering,
// so a review can never be faked from the client.

export async function fetchOfferingReviewStats(offeringId) {
  const { data } = await supabase.rpc('offering_review_stats', { p_offering_id: offeringId });
  return data?.[0] || { review_count: 0, avg_rating: 0 };
}

export async function fetchOfferingReviews(offeringId) {
  const { data } = await supabase.rpc('offering_reviews_for', { p_offering_id: offeringId });
  return data || [];
}

export async function fetchMyReview(offeringId, authUserId) {
  if (!authUserId) return null;
  const { data } = await supabase
    .from('offering_reviews')
    .select('*')
    .eq('offering_id', offeringId)
    .eq('reviewer_auth_id', authUserId)
    .maybeSingle();
  return data || null;
}

export async function submitReview({ offeringId, authUserId, rating, body }) {
  const row = {
    offering_id: offeringId,
    reviewer_auth_id: authUserId,
    rating,
    body: body?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('offering_reviews').upsert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteReview(reviewId) {
  const { error } = await supabase.from('offering_reviews').delete().eq('id', reviewId);
  if (error) throw error;
}

export async function fetchCreatorReviewStats(creatorId) {
  const { data } = await supabase.rpc('creator_review_stats', { creator_id: creatorId });
  return data?.[0] || { review_count: 0, avg_rating: 0 };
}

export async function fetchCreatorReviews(creatorId, limit = 6) {
  const { data } = await supabase.rpc('creator_reviews_for', { p_creator_id: creatorId, p_limit: limit });
  return data || [];
}

export async function fetchMarketStats() {
  const { data } = await supabase.rpc('offering_market_stats');
  const map = {};
  (data || []).forEach((row) => {
    map[row.offering_id] = row;
  });
  return map;
}
