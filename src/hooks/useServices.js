import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';

export function useServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentLanguage } = useLanguage();

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('services')
        .select('*')
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;

      // We can map the localized fields here for convenience, 
      // but returning the raw array allows flexible usage.
      const localizedData = (data || []).map(service => ({
        ...service,
        // Provide convenient aliases based on current language
        localizedName: service[`name_${currentLanguage}`] || service.name_en || service.name,
        localizedDescription: service[`description_${currentLanguage}`] || service.description_en || service.description,
      }));

      setServices(localizedData);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err.message || "Failed to load services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
    // Re-fetch when language changes if we want the localizedName aliases to update, 
    // or just rely on components extracting it. We re-run to update `localizedName`.
  }, [currentLanguage]);

  return { services, loading, error, refetch: fetchServices };
}