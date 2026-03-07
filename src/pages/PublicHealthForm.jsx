import React from 'react';
import { Helmet } from 'react-helmet';
import HealthForm from '@/components/HealthForm'; // Renamed import
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const PublicHealthForm = () => { // Renamed component
    const { toast } = useToast();

    const submitHealthForm = async (formData) => { // Renamed function
        const id = "INT-" + Math.floor(100000 + Math.random() * 900000);
        
        const conditionsList = Object.keys(formData).filter(key => 
            ['highBloodPressure', 'backPain', 'allergies', 'recentSurgery', 'injuries', 'soreThroatCongestion', 'pregnancy', 'painArmLegNeck', 'peanutAllergy', 'coconutOilAllergy', 'otherAllergy'].includes(key) && 
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
          // Success handling is done within HealthForm via isPublic flow (showing success step)
          
        } catch (error) {
          console.error("Health form submission error:", error);
          toast({ title: "Submission Failed", description: "Could not save health form. Please try again.", variant: "destructive" }); // Updated toast message
        }
    };

    return (
        <>
            <Helmet>
                <title>Client Health Form - Lema Spa</title> {/* Updated title */}
                <meta name="description" content="Client health form for Lema Filipino Spa." /> {/* Updated description */}
            </Helmet>
            <HealthForm // Renamed component
                isPublic={true} 
                onSubmit={submitHealthForm} // Updated onSubmit prop
                onClose={() => {}} // No-op for public form
            />
        </>
    );
};

export default PublicHealthForm; // Renamed export