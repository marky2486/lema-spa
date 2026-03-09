import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Plus, 
  Trash2, 
  Loader2, 
  Tag,
  Percent,
  Copy,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import PrintHeader from './PrintHeader';

const GiftCardsPage = () => {
  const { toast } = useToast();
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [newCard, setNewCard] = useState({
    code: '',
    discount_percentage: ''
  });

  useEffect(() => {
    fetchGiftCards();
  }, []);

  const fetchGiftCards = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Error fetching gift cards:', error);
      const isRLS = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      toast({ 
        title: isRLS ? "Permission Denied" : "Error", 
        description: isRLS ? "You do not have access to view gift cards." : "Failed to load gift cards.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCard(prev => ({ ...prev, code: result }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCard.code || !newCard.discount_percentage) {
      toast({ title: "Required", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const percentage = parseFloat(newCard.discount_percentage);
    if (isNaN(percentage) || percentage < 0.01 || percentage > 100) {
      toast({ title: "Invalid Discount", description: "Percentage must be between 0.01 and 100", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .insert({
          code: newCard.code.toUpperCase(),
          discount_percentage: percentage
        })
        .select()
        .single();

      if (error) throw error;

      setCards([data, ...cards]);
      setNewCard({ code: '', discount_percentage: '' });
      toast({ title: "Success", description: "Gift card code created successfully." });
    } catch (error) {
      console.error('Error creating card:', error);
      const isRLS = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      toast({ 
        title: isRLS ? "Permission Denied" : "Creation Failed", 
        description: isRLS ? "You do not have permission to create gift cards." : error.message.includes('unique') ? "Code already exists." : "Could not create gift card.", 
        variant: "destructive" 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this code? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('gift_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCards(cards.filter(c => c.id !== id));
      toast({ title: "Deleted", description: "Gift card code removed." });
    } catch (error) {
      console.error('Error deleting:', error);
      const isRLS = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
      toast({ 
        title: isRLS ? "Permission Denied" : "Error", 
        description: isRLS ? "You do not have permission to delete gift cards." : "Could not delete code.", 
        variant: "destructive" 
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Code copied to clipboard" });
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="w-full">
      <PrintHeader title="Active Gift Cards" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="lg:col-span-1 print:hidden">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="h-12 w-12 bg-[#8b7355]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Gift className="h-6 w-6 text-[#8b7355]" />
              </div>
              <h2 className="text-lg font-bold text-[#5a4a3a]">Create Promo Code</h2>
              <p className="text-xs text-gray-500 mt-1">Generate codes for customer discounts</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="code">Code</Label>
                  <button 
                    type="button" 
                    onClick={generateRandomCode}
                    className="text-xs text-[#8b7355] hover:underline"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <Tag className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="code"
                    placeholder="SUMMER2024"
                    className="pl-9 uppercase"
                    value={newCard.code}
                    onChange={(e) => setNewCard(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Discount Percentage (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="discount"
                    type="number"
                                    step="any"
                    placeholder="20"
                    className="pl-9"
                    min="0.01"
                    max="100"
                    value={newCard.discount_percentage}
                    onChange={(e) => setNewCard(prev => ({ ...prev, discount_percentage: e.target.value }))}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#8b7355] hover:bg-[#7a6345] text-white"
                disabled={isCreating}
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Code'}
              </Button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2 print:col-span-3">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center print:bg-white print:border-none">
              <h3 className="font-semibold text-[#5a4a3a] flex items-center gap-2 print:hidden">
                <Tag className="h-4 w-4 text-[#8b7355]" /> Active Codes
              </h3>
              <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 print:hidden">{cards.length} total</span>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden h-8 gap-2">
                      <Printer className="h-3 w-3" />
                      Print
                  </Button>
              </div>
            </div>

            <div className="flex-grow overflow-auto p-0 print:overflow-visible">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400 print:hidden">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <span className="text-xs">Loading codes...</span>
                </div>
              ) : cards.length === 0 ? (
                <div className="text-center p-8 text-gray-400 text-sm">
                  No active gift card codes found.
                </div>
              ) : (
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 print:bg-transparent print:border-b print:border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium text-center">Discount</th>
                      <th className="px-4 py-3 font-medium text-right">Created</th>
                      <th className="px-4 py-3 font-medium text-right print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y print:divide-gray-200">
                    {cards.map((card) => (
                      <tr key={card.id} className="hover:bg-gray-50 transition-colors break-inside-avoid">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-[#5a4a3a] bg-gray-100 print:bg-transparent print:border print:border-gray-300 px-2 py-1 rounded">
                              {card.code}
                            </span>
                            <button 
                              onClick={() => copyToClipboard(card.code)}
                              className="text-gray-400 hover:text-[#8b7355] print:hidden"
                              title="Copy Code"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-green-600">
                          {card.discount_percentage}%
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500">
                          {new Date(card.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right print:hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(card.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftCardsPage;
