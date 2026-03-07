import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useBookingFeedback(bookingId, referenceId) {
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        async function fetchFeedback() {
            if (!bookingId && !referenceId) {
                if (isMounted) setLoading(false);
                return;
            }

            try {
                // Try searching by booking_id first (preferred based on new logic)
                // Fallback to reference_id if not found (legacy data compatibility)
                const searchId = referenceId || bookingId;
                
                const { data, error } = await supabase
                    .from('feedbacks')
                    .select('*')
                    .or(`booking_id.eq.${searchId},reference_id.eq.${searchId}`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                if (isMounted) {
                    setFeedback(data);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error fetching feedback:", err);
                if (isMounted) {
                    setFeedback(null);
                    setLoading(false);
                }
            }
        }

        fetchFeedback();

        // Subscribe to real-time changes
        const targetId = referenceId || bookingId;
        const channel = supabase.channel(`public:feedbacks:status_${targetId}`)
            .on(
                'postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'feedbacks'
                },
                (payload) => {
                    // Check if payload matches our booking manually since OR filter in subscription is limited
                    const isMatch = payload.new?.booking_id === targetId || 
                                    payload.new?.reference_id === targetId ||
                                    payload.old?.booking_id === targetId ||
                                    payload.old?.reference_id === targetId;
                                    
                    if (isMatch && isMounted) {
                        if (payload.eventType === 'DELETE') {
                            setFeedback(null);
                        } else {
                            setFeedback(payload.new);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [bookingId, referenceId]);

    return { feedback, loading };
}