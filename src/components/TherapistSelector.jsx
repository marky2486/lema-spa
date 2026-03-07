import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, UserCog } from 'lucide-react';

const TherapistSelector = ({ value, onChange, className }) => {
  const { t } = useLanguage();
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTherapists = async () => {
      try {
        const { data, error } = await supabase
          .from('therapists')
          .select('id, name')
          .order('name');
        
        if (error) throw error;
        setTherapists(data || []);
      } catch (err) {
        console.error("Error fetching therapists:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTherapists();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 text-sm ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading therapists...
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="therapist_id" className="flex items-center gap-1 text-[#5a4a3a]">
        <UserCog className="h-3 w-3" /> {t('selectTherapist')} <span className="text-red-500">*</span>
      </Label>
      <select 
        id="therapist_id" 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        className="flex h-10 w-full rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus-visible:ring-[#8b7355] outline-none"
        required
      >
        <option value="" disabled>Select a therapist...</option>
        {therapists.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  );
};

export default TherapistSelector;