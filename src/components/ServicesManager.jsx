import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, FileImage as ImageIcon, Loader2, RefreshCcw, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServices } from '@/hooks/useServices';

const ServicesManager = () => {
  const { toast } = useToast();
  const { currentLanguage } = useLanguage();
  const { services, loading, error, refetch } = useServices();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const initialFormState = {
    name: '', // Legacy fallback
    category: 'SPA PACKAGES',
    duration: '60 min',
    price: '',
    image: '',
    name_en: '', name_ja: '', name_ko: '', name_zh: '',
    description_en: '', description_ja: '', description_ko: '', description_zh: ''
  };
  
  const [formData, setFormData] = useState(initialFormState);

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name || service.name_en || '',
      category: service.category || 'SPA PACKAGES',
      duration: service.duration || '',
      price: service.price || '',
      image: service.image || '',
      name_en: service.name_en || service.name || '',
      name_ja: service.name_ja || '',
      name_ko: service.name_ko || '',
      name_zh: service.name_zh || '',
      description_en: service.description_en || service.description || '',
      description_ja: service.description_ja || '',
      description_ko: service.description_ko || '',
      description_zh: service.description_zh || ''
    });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingService(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name_en || !formData.price) {
      toast({ title: "Required Fields", description: "English Name and Price are required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    // Prepare data to save, ensuring fallback legacy fields are also updated
    const dataToSave = {
      ...formData,
      name: formData.name_en, // Sync legacy 'name' with 'name_en'
      description: formData.description_en // Sync legacy 'description' with 'description_en'
    };

    try {
      if (editingService) {
        // Update existing
        const { error: saveError } = await supabase
          .from('services')
          .update(dataToSave)
          .eq('id', editingService.id);
        
        if (saveError) throw saveError;
        toast({ title: "Success", description: "Service updated successfully." });
      } else {
        // Insert new
        const { error: saveError } = await supabase
          .from('services')
          .insert(dataToSave);
        
        if (saveError) throw saveError;
        toast({ title: "Success", description: "New service added successfully." });
      }
      
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      console.error('Error saving service:', err);
      const isRLS = err.code === '42501' || err.message?.toLowerCase().includes('row-level security');
      toast({ 
        title: isRLS ? "Permission Denied" : "Error", 
        description: isRLS ? "You do not have permission to modify services." : "Failed to save service.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error: delError } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (delError) throw delError;
      toast({ title: "Deleted", description: "Service removed." });
      refetch();
    } catch (err) {
      console.error('Error deleting service:', err);
      const isRLS = err.code === '42501' || err.message?.toLowerCase().includes('row-level security');
      toast({ 
        title: isRLS ? "Permission Denied" : "Error", 
        description: isRLS ? "You do not have permission to delete services." : "Failed to delete service.", 
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#8b7355]" />
        <p className="text-[#7a6a5a]">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#5a4a3a]">Service Products</h2>
          <p className="text-sm text-gray-500">Manage your catalog items and translations</p>
        </div>
        <Button onClick={handleAddNew} className="bg-[#8b7355] hover:bg-[#7a6345] text-white gap-2">
          <Plus className="h-4 w-4" /> Add New Product
        </Button>
      </div>

      {error ? (
        <div className="bg-white rounded-xl border border-red-100 p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={refetch} variant="outline" className="gap-2 border-red-200 hover:bg-red-50 text-red-600">
            <RefreshCcw className="h-4 w-4" /> Retry
          </Button>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 flex flex-col items-center justify-center text-center shadow-sm text-gray-500">
          <ImageIcon className="h-12 w-12 text-gray-300 mb-4" />
          <p>No products found. Start by adding a new product.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const displayName = service[`name_${currentLanguage}`] || service.name_en || service.name;
            const displayDescription = service[`description_${currentLanguage}`] || service.description_en || service.description;

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-[#e5ddd5] flex flex-col h-full group"
              >
                {/* Image Container */}
                <div className="h-48 w-full overflow-hidden bg-gray-50 relative border-b border-[#e5ddd5]">
                  {service.image ? (
                    <img 
                      src={service.image} 
                      alt={displayName} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider text-[#5a4a3a] uppercase shadow-sm border border-white/20">
                    {service.category}
                  </div>
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm border border-white/20 flex gap-1">
                    {['en', 'ja', 'ko', 'zh'].map(lang => (
                      <span key={lang} className={`text-[9px] font-bold uppercase ${service[`name_${lang}`] ? 'text-green-600' : 'text-gray-300'}`}>
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <div className="mb-4 flex-grow">
                    <h4 className="text-lg font-semibold text-[#5a4a3a] mb-2 leading-snug line-clamp-2" title={displayName}>
                      {displayName}
                    </h4>
                    <p className="text-sm text-[#7a6a5a] leading-relaxed line-clamp-3" title={displayDescription}>
                      {displayDescription}
                    </p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-[#e5ddd5]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-[#7a6a5a]">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">{service.duration || 'N/A'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-[#8b7355]">
                          ₱{service.price?.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleEdit(service)}
                        variant="outline"
                        className="flex-1 border-[#8b7355]/30 text-[#8b7355] hover:bg-[#8b7355] hover:text-white transition-colors duration-200"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(service.id)}
                        variant="outline"
                        className="flex-none px-3 border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition-colors duration-200"
                        title="Delete Product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              {editingService ? 'Edit Product' : 'Add New Product'}
              <Globe className="h-4 w-4 text-gray-400" />
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6 py-4 text-gray-900">
             {/* General Settings */}
             <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
               <div className="grid gap-2">
                 <Label htmlFor="category" className="text-gray-700">Category</Label>
                 <Input id="category" className="text-gray-900 bg-white" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} list="categories" />
                 <datalist id="categories">
                    <option value="SPA PACKAGES" />
                    <option value="MASSAGE & BODY CARE" />
                    <option value="FACIAL CARE" />
                    <option value="SHORT MASSAGES" />
                    <option value="FOOT & NAIL CARE" />
                 </datalist>
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="price" className="text-gray-700">Price (₱) *</Label>
                 <Input id="price" className="text-gray-900 bg-white" type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="duration" className="text-gray-700">Duration</Label>
                 <Input id="duration" className="text-gray-900 bg-white" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} placeholder="e.g. 60 min" />
               </div>
               <div className="grid gap-2">
                 <Label htmlFor="image" className="text-gray-700">Image URL</Label>
                 <Input id="image" className="text-gray-900 bg-white" value={formData.image} onChange={(e) => setFormData({...formData, image: e.target.value})} placeholder="https://..." />
               </div>
             </div>

             {/* Translations */}
             <div className="border rounded-lg overflow-hidden">
               <Tabs defaultValue="en" className="w-full">
                  <div className="bg-gray-100 border-b px-2 py-2">
                    <TabsList className="grid grid-cols-4 w-full">
                      <TabsTrigger value="en">English *</TabsTrigger>
                      <TabsTrigger value="ja">Japanese</TabsTrigger>
                      <TabsTrigger value="ko">Korean</TabsTrigger>
                      <TabsTrigger value="zh">Chinese</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  {/* English Tab */}
                  <TabsContent value="en" className="p-4 space-y-4 mt-0">
                     <div className="grid gap-2">
                       <Label htmlFor="name_en" className="text-gray-700">English Name *</Label>
                       <Input id="name_en" className="text-gray-900 bg-white" value={formData.name_en} onChange={(e) => setFormData({...formData, name_en: e.target.value})} required />
                     </div>
                     <div className="grid gap-2">
                       <Label htmlFor="description_en" className="text-gray-700">English Description</Label>
                       <Textarea id="description_en" className="text-gray-900 bg-white h-24" value={formData.description_en} onChange={(e) => setFormData({...formData, description_en: e.target.value})} />
                     </div>
                  </TabsContent>

                  {/* Japanese Tab */}
                  <TabsContent value="ja" className="p-4 space-y-4 mt-0">
                     <div className="grid gap-2">
                       <Label htmlFor="name_ja" className="text-gray-700">Japanese Name</Label>
                       <Input id="name_ja" className="text-gray-900 bg-white" value={formData.name_ja} onChange={(e) => setFormData({...formData, name_ja: e.target.value})} />
                     </div>
                     <div className="grid gap-2">
                       <Label htmlFor="description_ja" className="text-gray-700">Japanese Description</Label>
                       <Textarea id="description_ja" className="text-gray-900 bg-white h-24" value={formData.description_ja} onChange={(e) => setFormData({...formData, description_ja: e.target.value})} />
                     </div>
                  </TabsContent>

                  {/* Korean Tab */}
                  <TabsContent value="ko" className="p-4 space-y-4 mt-0">
                     <div className="grid gap-2">
                       <Label htmlFor="name_ko" className="text-gray-700">Korean Name</Label>
                       <Input id="name_ko" className="text-gray-900 bg-white" value={formData.name_ko} onChange={(e) => setFormData({...formData, name_ko: e.target.value})} />
                     </div>
                     <div className="grid gap-2">
                       <Label htmlFor="description_ko" className="text-gray-700">Korean Description</Label>
                       <Textarea id="description_ko" className="text-gray-900 bg-white h-24" value={formData.description_ko} onChange={(e) => setFormData({...formData, description_ko: e.target.value})} />
                     </div>
                  </TabsContent>

                  {/* Chinese Tab */}
                  <TabsContent value="zh" className="p-4 space-y-4 mt-0">
                     <div className="grid gap-2">
                       <Label htmlFor="name_zh" className="text-gray-700">Chinese Name</Label>
                       <Input id="name_zh" className="text-gray-900 bg-white" value={formData.name_zh} onChange={(e) => setFormData({...formData, name_zh: e.target.value})} />
                     </div>
                     <div className="grid gap-2">
                       <Label htmlFor="description_zh" className="text-gray-700">Chinese Description</Label>
                       <Textarea id="description_zh" className="text-gray-900 bg-white h-24" value={formData.description_zh} onChange={(e) => setFormData({...formData, description_zh: e.target.value})} />
                     </div>
                  </TabsContent>
               </Tabs>
             </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#8b7355] text-white hover:bg-[#7a6345]">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesManager;