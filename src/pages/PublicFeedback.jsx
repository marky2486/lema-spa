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
        
        const details = {
            ...formData,
            rating: formData.overallRating,
            service: formData.serviceAvailed,
            comment: formData.enjoyedMost
        };
    
        try {
           const { error } = await supabase.from('feedbacks').insert({
              reference_id: id,
              customer_name: formData.guestName || "Anonymous",
              status: 'New',
              details: details
           });
    
           if (error) throw error;
    
        } catch (error) {
          console.error("Feedback submission error:", error);
          toast({ title: "Submission Failed", description: "Could not save feedback. Please try again.", variant: "destructive" });
        }
    };

    return (
        <>
            <Helmet>
                <title>Guest Feedback - Lema Spa</title>
                <meta name="description" content="Share your experience at Lema Filipino Spa." />
            </Helmet>
            <SatisfactionForm 
                services={serviceNames}
                isPublic={true}
                onSubmit={submitFeedback}
                onClose={() => {}} // No-op for public form
            />
        </>
    );
};

export default PublicFeedback;