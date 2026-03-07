import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Printer, AlertCircle, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const BookingFeedbackStatus = ({ bookingId, onPrint, onOpenFeedback }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkFeedback = async () => {
      if (!bookingId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('feedbacks')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          throw error;
        } else {
          if (isMounted) setFeedback(data && data.length > 0 ? data[0] : null);
        }
      } catch (err) {
        console.error("Error checking feedback:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkFeedback();

    // Set up realtime subscription to listen for new feedback for this booking
    const channel = supabase.channel(`public:feedbacks:status_${bookingId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks', filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          if (isMounted && payload.eventType !== 'DELETE') setFeedback(payload.new);
          if (isMounted && payload.eventType === 'DELETE') setFeedback(null);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const generateFeedbackLink = () => {
    return `${window.location.origin}/feedback-form?booking=${bookingId}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generateFeedbackLink());
    setCopied(true);
    toast({ title: "Link Copied", description: "Feedback link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-[#7a6a5a]"><Loader2 className="h-4 w-4 animate-spin" /> Checking feedback status...</div>;
  }

  if (feedback) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="text-green-600 font-medium flex items-center gap-1"><Check className="h-4 w-4" /> Feedback Completed</span>
          {feedback.tip_amount > 0 && <span className="text-gray-500 ml-2">({t('tipAmount')}: ₱{feedback.tip_amount})</span>}
        </div>
        <Button onClick={onPrint} className="bg-[#8b7355] hover:bg-[#7a6345] text-white gap-2">
          <Printer className="h-4 w-4" /> Print Service Slip
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-amber-600 font-medium flex items-center gap-1 text-sm">
          <AlertCircle className="h-4 w-4" /> Pending: Awaiting feedback submission
        </span>
        <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('feedbackLink')}:</span>
            <button onClick={copyLink} className="text-xs flex items-center gap-1 text-[#8b7355] hover:underline">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copied!' : 'Copy Link'}
            </button>
        </div>
      </div>
      <Button onClick={onOpenFeedback} variant="outline" className="border-[#8b7355] text-[#8b7355] hover:bg-[#f5f1ed]">
        Complete Feedback Now
      </Button>
    </div>
  );
};

export default BookingFeedbackStatus;