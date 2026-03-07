import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import SatisfactionForm from '@/components/SatisfactionForm';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const PublicFeedback = () => {
    const { toast } = useToast();
    const [serviceNames, setServiceNames] = useState([]);

    useEffect(() => {
        const fetchServices = async () => {
            const { data } = await supabase.from('services').select('name');
            if (data) {
                setServiceNames(data.map(s => s.name));
            }
        };
        fetchServices();
    }, []);

    const submitFeedback = async (formData) => {
        const id = "FB-" + Math.floor(100000 + Math.random() * 900000);
        
        // This ensures payment data is included in the feedback record
        const details = {
            ...formData,
            rating: formData.overallRating,
            service: formData.serviceAvailed,
            comment: formData.enjoyedMost,
            // ADDED: Explicitly ensure payment data is passed into the 'details' JSON
            payment_methods: formData.paymentMethods || [],
            payment_method_note: formData.paymentNote || ""
        };
    
        try {
           const { error } = await supabase.from('feedbacks').insert({
              reference_id: id,
              booking_id: formData.booking_id, // Link to the original order
              customer_name: formData.guestName || "Anonymous",
              status: 'New',
              details: JSON.stringify(details),
              tip_amount: formData.gratuityAmount || 0
           });
    
           if (error) throw error;

           return true; 
    
        } catch (error) {
          console.error("Feedback submission error:", error);
          toast({
              title: "Error",
              description: "Could not save your feedback. Please try again.",
              variant: "destructive"
          });
          return false;
        }
    };

    return (
        <div className="min-h-screen bg-[#fdfbf7]">
            <Helmet>
                <title>Guest Feedback | Lema Filipino Spa</title>
            </Helmet>
            <SatisfactionForm isPublic={true} onExternalSubmit={submitFeedback} />
        </div>
    );
};

export default PublicFeedback;