import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, UserPlus, Users, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TherapistManager = () => {
  const [therapists, setTherapists] = useState([]);
  const [newTherapistName, setNewTherapistName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchTherapists = async () => {
    try {
      const { data, error } = await supabase
        .from('therapists')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTherapists(data || []);
    } catch (error) {
      console.error('Error fetching therapists:', error);
      const isRLS = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      toast({
        title: isRLS ? "Permission Denied" : "Error",
        description: isRLS ? "You do not have permission to view therapists." : "Failed to load therapists.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTherapists();
  }, []);

  const handleAddTherapist = async (e) => {
    e.preventDefault();
    if (!newTherapistName.trim()) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('therapists')
        .insert([{ name: newTherapistName.trim() }])
        .select()
        .single();

      if (error) throw error;

      setTherapists([...therapists, data]);
      setNewTherapistName('');
      toast({
        title: "Success",
        description: "Therapist added successfully.",
      });
    } catch (error) {
      console.error('Error adding therapist:', error);
      const isRLS = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      toast({
        title: isRLS ? "Permission Denied" : "Error",
        description: isRLS ? "You do not have permission to add therapists." : "Failed to add therapist.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTherapist = async (id) => {
    if (!window.confirm("Are you sure you want to remove this therapist?")) return;

    try {
      const { error } = await supabase
        .from('therapists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTherapists(therapists.filter(t => t.id !== id));
      toast({
        title: "Deleted",
        description: "Therapist removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting therapist:', error);
      const isRLS = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      toast({
        title: isRLS ? "Permission Denied" : "Error",
        description: isRLS ? "You do not have permission to delete therapists." : "Failed to delete therapist.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-[#fdfbf7] rounded-lg border border-[#e5ddd5]">
          <Users className="h-6 w-6 text-[#8b7355]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#5a4a3a]">Therapist Management</h2>
          <p className="text-sm text-gray-500">Add or remove therapists available for assignment.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
        <form onSubmit={handleAddTherapist} className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="therapistName">New Therapist Name</Label>
            <Input
              id="therapistName"
              value={newTherapistName}
              onChange={(e) => setNewTherapistName(e.target.value)}
              placeholder="e.g. Maria Clara"
              className="bg-gray-50"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isSubmitting || !newTherapistName.trim()}
            className="bg-[#8b7355] hover:bg-[#7a6345] text-white"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Add Therapist
          </Button>
        </form>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#5a4a3a] border-b pb-2">Current Staff List</h3>
          
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading staff...
            </div>
          ) : therapists.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
              No therapists found. Add one above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {therapists.map((therapist) => (
                  <motion.div
                    key={therapist.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#f5f1ed] flex items-center justify-center text-[#8b7355] font-semibold text-xs">
                        {therapist.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-700">{therapist.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTherapist(therapist.id)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TherapistManager;