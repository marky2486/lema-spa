import React from 'react';
import { Helmet } from 'react-helmet';
import IntakeForm from '@/components/IntakeForm';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const PublicIntake = () => {
    const { toast } = useToast();

    const submitIntake = async (formData) => {
        const id = "INT-" + Math.floor(100000 + Math.random() * 900000);
        
        const conditionsList = Object.keys(formData).filter(key => 
            ['highBloodPressure', 'backPain', 'allergies', 'recentSurgery', 'injuries', 'soreThroatCongestion', 'pregnancy', 'painArmLegNeck'].includes(key) && 
            formData[key] === true
        );
    
        const details = {
            ...formData,
            conditions: conditionsList
        };
    
        try {
          const { error } = await supabase.from('intakes').insert({
            reference_id: id,
            customer_name: formData.clientName,
            status: 'New',
            details: details
          });
    
          if (error) throw error;
          // Success handling is done within IntakeForm via isPublic flow (showing success step)
          
        } catch (error) {
          console.error("Intake submission error:", error);
          toast({ title: "Submission Failed", description: "Could not save intake form. Please try again.", variant: "destructive" });
        }
    };

    return (
        <>
            <Helmet>
                <title>Client Intake Form - Lema Spa</title>
                <meta name="description" content="Client intake form for Lema Filipino Spa." />
            </Helmet>
            <IntakeForm 
                isPublic={true} 
                onSubmit={submitIntake}
                onClose={() => {}} // No-op for public form
            />
        </>
    );
};

export default PublicIntake;