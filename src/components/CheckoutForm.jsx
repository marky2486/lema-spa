
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CreditCard, Tag, Loader2, X, Plus, Trash2, UserPlus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { CountrySelect } from '@/components/CountrySelect';
import { cn } from '@/lib/utils';
import TherapistSelector from './TherapistSelector';
import { Textarea } from '@/components/ui/textarea';

function CheckoutForm({ cart, totalPrice, onCancel, onSubmit }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  
  const [giftCode, setGiftCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthdate: '',
    country: '',
    payment_methods: [],
    payment_method_note: '',
    note: '',
    therapist_id: ''
  });

  // Companion State
  const [hasCompanions, setHasCompanions] = useState(false);
  const [companions, setCompanions] = useState([
      { fullName: '', email: '', phone: '', birthdate: '', country: '' }
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (value) => {
    setFormData(prev => ({ ...prev, country: value }));
  };

  const handleTherapistChange = (value) => {
    setFormData(prev => ({ ...prev, therapist_id: value }));
  };

  const handleCompanionChange = (index, field, value) => {
    const newCompanions = [...companions];
    newCompanions[index][field] = value;
    setCompanions(newCompanions);
  };

  const addCompanion = () => {
    setCompanions([...companions, { fullName: '', email: '', phone: '', birthdate: '', country: '' }]);
  };

  const removeCompanion = (index) => {
    const newCompanions = companions.filter((_, i) => i !== index);
    setCompanions(newCompanions);
    if (newCompanions.length === 0) {
        setHasCompanions(false);
        setCompanions([{ fullName: '', email: '', phone: '', birthdate: '', country: '' }]);
    }
  };

  const togglePaymentMethod = (method) => {
    setFormData(prev => {
      const current = prev.payment_methods || [];
      const isSelected = current.includes(method);
      const newMethods = isSelected ? current.filter(m => m !== method) : [...current, method];
      return { ...prev, payment_methods: newMethods };
    });
  };

  const handleApplyCode = async () => {
    if (!giftCode.trim()) return;
    
    setIsValidatingCode(true);
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('code, discount_percentage')
        .eq('code', giftCode.toUpperCase().trim())
        .single();

      if (error) {
        const isRLS = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
        if (isRLS) {
            toast({
              title: "Permission Denied",
              description: "You do not have permission to access gift cards.",
              variant: "destructive"
            });
        } else {
            toast({
              title: "Invalid Code",
              description: "The gift card code you entered is not valid.",
              variant: "destructive"
            });
        }
        setAppliedDiscount(null);
      } else if (!data) {
         toast({
          title: "Invalid Code",
          description: "The gift card code you entered is not valid.",
          variant: "destructive"
        });
        setAppliedDiscount(null);
      } else {
        setAppliedDiscount({
          code: data.code,
          percentage: data.discount_percentage
        });
        toast({
          title: "Discount Applied!",
          description: `${data.discount_percentage}% discount has been applied to your order.`,
          className: "bg-green-50 border-green-200 text-green-800"
        });
      }
    } catch (err) {
      console.error("Validation error:", err);
      toast({ title: "Error", description: "Could not validate code.", variant: "destructive" });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setGiftCode('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.fullName || !formData.phone || !formData.birthdate || !formData.country || !formData.therapist_id) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Name, Phone, Birthdate, Country, Therapist) for the main guest.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (!formData.payment_methods || formData.payment_methods.length === 0) {
        toast({
            title: "Payment Method Required",
            description: "Please select at least one payment method.",
            variant: "destructive"
        });
        setIsLoading(false);
        return;
    }

    if (hasCompanions) {
        for (let i = 0; i < companions.length; i++) {
            const c = companions[i];
            if (!c.fullName || !c.phone || !c.birthdate || !c.country) {
                 toast({
                    title: "Missing Companion Information",
                    description: `Please fill in all required fields for Companion #${i + 1}.`,
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }
        }
    }

    const submissionData = {
      ...formData,
      companions: hasCompanions ? companions : [],
      discount: appliedDiscount
    };

    setTimeout(() => {
      onSubmit(submissionData);
      setIsLoading(false);
    }, 1000);
  };

  const paymentOptions = [
    "Cash",
    "Card",
    "E-wallet",
    "Bank Transfer",
    "Pay to Hotel"
  ];

  const discountAmount = appliedDiscount ? (totalPrice * appliedDiscount.percentage) / 100 : 0;
  const finalTotal = totalPrice - discountAmount;
  const isMultiplePayments = (formData.payment_methods || []).length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <Button 
        variant="ghost" 
        onClick={onCancel}
        className="mb-6 text-[#7a6a5a] hover:text-[#5a4a3a] pl-0 hover:bg-transparent"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Catalog
      </Button>

      <div className="bg-white rounded-lg shadow-lg border border-[#e5ddd5] overflow-hidden">
        <div className="bg-[#8b7355] text-white p-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Booking
          </h2>
          <p className="text-white/80 text-sm mt-1">Complete your reservation details</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Customer Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#5a4a3a] border-b border-[#e5ddd5] pb-2">
              Customer Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" name="fullName" placeholder="John Doe" value={formData.fullName} onChange={handleInputChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" name="phone" type="tel" placeholder="+63 900 000 0000" value={formData.phone} onChange={handleInputChange} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input id="email" name="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleInputChange} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="birthdate">Birthdate *</Label>
                <Input id="birthdate" name="birthdate" type="date" value={formData.birthdate} onChange={handleInputChange} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="country">Country of Origin *</Label>
                <CountrySelect id="country" value={formData.country} onChange={handleCountryChange} placeholder="Select or type country" />
              </div>

              <TherapistSelector value={formData.therapist_id} onChange={handleTherapistChange} />
            </div>

            {/* Companion Checkbox */}
            <div className="pt-2">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <input type="checkbox" id="hasCompanions" checked={hasCompanions} onChange={(e) => setHasCompanions(e.target.checked)} className="h-5 w-5 accent-[#8b7355] cursor-pointer" />
                    <Label htmlFor="hasCompanions" className="cursor-pointer text-[#5a4a3a]">
                        If you're booking for yourself and a companion, please provide their details.
                    </Label>
                </div>
            </div>

            {/* Companion Details Fields */}
            <AnimatePresence>
                {hasCompanions && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                        {companions.map((companion, index) => (
                            <div key={index} className="relative bg-[#fdfbf7] p-4 rounded-lg border border-[#e5ddd5]">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm font-bold text-[#8b7355] flex items-center gap-2">
                                        <UserPlus className="h-4 w-4" /> Companion #{index + 1}
                                    </h4>
                                    {companions.length > 0 && (
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeCompanion(index)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 px-2" title="Remove Companion">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor={`comp-name-${index}`}>Full Name *</Label>
                                        <Input id={`comp-name-${index}`} value={companion.fullName} onChange={(e) => handleCompanionChange(index, 'fullName', e.target.value)} placeholder="Companion Name" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`comp-phone-${index}`}>Phone Number *</Label>
                                        <Input id={`comp-phone-${index}`} type="tel" value={companion.phone} onChange={(e) => handleCompanionChange(index, 'phone', e.target.value)} placeholder="+63 900 000 0000" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`comp-email-${index}`}>Email Address (Optional)</Label>
                                        <Input id={`comp-email-${index}`} type="email" value={companion.email} onChange={(e) => handleCompanionChange(index, 'email', e.target.value)} placeholder="companion@example.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`comp-dob-${index}`}>Birthdate *</Label>
                                        <Input id={`comp-dob-${index}`} type="date" value={companion.birthdate} onChange={(e) => handleCompanionChange(index, 'birthdate', e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`comp-country-${index}`}>Country of Origin *</Label>
                                        <CountrySelect id={`comp-country-${index}`} value={companion.country} onChange={(val) => handleCompanionChange(index, 'country', val)} placeholder="Select or type country" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addCompanion} className="w-full border-dashed border-[#8b7355] text-[#8b7355] hover:bg-[#8b7355] hover:text-white gap-2">
                            <Plus className="h-4 w-4" /> Add Another Companion
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>

          {/* Payment Method Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#5a4a3a] border-b border-[#e5ddd5] pb-2">
              Payment Methods (Select all that apply) *
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {paymentOptions.map((option) => {
                const isSelected = (formData.payment_methods || []).includes(option);
                return (
                  <div
                    key={option}
                    onClick={() => togglePaymentMethod(option)}
                    className={cn(
                      "cursor-pointer rounded-md border p-3 flex items-center gap-3 transition-all select-none",
                      isSelected
                        ? 'border-[#8b7355] bg-[#f5f1ed] ring-1 ring-[#8b7355]' 
                        : 'border-[#e5ddd5] hover:border-[#d4a574] hover:bg-gray-50'
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      isSelected ? 'border-[#8b7355] bg-[#8b7355]' : 'border-gray-400 bg-white'
                    )}>
                      {isSelected && <CheckSquare className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-[#5a4a3a]">{option}</span>
                  </div>
                );
              })}
            </div>

            <AnimatePresence>
              {isMultiplePayments && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 mt-4"
                >
                  <Label htmlFor="payment_method_note" className="text-[#8b7355] font-semibold flex items-center gap-2">
                    Multiple Payment Methods Selected
                  </Label>
                  <Textarea 
                    id="payment_method_note"
                    name="payment_method_note"
                    value={formData.payment_method_note}
                    onChange={handleInputChange}
                    placeholder="Please leave a note and describe why the customer is using more than one payment method..."
                    className="min-h-[80px] bg-[#fdfbf7] border-[#d4a574]/50 focus-visible:ring-[#8b7355]"
                    required={isMultiplePayments}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary Section */}
          <div className="bg-[#f5f1ed] p-6 rounded-md border border-[#e5ddd5] space-y-4">
            <div className="space-y-2">
              <Label htmlFor="giftCard" className="text-xs font-bold text-gray-500 uppercase">Gift Card / Promo Code</Label>
              <div className="flex gap-2">
                 <Input id="giftCard" placeholder="Enter code" value={giftCode} onChange={(e) => setGiftCode(e.target.value)} disabled={!!appliedDiscount} className="bg-white" />
                 {appliedDiscount ? (
                   <Button type="button" variant="outline" onClick={removeDiscount} className="text-red-500 border-red-200 hover:bg-red-50"><X className="h-4 w-4" /></Button>
                 ) : (
                   <Button type="button" onClick={handleApplyCode} disabled={isValidatingCode || !giftCode} className="bg-[#8b7355] text-white hover:bg-[#7a6345]">{isValidatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}</Button>
                 )}
              </div>
              {appliedDiscount && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Code <strong>{appliedDiscount.code}</strong> applied ({appliedDiscount.percentage}% off)
                  </p>
              )}
            </div>

            <hr className="border-[#d4a574]/30" />

            <div className="space-y-2">
                <div className="flex justify-between text-[#7a6a5a]">
                  <span>Total Items</span>
                  <span>{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between text-[#7a6a5a]">
                  <span>Subtotal</span>
                  <span>₱{totalPrice.toLocaleString()}</span>
                </div>
                
                <AnimatePresence>
                  {appliedDiscount && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex justify-between text-green-600 font-medium">
                      <span>Discount ({appliedDiscount.percentage}%)</span>
                      <span>-₱{discountAmount.toLocaleString()}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-between items-center pt-3 border-t border-[#d4a574]/30">
                  <span className="text-lg font-bold text-[#5a4a3a]">Total Amount</span>
                  <span className="text-2xl font-bold text-[#8b7355]">₱{finalTotal.toLocaleString()}</span>
                </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-[#8b7355] hover:bg-[#7a6345] text-white h-12 text-lg" disabled={isLoading}>
            {isLoading ? "Processing..." : "Confirm Booking"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}

export default CheckoutForm;
