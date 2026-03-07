
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, Send, Coffee, RefreshCw, UserCog, MessageSquare, X, Copy, Check, Search, ChevronDown, AlertCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useLanguage } from '@/contexts/LanguageContext';
import PrintHeader from './PrintHeader';
import FeedbackPrintModal from './FeedbackPrintModal';

const LEMA_LOGO = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/d1952d3bda1cba2e721a0a8c399d7c46.png";

// Helper to ensure array
const ensureArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
            return [val];
        } catch (e) {
            return [val];
        }
    }
    return [String(val)];
};

const CustomServiceSelect = ({ id, value, onChange, options = [], allOptions = [], loading, error, onRetry, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
      const handleClickOutside = (e) => {
          if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
              setIsOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
      if (isOpen && inputRef.current) {
          inputRef.current.focus();
      }
  }, [isOpen]);

  const filteredOptions = options.filter(o => {
      if (!localSearch) return true;
      const query = localSearch.toLowerCase();
      const refMatch = o.reference_id?.toLowerCase().includes(query);
      const nameMatch = o.customer_name?.toLowerCase().includes(query);
      const dateMatch = o.created_at && new Date(o.created_at).toLocaleDateString().includes(query);
      return refMatch || nameMatch || dateMatch;
  });

  const selectedOrder = allOptions.find(o => o.reference_id === value) || options.find(o => o.reference_id === value);
  const displayValue = selectedOrder ? `${selectedOrder.reference_id} - ${selectedOrder.customer_name}` : 'Select Service ID...';

  return (
      <div className="space-y-2 sm:col-span-2" ref={wrapperRef}>
          <Label htmlFor={id}>Service ID <span className="text-red-500">*</span></Label>
          {loading ? (
              <div className="flex h-10 w-full rounded-md border border-[#d4a574]/30 bg-gray-50 px-3 py-2 text-sm items-center text-gray-500">
                  Loading service IDs...
              </div>
          ) : error ? (
              <div className="flex flex-col gap-2 p-3 bg-red-50 rounded-md border border-red-100 text-sm text-red-600">
                  <span>{error}</span>
                  <Button type="button" variant="outline" size="sm" onClick={onRetry} className="w-fit border-red-200 text-red-600 hover:bg-red-100">
                      <RefreshCw className="h-4 w-4 mr-2" /> Retry
                  </Button>
              </div>
          ) : options.length === 0 && !value ? (
              <div className="flex h-10 w-full rounded-md border border-[#d4a574]/30 bg-gray-50 px-3 py-2 text-sm items-center text-gray-500">
                  All services have been submitted.
              </div>
          ) : (
              <div className="relative">
                  <button
                      type="button"
                      id={id}
                      disabled={disabled || (options.length === 0 && !value)}
                      onClick={() => !disabled && setIsOpen(!isOpen)}
                      className={`flex h-10 w-full items-center justify-between rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b7355] focus:ring-offset-2 ring-offset-background ${(disabled || (options.length === 0 && !value)) ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                  >
                      <span className={!selectedOrder ? "text-muted-foreground" : "text-[#5a4a3a] truncate"}>
                          {displayValue}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                  </button>
                  
                  {isOpen && (
                      <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-[#d4a574]/30 bg-white shadow-lg overflow-hidden flex flex-col">
                          <div className="p-2 border-b border-gray-100 bg-[#fdfbf7]">
                              <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <Input 
                                      ref={inputRef}
                                      placeholder="Search by ID, Name, or Date..." 
                                      value={localSearch}
                                      onChange={(e) => setLocalSearch(e.target.value)}
                                      className="pl-9 h-9 bg-white border-[#d4a574]/30 focus-visible:ring-[#8b7355] text-sm"
                                  />
                              </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto p-1">
                              {filteredOptions.length > 0 ? (
                                  filteredOptions.map(o => (
                                      <button
                                          key={o.id}
                                          type="button"
                                          onClick={() => {
                                              onChange(o.reference_id);
                                              setIsOpen(false);
                                              setLocalSearch(''); 
                                          }}
                                          className={`w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-[#f5f1ed] hover:text-[#8b7355] transition-colors flex flex-col gap-0.5 ${value === o.reference_id ? 'bg-[#f5f1ed] text-[#8b7355] font-medium' : 'text-[#5a4a3a]'}`}
                                      >
                                          <span>{o.reference_id} - {o.customer_name}</span>
                                          <span className="text-xs text-gray-400 font-normal">
                                              Date: {new Date(o.created_at).toLocaleDateString()}
                                          </span>
                                      </button>
                                  ))
                              ) : (
                                  <div className="px-3 py-6 text-center text-sm text-gray-500">
                                      {options.length === 0 ? "All services have been submitted." : "No matching orders found."}
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>
  );
};

const SatisfactionForm = ({
  services = [],
  bookingId = null,
  customerReference = null,
  paymentMethods = [],
  paymentNote = '',
  onClose,
  onSubmit,
  isPublic = false
}) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [view, setView] = useState('gatekeeper');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [therapists, setTherapists] = useState([]);
  const [orders, setOrders] = useState([]);
  const [submittedFeedbackIds, setSubmittedFeedbackIds] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hasExistingFeedback, setHasExistingFeedback] = useState(false);
  const [existingFeedbackId, setExistingFeedbackId] = useState(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState(null);
  const [submittedOrder, setSubmittedOrder] = useState(null);
  
  // Task 1: Mount/Data load logging
  useEffect(() => {
      console.log("SatisfactionForm [Mount] Initial Props received:", { 
          bookingId, 
          paymentMethods, 
          paymentNote,
          isPublic 
      });
  }, [bookingId, paymentMethods, paymentNote, isPublic]);

  const initialFormData = {
    booking_id: bookingId || '',
    guestName: customerReference || '',
    guestType: '',
    roomNo: '',
    dateOfVisit: new Date().toISOString().split('T')[0],
    serviceAvailed: '',
    therapistName: '',
    paymentMethods: ensureArray(paymentMethods),
    paymentNote: paymentNote || '',
    overallRating: 0,
    ratings: {
      professionalism: 0,
      technique: 0,
      ambiance: 0,
      cleanliness: 0,
      hospitality: 0
    },
    therapistFeedback: {
      talkative: { value: null, comment: '' },
      staffChatter: { value: null, comment: '' },
      longNails: { value: null, comment: '' },
      roughHands: { value: null, comment: '' }
    },
    enjoyedMost: '',
    improvements: '',
    gratuityType: null,
    gratuityAmount: 0,
    consent: false
  };

  const [formData, setFormData] = useState(initialFormData);

  const checkExistingFeedback = async (targetId) => {
    if (!targetId) {
        setHasExistingFeedback(false);
        setExistingFeedbackId(null);
        setShowUpdatePrompt(false);
        return false;
    }
    
    try {
        const { data, error } = await supabase
            .from('feedbacks')
            .select('*')
            .eq('booking_id', targetId)
            .order('created_at', { ascending: false })
            .limit(1);
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            setHasExistingFeedback(true);
            setExistingFeedbackId(data[0].id);
            setShowUpdatePrompt(true);
            
            if (data[0].details) {
                setFormData(prev => ({
                    ...prev,
                    ...data[0].details,
                    booking_id: targetId,
                    gratuityAmount: data[0].tip_amount || data[0].details.gratuityAmount || 0,
                    guestType: data[0].details.guest_type || data[0].details.guestType || prev.guestType,
                    roomNo: data[0].details.room_no || data[0].details.roomNo || prev.roomNo
                }));
            }
            return true;
        } else {
            setHasExistingFeedback(false);
            setExistingFeedbackId(null);
            setShowUpdatePrompt(false);
            return false;
        }
    } catch (err) {
        console.error("Error checking existing feedback:", err);
        return false;
    }
  };

  const fetchFeedbacksList = async () => {
      try {
          const { data, error } = await supabase.from('feedbacks').select('booking_id, reference_id, details');
          if (!error && data) {
              const ids = data.map(f => f.booking_id || f.reference_id || (f.details?.service_id) || (f.details?.booking_id)).filter(Boolean);
              setSubmittedFeedbackIds(ids);
          }
      } catch (err) {
          console.error("Error fetching feedbacks for filtering:", err);
      }
  };

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    setFetchError(null);
    try {
      await fetchFeedbacksList();
      const [therapistsRes, ordersRes] = await Promise.all([
          supabase.from('therapists').select('id, name').order('name'),
          supabase.from('orders').select('*, therapist:therapists(name)').order('created_at', { ascending: false })
      ]);
      
      if (therapistsRes.error && !therapistsRes.error.message?.toLowerCase().includes('row-level security')) throw therapistsRes.error;
      if (ordersRes.error && !ordersRes.error.message?.toLowerCase().includes('row-level security')) throw ordersRes.error;
      
      if (therapistsRes.data) setTherapists(therapistsRes.data);
      if (ordersRes.data) {
          console.log(`SatisfactionForm [Data Load] - Fetched orders successfully: ${ordersRes.data.length} records`);
          if (ordersRes.data.length > 0) {
              console.log("SatisfactionForm [Data Load] - Sample order payment_methods:", ordersRes.data[0].payment_methods);
          }
          
          setOrders(ordersRes.data);
          if (bookingId) {
              const order = ordersRes.data.find(o => o.reference_id === bookingId);
              if (order) {
                  applyOrderToForm(order, bookingId, therapistsRes.data || []);
                  await checkExistingFeedback(bookingId);
              }
          }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setFetchError("Failed to load service data. Please try again.");
    } finally {
      setLoadingData(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableOrders = orders.filter(o => !submittedFeedbackIds.includes(o.reference_id));

  // Task 1 & 2: Ensure explicit extraction and tracking of payment_methods
  const applyOrderToForm = (order, orderId, therapistsList) => {
      const firstService = order.details?.cart?.[0]?.name || '';
      const date = order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      let tName = '';
      if (order.therapist?.name) {
          tName = order.therapist.name;
      } else if (order.therapist_id) {
          const t = therapistsList.find(th => th.id === order.therapist_id);
          if (t) tName = t.name;
      } else if (order.details?.therapist_id) {
          const t = therapistsList.find(th => th.id === order.details.therapist_id);
          if (t) tName = t.name;
      }

      // Check all possible locations for payment_methods across Supabase table and JSONB details
      const rawPm = order.payment_methods || order.details?.payment_methods || order.details?.customerDetails?.payment_methods || paymentMethods;
      const pmArr = ensureArray(rawPm);
      
      const rawPmNote = order.payment_method_note || order.details?.payment_method_note || order.details?.customerDetails?.payment_method_note || paymentNote || '';

      console.log(`SatisfactionForm [Data Load] - Extracted from Order [${orderId}]:`, {
          rawPaymentMethods: rawPm,
          resolvedPaymentMethodsArray: pmArr,
          resolvedPaymentNote: rawPmNote,
          completeOrderObject: order
      });

      setFormData(prev => ({
          ...prev,
          booking_id: orderId,
          guestName: order.customer_name || prev.guestName || '',
          dateOfVisit: date,
          serviceAvailed: firstService,
          therapistName: tName,
          guestType: order.guest_type || order.details?.guest_type || order.details?.guestType || prev.guestType,
          roomNo: order.room_no || order.details?.room_no || order.details?.roomNo || prev.roomNo,
          paymentMethods: pmArr.length > 0 ? pmArr : prev.paymentMethods,
          paymentNote: rawPmNote || prev.paymentNote
      }));
  };

  const handleOrderSelect = async (orderId) => {
      const order = orders.find(o => o.reference_id === orderId);
      if (order) {
          applyOrderToForm(order, orderId, therapists);
          await checkExistingFeedback(orderId);
      } else {
          setFormData(prev => ({ ...prev, booking_id: orderId || '', guestName: '', dateOfVisit: new Date().toISOString().split('T')[0], serviceAvailed: '', therapistName: '', paymentMethods: [], paymentNote: '' }));
          setHasExistingFeedback(false);
          setExistingFeedbackId(null);
          setShowUpdatePrompt(false);
      }
  };

  const handleRatingChange = (category, value) => {
    if (category === 'overall') {
      setFormData(prev => ({ ...prev, overallRating: value }));
    } else {
      setFormData(prev => ({ ...prev, ratings: { ...prev.ratings, [category]: value } }));
    }
  };

  const handleTherapistFeedbackChange = (questionKey, field, value) => {
    setFormData(prev => ({
        ...prev,
        therapistFeedback: {
            ...prev.therapistFeedback,
            [questionKey]: { ...prev.therapistFeedback[questionKey], [field]: value }
        }
    }));
  };

  const handleGratuitySelect = amount => {
    setFormData(prev => ({ ...prev, gratuityType: amount === 0 ? 'none' : 'preset', gratuityAmount: amount }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasExistingFeedback && !existingFeedbackId) {
         toast({ title: "Already Submitted", description: "Feedback has already been submitted for this booking.", variant: "destructive" });
         return;
    }
    if (view === 'full') {
        if (!formData.booking_id) return toast({ title: "Service ID Required", description: "Please select a Service ID for your feedback.", variant: "destructive" });
        if (formData.overallRating === 0) return toast({ title: "Rating Required", description: "Please provide an overall rating for your experience.", variant: "destructive" });
        if (!formData.consent && !hasExistingFeedback) return toast({ title: "Consent Required", description: "Please allow us to use your feedback for service improvement.", variant: "destructive" });
    }
    if (view === 'gratuity' && formData.gratuityAmount > 0 && !formData.therapistName) {
         return toast({ title: "Therapist Required", description: "Please select a therapist to ensure your tip reaches the right person.", variant: "destructive" });
    }

    setIsSubmitting(true);
    const targetBookingId = formData.booking_id || bookingId;
    
    // Explicitly add payment information to the details JSON that gets saved
    const submissionData = { 
        ...formData, 
        booking_id: targetBookingId, 
        guest_type: formData.guestType, 
        room_no: formData.roomNo,
        payment_methods: formData.paymentMethods,
        payment_method_note: formData.paymentNote
    };

    console.log("SatisfactionForm [Submit] - Preparing feedback payload:", submissionData);

    try {
        const feedbackRecord = {
            reference_id: targetBookingId,
            booking_id: targetBookingId,
            customer_name: formData.guestName,
            status: 'completed',
            details: submissionData,
            tip_amount: formData.gratuityAmount || 0
        };

        let error;
        if (hasExistingFeedback && existingFeedbackId) {
            const res = await supabase.from('feedbacks').update(feedbackRecord).eq('id', existingFeedbackId);
            error = res.error;
        } else {
            const res = await supabase.from('feedbacks').insert(feedbackRecord);
            error = res.error;
        }

        if (error) {
            if (error.code === '23505' || error.message?.includes('unique constraint')) {
                 setHasExistingFeedback(true);
                 setShowUpdatePrompt(true);
                 toast({ title: "Feedback Exists", description: "Feedback already submitted for this booking. Please update your existing feedback instead.", variant: "destructive" });
                 setIsSubmitting(false);
                 return;
            }
            throw error;
        }

        if (onSubmit) onSubmit(submissionData);

        setSubmittedFeedback(feedbackRecord);
        const order = orders.find(o => o.reference_id === targetBookingId);
        setSubmittedOrder(order);
        await fetchFeedbacksList(); 

        setIsSubmitting(false);
        setIsSuccess(true);
        toast({ title: "Maraming Salamat!", description: hasExistingFeedback ? "Feedback updated successfully" : "Feedback submitted successfully", duration: 3000 });
    } catch (err) {
        console.error("Error submitting feedback:", err);
        toast({ title: "Submission Failed", description: "There was a problem submitting your feedback. Please try again.", variant: "destructive" });
        setIsSubmitting(false);
    }
  };

  const copyFeedbackLink = () => {
    if (!bookingId) return;
    const link = `${window.location.origin}/feedback-form?booking=${bookingId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast({ title: "Link Copied", description: "Feedback link copied to clipboard." });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const renderStars = (category, currentRating) => {
    return <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" onClick={() => handleRatingChange(category, star)} className={`transition-all duration-200 ${star <= currentRating ? 'text-[#d4a574] fill-[#d4a574] scale-110' : 'text-gray-300 hover:text-[#d4a574]/50'}`}>
            <Star className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>)}
      </div>;
  };

  const renderTherapistQuestion = (key, questionText) => {
    const current = formData.therapistFeedback[key];
    return (
        <div className="space-y-3 p-4 rounded-lg border border-[#e5ddd5] bg-[#fdfbf7]">
            <Label className="text-base font-medium text-[#5a4a3a]">{questionText}</Label>
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="relative flex items-center">
                        <input type="radio" name={`${key}`} checked={current.value === 'yes'} onChange={() => handleTherapistFeedbackChange(key, 'value', 'yes')} className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-[#d4a574] checked:border-[#8b7355] checked:bg-[#8b7355] transition-all" />
                        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="3" /></svg>
                        </div>
                    </div>
                    <span className="text-sm text-[#5a4a3a]">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="relative flex items-center">
                        <input type="radio" name={`${key}`} checked={current.value === 'no'} onChange={() => handleTherapistFeedbackChange(key, 'value', 'no')} className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-[#d4a574] checked:border-[#8b7355] checked:bg-[#8b7355] transition-all" />
                        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="3" /></svg>
                        </div>
                    </div>
                    <span className="text-sm text-[#5a4a3a]">No</span>
                </label>
            </div>
            <div className="pt-2">
                <Input placeholder="Additional comments (optional)" value={current.comment} onChange={(e) => handleTherapistFeedbackChange(key, 'comment', e.target.value)} className="bg-white border-[#d4a574]/30 focus-visible:ring-[#8b7355]" />
            </div>
        </div>
    );
  };

  // Task 6: Add validation checks and comprehensive logging before passing data to Modal
  const handlePrintModalOpen = () => {
      const resolvedPmMethods = formData.paymentMethods?.length > 0 ? formData.paymentMethods : ensureArray(paymentMethods);
      const resolvedPmNote = formData.paymentNote || paymentNote || submittedOrder?.payment_method_note || '';
      
      console.log("SatisfactionForm [Action: Open Print Modal] - Validating data pass:");
      console.log(" - source: formData.paymentMethods:", formData.paymentMethods);
      console.log(" - source: props.paymentMethods:", paymentMethods);
      console.log(" -> Output paymentMethods to Modal:", resolvedPmMethods);
      console.log(" -> Output paymentNote to Modal:", resolvedPmNote);
      
      if (!resolvedPmMethods || resolvedPmMethods.length === 0) {
          console.warn("SatisfactionForm Warning: payment_methods array is empty right before opening print modal!");
      }
      
      setShowPrintModal(true);
  };

  if (showPrintModal && submittedFeedback) {
      const pmToPass = formData.paymentMethods?.length > 0 ? formData.paymentMethods : ensureArray(paymentMethods);
      const noteToPass = formData.paymentNote || paymentNote || submittedOrder?.payment_method_note || '';

      return (
          <FeedbackPrintModal 
              feedback={submittedFeedback} 
              order={submittedOrder} 
              allOrders={orders}
              paymentMethods={pmToPass}
              paymentNote={noteToPass}
              onClose={() => {
                  setShowPrintModal(false);
                  if (isPublic) navigate(`/booking-details/${formData.booking_id || bookingId}`);
                  else if (onClose) onClose();
                  else navigate('/admin-dashboard');
              }} 
          />
      );
  }

  if (isSuccess) {
      return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isPublic ? 'bg-[#f5f1ed]' : 'bg-black/60 backdrop-blur-sm'}`}>
              <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-[#e5ddd5] p-8 text-center space-y-8 relative">
                  <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100">
                      <Check className="h-10 w-10 text-green-500" />
                  </div>
                  <div>
                      <h2 className="text-xl font-bold text-[#5a4a3a]">Feedback Submitted!</h2>
                      <p className="text-[#7a6a5a] mt-2">Thank you for helping us improve our service.</p>
                  </div>
                  <div className="pt-4 space-y-3">
                      <Button onClick={handlePrintModalOpen} className="w-full bg-[#8b7355] hover:bg-[#7a6345] text-white gap-2" size="lg">
                          <Printer className="h-5 w-5" /> Click to print the service slip
                      </Button>
                      <Button variant="outline" onClick={() => {
                          if (isPublic) navigate(`/booking-details/${formData.booking_id || bookingId}`);
                          else if (onClose) onClose();
                          else navigate('/admin-dashboard');
                      }} className="w-full border-[#d4a574]/30 text-[#7a6a5a] hover:bg-[#f5f1ed]">
                          Close
                      </Button>
                  </div>
              </div>
          </motion.div>
      );
  }

  if (view === 'gatekeeper') {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isPublic ? 'bg-[#f5f1ed]' : 'bg-black/60 backdrop-blur-sm'}`}>
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-[#e5ddd5] p-8 text-center space-y-8 relative">
                {!isPublic && <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-2 top-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></Button>}
                <div className="space-y-4">
                    <div className="h-20 w-20 bg-[#fdfbf7] rounded-full flex items-center justify-center mx-auto border border-[#e5ddd5] shadow-sm">
                        <MessageSquare className="h-10 w-10 text-[#8b7355]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[#5a4a3a]">Your feedback helps us improve</h2>
                        <p className="text-[#7a6a5a] mt-2">Do you have 2 minutes to share your thoughts on our service?</p>
                        {bookingId && !isPublic && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-center justify-between">
                                <span>For Booking: <strong>{bookingId}</strong></span>
                                <Button variant="ghost" size="sm" onClick={copyFeedbackLink} className="h-8 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100" title="Copy Feedback Link">
                                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" size="lg" onClick={() => setView('gratuity')} className="border-[#d4a574]/30 hover:bg-[#fdfbf7] text-[#7a6a5a] hover:text-[#5a4a3a]">No</Button>
                    <Button size="lg" onClick={() => setView('full')} className="bg-[#8b7355] hover:bg-[#7a6345] text-white">Yes</Button>
                </div>
            </div>
        </motion.div>
      );
  }

  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto ${isPublic ? 'bg-[#f5f1ed]' : 'bg-black/60 backdrop-blur-sm'} print:static print:bg-white print:overflow-hidden print:p-0 print:h-auto`}>
      <style>
         {`
           @media print {
             @page { 
               size: letter landscape; 
               margin: 0.25in; 
             }
             body { 
               print-color-adjust: exact; 
               -webkit-print-color-adjust: exact; 
               background-color: white !important;
             }
           }
         `}
      </style>
      <div className={`w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden border border-[#e5ddd5] my-auto ${isPublic ? 'shadow-none border-0 sm:border sm:shadow-lg' : ''} print:max-h-[5.5in] print:overflow-hidden print:shadow-none print:border-none print:w-full print:max-w-none print:h-full`}>
        
        <div className="bg-[#8b7355] p-6 text-white text-center relative print:hidden">
          {!isPublic && <Button variant="ghost" size="sm" onClick={onClose} className="absolute right-4 top-4 text-white hover:bg-white/20"><span className="sr-only">Close</span>✕</Button>}
          <Heart className="h-8 w-8 mx-auto mb-3 text-[#d4a574] fill-[#d4a574]" />
          <h2 className="text-2xl font-bold mb-1">
              {hasExistingFeedback ? "Update Your Feedback" : view === 'full' ? "We Value Your Thoughts" : "Gratuity"}
          </h2>
          <p className="text-white/80 text-sm">
              {hasExistingFeedback ? "You've already submitted feedback for this booking. You can update it below." : view === 'full' ? "Help us improve our service for your next visit." : "Optional token of appreciation."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8 max-h-[80vh] overflow-y-auto print:overflow-hidden print:max-h-none print:p-0 print:space-y-4 print:text-[11px] print:flex print:flex-col print:h-full">
          <PrintHeader title="Satisfaction Feedback" logo={LEMA_LOGO} landscape={true} />
          
          <div className="hidden print:flex print:flex-row print:w-full print:gap-4 print:h-[4.5in] text-[#5a4a3a]">
             {/* Print Only View Layout */}
             <div className="print:w-1/2 print:flex print:flex-col print:border-r print:border-gray-200 print:pr-4">
                 <div className="mb-2">
                     <h3 className="font-bold text-[12px] mb-1 border-b border-gray-200 pb-0.5">Guest Information</h3>
                     <div className="grid grid-cols-2 gap-y-1 print:text-[10px]">
                         <div><strong>Name:</strong> {formData.guestName || '_______________'}</div>
                         <div><strong>Date:</strong> {formData.dateOfVisit || '_______________'}</div>
                         <div><strong>Guest Type:</strong> {formData.guestType || '_______________'}</div>
                         <div><strong>Service:</strong> {formData.serviceAvailed || '_______________'}</div>
                         <div><strong>Room:</strong> {formData.roomNumber || '_______________'}</div>
                         <div><strong>Therapist:</strong> {formData.therapistName || '_______________'}</div>
                     </div>
                 </div>

                 <div className="mb-2">
                    <h3 className="font-bold text-[12px] mb-1 border-b border-gray-200 pb-0.5">Service Ratings (1-5 Stars)</h3>
                    <div className="space-y-1 print:text-[10px]">
                        <div className="flex justify-between"><span>Overall Experience:</span> <span>{formData.overallRating || '_'} / 5</span></div>
                        <div className="flex justify-between"><span>Professionalism:</span> <span>{formData.ratings.professionalism || '_'} / 5</span></div>
                        <div className="flex justify-between"><span>Technique & Pressure:</span> <span>{formData.ratings.technique || '_'} / 5</span></div>
                        <div className="flex justify-between"><span>Room Comfort:</span> <span>{formData.ratings.ambiance || '_'} / 5</span></div>
                        <div className="flex justify-between"><span>Cleanliness:</span> <span>{formData.ratings.cleanliness || '_'} / 5</span></div>
                        <div className="flex justify-between"><span>Hospitality:</span> <span>{formData.ratings.hospitality || '_'} / 5</span></div>
                    </div>
                 </div>
             </div>

             <div className="print:w-1/2 print:flex print:flex-col">
                 <div className="mb-2">
                    <h3 className="font-bold text-[12px] mb-1 border-b border-gray-200 pb-0.5">Your Voice</h3>
                    <div className="space-y-1 print:text-[10px]">
                        <div>• Talkative therapist? {formData.therapistFeedback.talkative.value || 'N/A'} {formData.therapistFeedback.talkative.comment && `(${formData.therapistFeedback.talkative.comment})`}</div>
                        <div>• Staff chatter? {formData.therapistFeedback.staffChatter.value || 'N/A'}</div>
                        <div>• Long nails? {formData.therapistFeedback.longNails.value || 'N/A'}</div>
                        <div>• Rough hands? {formData.therapistFeedback.roughHands.value || 'N/A'}</div>
                    </div>
                 </div>
                 
                 <div className="mb-2 print:text-[10px]">
                    <p className="font-semibold mt-1">Enjoyed Most:</p>
                    <p className="italic">{formData.enjoyedMost || 'None stated'}</p>
                    <p className="font-semibold mt-1">Improvements:</p>
                    <p className="italic">{formData.improvements || 'None stated'}</p>
                 </div>
                 
                 {(formData.paymentMethods?.length > 0 || paymentMethods?.length > 0) && (
                    <div className="mt-2 border-t border-gray-300 pt-2 print:text-[11px] flex flex-col">
                        <div><strong>Payment Methods:</strong> {(formData.paymentMethods?.length > 0 ? formData.paymentMethods : ensureArray(paymentMethods)).join(', ')}</div>
                        {(formData.paymentNote || paymentNote) && <div className="italic mt-0.5 text-[10px] text-gray-600">Note: {formData.paymentNote || paymentNote}</div>}
                    </div>
                 )}

                 {formData.gratuityAmount > 0 && (
                     <div className="mt-1 print:text-[11px]">
                         <strong>Gratuity Left:</strong> ₱{formData.gratuityAmount}
                     </div>
                 )}
             </div>
          </div>

          <div className="print:hidden space-y-8">
            {showUpdatePrompt && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-semibold text-blue-800">You've already submitted feedback for this booking.</h4>
                        <p className="text-sm text-blue-600 mt-1">Would you like to update it instead? Simply modify the details below and submit to update.</p>
                    </div>
                </div>
            )}

            {view === 'full' && (
                <section className="space-y-4">
                  <div className="flex justify-between items-end border-b border-[#f5f1ed] pb-2">
                    <h3 className="text-lg font-semibold text-[#5a4a3a]">Guest Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <CustomServiceSelect id="full_booking_id" value={formData.booking_id} onChange={handleOrderSelect} options={availableOrders} allOptions={orders} loading={loadingData} error={fetchError} onRetry={fetchData} disabled={hasExistingFeedback && !!bookingId} />
                    <div className="space-y-2">
                      <Label htmlFor="guestName">{t('Guest Name') || 'Guest Name'} <span className="text-gray-400 font-normal">(Optional)</span></Label>
                      <Input id="guestName" value={formData.guestName} onChange={e => setFormData({ ...formData, guestName: e.target.value })} placeholder="Enter your name" className="bg-white border-[#d4a574]/30 focus-visible:ring-[#8b7355]" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="guestType">Guest Type</Label>
                      <select id="guestType" value={formData.guestType} onChange={e => setFormData({ ...formData, guestType: e.target.value })} className="flex h-10 w-full rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7355]">
                          <option value="">Select Guest Type...</option>
                          <option value="Hotel Guest">Hotel Guest</option>
                          <option value="Walk-In">Walk-In</option>
                          <option value="Day Use">Day Use</option>
                      </select>
                    </div>

                    {formData.guestType === 'Hotel Guest' && (
                        <div className="space-y-2">
                          <Label htmlFor="roomNo">Room No.</Label>
                          <Input id="roomNo" value={formData.roomNo} onChange={e => setFormData({ ...formData, roomNo: e.target.value })} placeholder="Enter room number" className="bg-white border-[#d4a574]/30 focus-visible:ring-[#8b7355]" />
                        </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="dateOfVisit">Date of Visit</Label>
                      <Input id="dateOfVisit" type="date" value={formData.dateOfVisit} onChange={e => setFormData({ ...formData, dateOfVisit: e.target.value })} className="bg-white border-[#d4a574]/30 focus-visible:ring-[#8b7355]" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="serviceAvailed">Service Availed</Label>
                      <Input id="serviceAvailed" value={formData.serviceAvailed} onChange={e => setFormData({ ...formData, serviceAvailed: e.target.value })} placeholder="Type of service" className="flex h-10 w-full rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus-visible:ring-[#8b7355]" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="therapistName" className="flex items-center gap-1"><UserCog className="h-3 w-3" /> Attending Therapist</Label>
                      <select id="therapistName" value={formData.therapistName} onChange={e => setFormData({ ...formData, therapistName: e.target.value })} className="flex h-10 w-full rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus-visible:ring-[#8b7355]">
                        <option value="">Unknown / Not Listed</option>
                        {therapists.map((t, idx) => <option key={idx} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>
                </section>
            )}

            {view === 'full' && (
                <section className="space-y-4 text-center bg-[#fdfbf7] p-6 rounded-lg border border-[#f5f1ed]">
                  <h3 className="text-lg font-semibold text-[#5a4a3a]">How was your overall experience?</h3>
                  <div className="flex justify-center py-2">{renderStars('overall', formData.overallRating)}</div>
                </section>
            )}

            {view === 'full' && (
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#5a4a3a] border-b border-[#f5f1ed] pb-2">Service Details</h3>
                  <div className="space-y-4">
                    {[{ id: 'professionalism', label: 'Therapist Professionalism' }, { id: 'technique', label: 'Massage Technique & Pressure' }, { id: 'ambiance', label: 'Room Comfort & Ambiance' }, { id: 'cleanliness', label: 'Cleanliness & Hygiene of the therapist' }, { id: 'hospitality', label: 'Front Desk & Hospitality' }].map(item => <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"><span className="text-sm font-medium text-[#5a4a3a]">{item.label}</span>{renderStars(item.id, formData.ratings[item.id])}</div>)}
                  </div>
                </section>
            )}

            {view === 'full' && (
                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#5a4a3a] border-b border-[#f5f1ed] pb-2">Your Voice</h3>
                  <div className="space-y-4 pb-2">
                      {renderTherapistQuestion('talkative', 'Was the therapist talkative?')}
                      {renderTherapistQuestion('staffChatter', 'Did you observe the therapists talking to each other?')}
                      {renderTherapistQuestion('longNails', 'Did you experience any discomfort due to your therapist having long nails?')}
                      {renderTherapistQuestion('roughHands', 'Did you experience any discomfort due to the therapist having rough hands?')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="enjoyedMost">What did you enjoy most?</Label>
                    <textarea id="enjoyedMost" className="flex min-h-[80px] w-full rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus-visible:ring-[#8b7355]" placeholder="The soothing music, the specific massage strokes..." value={formData.enjoyedMost} onChange={e => setFormData({ ...formData, enjoyedMost: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="improvements">Is there anything we can improve?</Label>
                    <textarea id="improvements" className="flex min-h-[80px] w-full rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus-visible:ring-[#8b7355]" placeholder="Room temperature, music volume..." value={formData.improvements} onChange={e => setFormData({ ...formData, improvements: e.target.value })} />
                  </div>
                </section>
            )}

            <section className="space-y-4 bg-[#fdfbf7] p-6 rounded-lg border border-[#f5f1ed]">
              <div className="flex items-center gap-2 text-[#8b7355]"><Coffee className="h-5 w-5" /><h3 className="text-lg font-semibold">Gratuity (Optional)</h3></div>
              
              {view === 'gratuity' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 pb-4 border-b border-[#e5ddd5]">
                      <CustomServiceSelect id="gratuity_booking_id" value={formData.booking_id} onChange={handleOrderSelect} options={availableOrders} allOptions={orders} loading={loadingData} error={fetchError} onRetry={fetchData} disabled={hasExistingFeedback && !!bookingId} />
                      <div className="space-y-2">
                          <Label htmlFor="gratuity-therapist" className="flex items-center gap-1 text-[#5a4a3a]"><UserCog className="h-3 w-3" /> Select Therapist <span className="text-red-500">*</span></Label>
                          <select id="gratuity-therapist" value={formData.therapistName} onChange={e => setFormData({ ...formData, therapistName: e.target.value })} className="flex h-10 w-full rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus-visible:ring-[#8b7355]">
                              <option value="">Select who served you...</option>
                              {therapists.map((t, idx) => <option key={idx} value={t.name}>{t.name}</option>)}
                          </select>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="gratuity-guest-name" className="text-[#5a4a3a]">{t('Guest Name') || 'Guest Name'} <span className="text-gray-400 font-normal">(Optional)</span></Label>
                          <Input id="gratuity-guest-name" value={formData.guestName} onChange={e => setFormData({ ...formData, guestName: e.target.value })} placeholder="Enter your name" className="bg-white border-[#d4a574]/30 focus-visible:ring-[#8b7355]" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gratuity-guest-type" className="text-[#5a4a3a]">Guest Type</Label>
                        <select id="gratuity-guest-type" value={formData.guestType} onChange={e => setFormData({ ...formData, guestType: e.target.value })} className="flex h-10 w-full rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus-visible:ring-[#8b7355]">
                            <option value="">Select Guest Type...</option>
                            <option value="Hotel Guest">Hotel Guest</option>
                            <option value="Walk-In">Walk-In</option>
                            <option value="Day Use">Day Use</option>
                        </select>
                      </div>
                      {formData.guestType === 'Hotel Guest' && (
                          <div className="space-y-2">
                            <Label htmlFor="gratuity-room-no" className="text-[#5a4a3a]">Room No.</Label>
                            <Input id="gratuity-room-no" value={formData.roomNo} onChange={e => setFormData({ ...formData, roomNo: e.target.value })} placeholder="Enter room number" className="bg-white border-[#d4a574]/30 focus-visible:ring-[#8b7355]" />
                          </div>
                      )}
                  </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {[50, 100, 200].map(amount => <Button key={amount} type="button" variant={formData.gratuityAmount === amount && formData.gratuityType === 'preset' ? 'default' : 'outline'} className={formData.gratuityAmount === amount && formData.gratuityType === 'preset' ? 'bg-[#8b7355] text-white hover:bg-[#8b7355]' : 'border-[#d4a574]/30'} onClick={() => handleGratuitySelect(amount)}>₱{amount}</Button>)}
                <Button type="button" variant={formData.gratuityType === 'custom' ? 'default' : 'outline'} className={formData.gratuityType === 'custom' ? 'bg-[#8b7355] text-white hover:bg-[#8b7355]' : 'border-[#d4a574]/30'} onClick={() => setFormData(prev => ({ ...prev, gratuityType: 'custom', gratuityAmount: '' }))}>Custom</Button>
              </div>
              
              <AnimatePresence>
                {formData.gratuityType === 'custom' && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3">
                    <Label htmlFor="customTip">Enter Amount (₱)</Label>
                    <Input id="customTip" type="number" min="0" placeholder="0.00" value={formData.gratuityAmount} onChange={e => setFormData({ ...formData, gratuityAmount: Number(e.target.value) })} className="mt-1" />
                  </motion.div>}
              </AnimatePresence>

              <div className="mt-2">
                <button type="button" onClick={() => handleGratuitySelect(0)} className={`text-sm underline-offset-4 hover:underline ${formData.gratuityType === 'none' ? 'text-[#8b7355] font-medium' : 'text-gray-400'}`}>Not this time</button>
              </div>
            </section>

            <section className="space-y-6 pt-4 border-t border-[#f5f1ed]">
              {view === 'full' && !hasExistingFeedback && (
                  <div className="flex items-start gap-3">
                      <div className="flex items-center h-5 mt-1">
                      <input id="consent" type="checkbox" checked={formData.consent} onChange={e => setFormData({ ...formData, consent: e.target.checked })} className="h-4 w-4 rounded border-[#d4a574] text-[#8b7355] focus:ring-[#8b7355]" />
                      </div>
                      <Label htmlFor="consent" className="text-sm leading-relaxed font-normal text-[#7a6a5a] cursor-pointer">
                      I consent to Lema Spa using this feedback for service quality improvement.
                      </Label>
                  </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                {!isPublic && <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>}
                <Button type="submit" disabled={isSubmitting} className={`flex-1 bg-[#8b7355] hover:bg-[#7a6345] text-white gap-2 ${isPublic ? 'w-full' : ''}`}>
                  {isSubmitting ? "Submitting..." : hasExistingFeedback ? "Update Feedback" : <>{view === 'full' ? 'Submit Feedback' : 'Submit Gratuity'} <Send className="h-4 w-4" /></>}
                </Button>
              </div>
            </section>
          </div>
        </form>
      </div>
    </motion.div>;
};
export default SatisfactionForm;
