import React, { useState, useEffect } from 'react';
import { X, Eye, Clock, CheckCircle2, AlertCircle, Printer, Star, Coffee, Trash2, Shield, Users, Gift, Tag, Package, UserCog, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/customSupabaseClient';
import ManagementPage from '@/components/ManagementPage';
import GiftCardsPage from '@/components/GiftCardsPage';
import ServicesManager from '@/components/ServicesManager';
import TherapistManager from '@/components/TherapistManager';
import { useBookingFeedback } from '@/hooks/useBookingFeedback';
import PrintHeader from './PrintHeader';
import FeedbackPrintModal from './FeedbackPrintModal';
import { isUUID } from '@/lib/isUUID';

// Use the exact same URL as HealthForm to ensure visual consistency
const BODY_DIAGRAM_URL = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/98955f0a88244c3fcf168145a115e104.png";
const LEMA_LOGO = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/d1952d3bda1cba2e721a0a8c399d7c46.png";

const BookingStatusCell = ({ item }) => {
  const { feedback, loading } = useBookingFeedback(item?.id, item?.reference_id);
  
  if (loading) {
    return <span className="text-gray-400 text-xs flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /></span>;
  }
  
  if (feedback) {
    return <Badge className="bg-green-100 text-green-800 border-0 hover:bg-green-100 font-medium">Completed</Badge>;
  }
  
  return <Badge className="bg-yellow-100 text-yellow-800 border-0 hover:bg-yellow-100 font-medium">Pending</Badge>;
};

const FeedbackCell = ({ item }) => {
  const { feedback, loading } = useBookingFeedback(item?.id, item?.reference_id);
  
  if (loading) {
    return <span className="text-gray-400 text-xs flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /></span>;
  }
  
  if (feedback) {
    return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 font-medium border-0">
        Submitted{feedback.tip_amount > 0 ? ` - ₱${feedback.tip_amount} tip` : ''}
      </Badge>;
  }
  
  return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-50 font-medium">
      Pending
    </Badge>;
};

const AdminDashboard = ({ submissions, onDeleteSubmission, onUpdateStatus }) => {
  const { role } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedItem, setSelectedItem] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const isAdmin = role === 'admin';
  
  const availableTabs = ['intakes', 'orders'];
  if (isAdmin) {
    availableTabs.push('feedbacks');
  }
  
  const fetchFeedbacks = async () => {
    setIsLoadingFeedbacks(true);
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      toast({
        title: "Error",
        description: "Failed to fetch feedbacks",
        variant: "destructive"
      });
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };
  
  useEffect(() => {
    if (isAdmin) {
      fetchFeedbacks();
      
      const channel = supabase
        .channel('feedbacks_admin_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, payload => {
          fetchFeedbacks();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);
  
  const handleDelete = async (e, item) => {
    e.stopPropagation();
    
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete records.",
        variant: "destructive"
      });
      return;
    }
    
    const type = item.type || activeTab;
    
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      if (type === 'feedbacks') {
        try {
          const { error } = await supabase
            .from('feedbacks')
            .delete()
            .eq('id', item.id);
          
          if (error) throw error;
          
          toast({
            title: "Deleted",
            description: "Feedback deleted successfully."
          });
          
          fetchFeedbacks();
        } catch (err) {
          console.error("Delete error:", err);
          toast({
            title: "Error",
            description: "Failed to delete feedback.",
            variant: "destructive"
          });
        }
      } else if (onDeleteSubmission) {
        onDeleteSubmission(type, item.id);
      }
    }
  };
  
  const formatDate = isoString => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  const renderStatusBadge = status => {
    const styles = {
      'New': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      'Pending': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      'Completed': 'bg-green-100 text-green-800 hover:bg-green-100',
      'Reviewed': 'bg-purple-100 text-purple-800 hover:bg-purple-100'
    };
    return <Badge className={`${styles[status] || 'bg-gray-100'} border-0`}>{status}</Badge>;
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const getDisplayItems = () => {
    if (activeTab === 'feedbacks') {
      return feedbacks.map(f => ({ ...f, type: 'feedbacks' }));
    }
    return submissions[activeTab] || [];
  };
  
  const displayItems = getDisplayItems();
  
  const StarRating = ({ rating }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star 
          key={star} 
          className={`h-4 w-4 ${star <= rating ? 'text-[#d4a574] fill-[#d4a574]' : 'text-gray-300'}`} 
        />
      ))}
    </div>
  );
  
  const HealthFormDetailsModal = ({ intake, onClose }) => {
    if (!intake) return null;
    
    const { details } = intake;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:bg-white print:p-0 print:static print:block">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col print:shadow-none print:w-full print:max-h-none print:rounded-none"
        >
          <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10 print:static print:border-none print:pb-0">
            <div>
              <h2 className="text-xl font-bold text-[#5a4a3a]">Health Form Details</h2>
              <p className="text-sm text-gray-500">Ref: {intake.reference_id || intake.id}</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 print:grid print:grid-cols-2 print:gap-8 print:p-4 print:space-y-0">
            <div className="space-y-6 print:space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-md print:border print:bg-transparent print:p-2">
                  <span className="text-xs font-bold text-gray-500 uppercase block">Client Name</span>
                  <span className="font-medium text-[#5a4a3a]">{details.clientName}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-md print:border print:bg-transparent print:p-2">
                  <span className="text-xs font-bold text-gray-500 uppercase block">Guest Details</span>
                  <span className="font-medium text-[#5a4a3a]">
                      {details.guestType ? (
                        <>
                            {details.guestType}
                            {details.roomNumber && <span className="text-gray-500 ml-1">(Rm {details.roomNumber})</span>}
                          </>
                      ) : details.roomNumber || 'N/A'}
                  </span>
                </div>
              </div>

              {details.therapist && (
                <div className="p-3 bg-[#fdfbf7] rounded-md border border-[#e5ddd5] print:border print:bg-transparent print:p-2">
                     <span className="text-xs font-bold text-[#8b7355] uppercase block flex items-center gap-1">
                        <UserCog className="h-3 w-3" /> Assigned Therapist
                     </span>
                     <span className="font-medium text-[#5a4a3a]">{details.therapist}</span>
                  </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-[#8b7355] flex items-center gap-2 border-b pb-2">
                  <AlertCircle className="h-4 w-4" /> Medical Conditions
                </h3>
                <div className="grid grid-cols-1 gap-2 print:grid-cols-2 print:gap-1">
                  {Object.entries(details).map(([key, value]) => {
                    if (value === true && !['agreement', 'bodyMapImage'].includes(key)) {
                      return (
                        <div key={key} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
                  {details.recentSurgeryDetails && (
                    <div className="text-sm bg-red-50 p-2 rounded border border-red-100 mt-2 print:bg-transparent print:border-black">
                      <span className="font-semibold text-red-800">Surgery:</span> {details.recentSurgeryDetails}
                    </div>
                  )}
                  {details.injuriesDetails && (
                    <div className="text-sm bg-red-50 p-2 rounded border border-red-100 mt-2 print:bg-transparent print:border-black">
                      <span className="font-semibold text-red-800">Injuries:</span> {details.injuriesDetails}
                    </div>
                  )}
                  {details.painDetails && (
                    <div className="text-sm bg-red-50 p-2 rounded border border-red-100 mt-2 print:bg-transparent print:border-black">
                       <span className="font-semibold text-red-800">Pain Areas:</span> {details.painDetails}
                     </div>
                  )}
                  {details.otherAllergyDetails && (
                    <div className="text-sm bg-red-50 p-2 rounded border border-red-100 mt-2 print:bg-transparent print:border-black">
                        <span className="font-semibold text-red-800">Other Allergies:</span> {details.otherAllergyDetails}
                    </div>
                  )}
              </div>
            </div>

            <div className="flex flex-col items-center space-y-4 print:break-inside-avoid print:items-start">
              <h3 className="font-semibold text-[#8b7355] w-full border-b pb-2 text-center md:text-left">
                Body Map Areas
              </h3>
              
              <div className="relative w-[300px] h-[300px] sm:w-[320px] sm:h-[320px] border-2 border-[#8b7355] rounded-lg bg-white overflow-hidden shadow-sm print:border-black print:w-[350px] print:h-[350px]">
                <img 
                  src={BODY_DIAGRAM_URL} 
                  alt="Body Figure Base" 
                  className="absolute inset-0 w-full h-full object-contain opacity-50" 
                />
                {details.bodyMapImage ? (
                  <img 
                    src={details.bodyMapImage} 
                    alt="Client Marks Overlay" 
                    className="absolute inset-0 w-full h-full object-contain z-10" 
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 z-20 pointer-events-none">
                    No marks recorded
                  </div>
                )}
              </div>
              
              <div className="text-xs text-center md:text-left text-gray-500 max-w-xs">
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-1 align-middle"></span>
                Red marks indicate areas to avoid.
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t bg-gray-50 mt-auto print:hidden">
             <Button onClick={onClose} className="w-full md:w-auto">Close Details</Button>
          </div>
        </motion.div>
      </div>
    );
  };
  
  const OrderDetailsModal = ({ order, onClose }) => {
    const { feedback } = useBookingFeedback(order?.id, order?.reference_id);
    
    
    const [fetchedOrder, setFetchedOrder] = useState(order);
    
    useEffect(() => {
      console.group(`[AdminDashboard OrderDetailsModal Debug] Order Selected`);
      
      const fetchFullOrderAndTherapist = async () => {
        // 1. Check incoming object fields
        const orderCopy = order ? JSON.parse(JSON.stringify(order)) : null;
        console.log("[1. Initial Prop] Raw order object from parent:", orderCopy);

        // 2. Determine best reference field
        const refFieldUsed = order?.reference_id ? 'reference_id' : 
                             (order?.id ? 'id' : 
                             (order?.booking_id ? 'booking_id' : 
                             (order?.order_id ? 'order_id' : null)));
                             
        const orderRef = order?.reference_id || order?.id || order?.booking_id || order?.order_id;

        // 3. Early exit if no valid ref
        if (!orderRef) {
            console.error("[Error] No valid identifier (reference_id, id, booking_id, order_id) found in order object.");
            console.groupEnd();
            return;
        }

        try {
          // Build query dynamically based on the UUID detection
          let query = supabase.from('orders').select('*');
          if (isUUID(orderRef)) {
              query = query.eq('id', orderRef);
          } else {
              query = query.eq('reference_id', orderRef);
          }

          const { data: orderData, error: orderError } = await query.single();
          
          if (orderError) throw orderError;
          
          // COMPREHENSIVE LOGGING FOR TASK 1
          console.log('--- EXHAUSTIVE ORDER LOGGING ---');
          console.log('COMPLETE ORDER DATA:', JSON.stringify(orderData, null, 2));
          console.log('ORDER KEYS:', Object.keys(orderData || {}));
          console.log('DETAILS OBJECT:', JSON.stringify(orderData?.details, null, 2));
          
          console.log('--- INDIVIDUAL TOP-LEVEL FIELDS ---');
          console.log('reference_id:', orderData?.reference_id);
          console.log('customer_name:', orderData?.customer_name);
          console.log('customer_email:', orderData?.customer_email);
          console.log('total_price:', orderData?.total_price);
          console.log('status:', orderData?.status);
          console.log('therapist_id:', orderData?.therapist_id);
          console.log('payment_method:', orderData?.payment_method);
          console.log('payment_methods:', orderData?.payment_methods);
          console.log('payment_method_note:', orderData?.payment_method_note);
          console.log('created_at:', orderData?.created_at);
          
          if (orderData?.details) {
            console.log('--- DETAILS FIELDS ---');
            console.log('details.guest_type:', orderData.details.guest_type);
            console.log('details.room_no:', orderData.details.room_no);
            console.log('details.guestType:', orderData.details.guestType);
            console.log('details.roomNo:', orderData.details.roomNo);
            console.log('details.room_number:', orderData.details.room_number);
            console.log('ALL DETAILS KEYS:', Object.keys(orderData.details || {}));
          }
          console.log('-----------------------------------');
          
          let mergedOrder = { ...orderData };

          // Identify therapist ID from various potential locations
          const dbColumnId = orderData.therapist_id;
          const detailsId = orderData.details?.therapist_id;
          const nestedDetailsId = orderData.details?.therapist?.id;

          const targetTherapistId = dbColumnId || detailsId || nestedDetailsId;

          if (targetTherapistId) {
            const { data: therapistData, error: therapistError } = await supabase
              .from('therapists')
              .select('*')
              .eq('id', targetTherapistId)
              .single();

            if (therapistData) {
              mergedOrder.therapist = therapistData;
              mergedOrder.therapists = therapistData; // Add to both for compatibility
            }
          }
          
          setFetchedOrder(mergedOrder);
          
        } catch (err) {
          console.error(`[Error] fetchFullOrderAndTherapist failed for value ${orderRef}:`, err);
          setFetchedOrder(order); // fallback to prop
        } finally {
          console.groupEnd();
        }
      };
      
      fetchFullOrderAndTherapist();
    }, [order]);

    if (!order) return null;
    
    const details = fetchedOrder?.details || order.details || {};
    const customerDetails = details?.customerDetails || fetchedOrder?.customerDetails || {};
    const cart = details.cart || [];
    const basePrice = details.baseTotalPrice || fetchedOrder.total_price || order.totalPrice || 0;
    const tipAmount = feedback?.tip_amount || 0;
    const hasDiscount = !!details.discount;
    const discountAmount = hasDiscount ? basePrice * details.discount.percentage / 100 : 0;
    const finalTotal = Number(fetchedOrder.total_price || order.totalPrice || 0) + Number(tipAmount);
    
    // EXHAUSTIVE EXTRACTION FOR TASK 2
    const rawGuestType = fetchedOrder?.guest_type 
                      || fetchedOrder?.guestType 
                      || details?.guest_type 
                      || details?.guestType 
                      || details?.customerDetails?.guestType 
                      || customerDetails?.guestType
                      || fetchedOrder?.customerDetails?.guestType
                      || "";
                      
    const rawRoomNo = fetchedOrder?.room_no 
                   || fetchedOrder?.roomNo 
                   || fetchedOrder?.room_number 
                   || details?.room_no 
                   || details?.roomNo 
                   || details?.roomNumber 
                   || details?.room_number 
                   || details?.customerDetails?.roomNo 
                   || details?.customerDetails?.roomNumber
                   || customerDetails?.roomNo
                   || customerDetails?.roomNumber
                   || fetchedOrder?.customerDetails?.roomNo
                   || "";
                   
    const guestType = rawGuestType && rawGuestType !== "N/A" ? rawGuestType : "\u00A0";
    const roomNo = rawRoomNo && rawRoomNo !== "N/A" ? rawRoomNo : "\u00A0";
    
    // Helper function to safely convert payment methods to array
    const ensureArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
            try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) ? parsed : [val];
            } catch (e) {
                return [val];
            }
        }
        return [String(val)];
    };

    // 2. Logging specific order structure for payment
    console.group("=== PAYMENT METHODS EXTRACTION DEBUG ===");
    console.log("Raw fetchedOrder.payment_methods (plural):", fetchedOrder?.payment_methods);
    console.log("Raw fetchedOrder.payment_method (singular):", fetchedOrder?.payment_method);
    console.log("Raw fetchedOrder.payment_method_note:", fetchedOrder?.payment_method_note);
    console.log("Raw details.payment_methods:", details?.payment_methods);
    console.log("Raw customerDetails.payment_methods:", customerDetails?.payment_methods);
    
    // 3. ✅ IMPROVED Fallback extraction logic with priority order
    let rawPmArray = [];
    // Priority 1: Direct order.payment_methods column from database
    if (fetchedOrder?.payment_methods && ensureArray(fetchedOrder.payment_methods).length > 0) {
      rawPmArray = fetchedOrder.payment_methods;
      console.log("--> Using fetchedOrder.payment_methods:", rawPmArray);
    }
    // Priority 2: Order details nested payment_methods
    else if (details?.payment_methods && ensureArray(details.payment_methods).length > 0) {
      rawPmArray = details.payment_methods;
      console.log("--> Falling back to details.payment_methods:", rawPmArray);
    }
    // Priority 3: Alternative naming (paymentMethods camelCase)
    else if (details?.paymentMethods && ensureArray(details.paymentMethods).length > 0) {
      rawPmArray = details.paymentMethods;
      console.log("--> Falling back to details.paymentMethods:", rawPmArray);
    }
    // Priority 4: Customer details payment_methods
    else if (customerDetails?.payment_methods && ensureArray(customerDetails.payment_methods).length > 0) {
      rawPmArray = customerDetails.payment_methods;
      console.log("--> Falling back to customerDetails.payment_methods:", rawPmArray);
    }
    // Priority 5: Singular payment_method (legacy support)
    else if (fetchedOrder?.payment_method && ensureArray(fetchedOrder.payment_method).length > 0) {
      rawPmArray = fetchedOrder.payment_method;
      console.log("--> Falling back to fetchedOrder.payment_method (singular):", rawPmArray);
    }
    else {
      console.log("--> No payment methods found across all sources.");
    }
    
    // Safely force to an array of valid strings
    const pmArray = ensureArray(rawPmArray);
        
    console.log("--> Final resolved pmArray BEFORE rendering:", pmArray);

    
    // Compute therapist name logically based on all sources
    const displayTherapistName = fetchedOrder?.therapist?.name 
                              || fetchedOrder?.therapists?.name 
                              || details?.therapistName 
                              || order?.therapist?.name
                              || order?.therapists?.name
                              || "Not assigned";
    
    // Extract feedback details for Time In/Out
    const feedbackDetails = (() => {
        if (!feedback?.details) return {};
        if (typeof feedback.details === 'string') {
            try { return JSON.parse(feedback.details); } catch(e) { return {}; }
        }
        return feedback.details;
    })();
    
    const timeIn = feedbackDetails?.timeIn || "-";
    const timeOut = feedbackDetails?.timeOut || "-";
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:bg-white print:p-0 print:static print:block print:ins
              <style>
        {`
        @media print {
          @page { 
            size: letter landscape; 
            margin: 0.5in; 
          }
          body { 
            print-color-adjust: exact; 
            -webkit-print-color-adjust: exact; 
            background-color: white !important;
          }
        }
        `}
      </style>et-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col border border-[#e5ddd5] print:shadow-none print:w-full print:max-h-none print:rounded-none print:border-none print:overflow-visible"
        >
           <div className="flex items-center justify-between p-6 border-b border-[#f5f1ed] bg-white sticky top-0 z-10 print:hidden">
              <div>
                <h2 className="text-xl font-bold text-[#5a4a3a]">Service Slip Preview</h2>                <p className="text-sm text-gray-500">Ref: {fetchedOrder.reference_id || order.id || order.reference_id}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 bg-[#8b7355] text-white hover:bg-[#7a6345] hover:text-white border-none">                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
           </div>

           <div className="p-6 sm:p-8 space-y-8 print:p-0 print:space-y-4 bg-white print:font-sans print:h-full print:flex print:flex-col print:justify-between">
              
              <div>
                {/* Print Header */}
                <div className="mb-4 pt-2">
                    <PrintHeader 
                      title="BOOKING DETAILS" 
                      logo={LEMA_LOGO} 
                      guestType={guestType !== "\u00A0" ? guestType : undefined} 
                      roomNo={roomNo !== "\u00A0" ? roomNo : undefined} 
                      therapistName={displayTherapistName} 
                      paymentMethods={pmArray} 
                      paymentNote={pmNote} 
                    />
                </div>

                {/* Header Info */}
                <div className="flex justify-between items-end border-b-2 border-[#f5f1ed] pb-4 print:border-black print:mt-2 print:pb-2">
                    <div>
                        <h2 className="text-2xl font-mono font-bold text-[#5a4a3a] print:text-black print:text-xl">
                          Ref: {fetchedOrder.reference_id || order.id || order.reference_id}
                        </h2>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold uppercase text-gray-400 print:text-black print:text-xs">Date</p>
                        <p className="font-medium text-[#5a4a3a] print:text-black print:text-sm">
                          {formatDate(fetchedOrder.created_at || order.timestamp || order.created_at)}
                        </p>
                    </div>
                </div>

                {/* Landscape Grid Layout for Content */}
                <div className="print:grid print:grid-cols-[35%_65%] print:gap-8 print:mt-4">
                  
                  {/* Left Column */}
                  <div className="flex flex-col gap-6 print:gap-4">
                      {/* Customer Information Box */}
                      <div>
                          <h3 className="text-sm font-bold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-2 print:text-black">
                            Customer Information
                          </h3>
                          <div className="grid grid-cols-2 gap-4 bg-[#fdfbf7] p-4 rounded-lg border border-[#e5ddd5] print:grid-cols-1 print:bg-white print:border-black print:p-3 print:gap-1.5 print:text-sm">
                            <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[11px]">Name</span>
                                <span className="font-medium text-[#5a4a3a] print:text-black leading-tight text-right">
                                  {fetchedOrder.customer_name || order.customerName || order.customer_name}
                                </span>
                            </div>
                            <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[11px]">Email</span>
                                <span className="font-medium text-[#5a4a3a] print:text-black leading-tight truncate text-right">
                                  {details.email || fetchedOrder.customer_email || order.customer_email || "\u00A0"}
                                </span>
                            </div>
                            <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[11px]">Phone</span>
                                <span className="font-medium text-[#5a4a3a] print:text-black leading-tight text-right">
                                  {details.phone || "\u00A0"}
                                </span>
                            </div>
                            <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[11px]">Country</span>
                                <span className="font-medium text-[#5a4a3a] print:text-black leading-tight text-right">
                                  {details.country || "\u00A0"}
                                </span>
                            </div>
                            
                            <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[11px]">Guest Type</span>
                                <span className="font-medium text-[#5a4a3a] print:text-black leading-tight text-right">{guestType}</span>
                            </div>
                            <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start">
                                <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[11px]">Room No</span>
                                <span className="font-medium text-[#5a4a3a] print:text-black leading-tight text-right">{roomNo}</span>
                            </div>
                          </div>
                      </div>

                      {/* Service Time Tracking */}
                      <div>
                          <h3 className="text-sm font-bold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-2 print:text-black">
                            Time Tracking
                          </h3>
                          <div className="grid grid-cols-1 gap-4 p-4 rounded-lg border border-[#e5ddd5] print:border-black print:p-3 print:gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-[#5a4a3a] print:text-black whitespace-nowrap print:text-sm">Time In:</span>
                                <span className="font-medium text-[#5a4a3a] print:text-black print:text-sm">{timeIn}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 pt-2 print:pt-1 border-t border-gray-200">
                                <span className="font-bold text-[#5a4a3a] print:text-black whitespace-nowrap print:text-sm">Time Out:</span>
                                <span className="font-medium text-[#5a4a3a] print:text-black print:text-sm">{timeOut}</span>
                            </div>
                          </div>
                      </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col gap-6 print:gap-4 mt-6 print:mt-0">
                      {/* Services Ordered */}
                      <div>
                        <h3 className="text-sm font-bold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-2 print:text-black">
                          Services Ordered
                        </h3>
                        <div className="overflow-x-auto print:overflow-visible">
                            <table className="w-full text-sm text-left border-collapse print:text-[13px]">
                              <thead>
                                  <tr className="border-y-2 border-[#e5ddd5] text-[#7a6a5a] print:border-black print:text-black">
                                    <th className="py-2 px-2 font-bold w-[50%]">Service</th>
                                    <th className="py-2 px-2 font-bold text-center w-[15%]">Qty</th>
                                    <th className="py-2 px-2 font-bold text-right w-[15%]">Price</th>
                                    <th className="py-2 px-2 font-bold text-right w-[20%]">Total</th>
                                  </tr>
                              </thead>
                              <tbody className="text-[#5a4a3a] print:text-black">
                                  {cart.map((item, idx) => (
                                    <tr key={idx} className="border-b border-[#f5f1ed] print:border-gray-300">
                                        <td className="py-2.5 px-2">
                                          <p className="font-medium leading-tight">{item.name}</p>
                                          <p className="text-xs text-[#7a6a5a] print:text-gray-600 mt-0.5">{item.duration}</p>
                                        </td>
                                        <td className="py-2.5 px-2 text-center align-top">{item.quantity}</td>
                                        <td className="py-2.5 px-2 text-right align-top">₱{item.price?.toLocaleString()}</td>
                                        <td className="py-2.5 px-2 text-right font-medium align-top">
                                          ₱{(item.price * item.quantity).toLocaleString()}
                                        </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="border-t-2 border-[#e5ddd5] pt-4 flex flex-col items-end print:border-black print:pt-3 print:mt-2 h-full justify-end">
                        <div className="w-full sm:w-72 print:w-64 space-y-2 text-[#5a4a3a] print:text-black">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-[#7a6a5a] print:text-gray-700">Subtotal:</span>
                              <span className="font-medium">₱{basePrice.toLocaleString()}</span>
                            </div>
                            {hasDiscount && (
                              <div className="flex justify-between text-sm text-green-600 print:text-gray-700">
                                  <span className="font-medium">Discount ({details.discount.percentage}%):</span>
                                  <span className="font-medium">-₱{discountAmount.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-[#7a6a5a] print:text-gray-700">Tip / Gratuity:</span>
                              <span className="font-medium">₱{Number(tipAmount).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xl print:text-lg font-bold text-[#5a4a3a] pt-3 border-t border-[#8b7355] mt-2 print:border-black print:text-black">
                              <span>Total:</span>
                              <span>₱{finalTotal.toLocaleString()}</span>
                            </div>
                        </div>
                      </div>
                  </div>

                </div>
              </div>

              {/* Footer text */}
              <div className="text-center mt-8 pt-4 border-t border-[#f5f1ed] text-[#7a6a5a] print:border-black print:text-black print:mt-4 print:pt-2">
                  <p className="text-sm print:text-xs italic font-serif">Thank you for choosing Lema Filipino Spa.</p>
                  <p className="text-xs print:text-[10px] mt-1">This document serves as your booking reference.</p>
              </div>

           </div>

           <div className="p-6 border-t border-[#f5f1ed] bg-gray-50 mt-auto print:hidden">
              <Button onClick={onClose} className="w-full md:w-auto">Close Details</Button>
           </div>
        </motion.div>
      </div>
    );
  };

  // --- Main Render ---

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <div className="print:hidden space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#5a4a3a] flex items-center gap-2">
                {t('submissions') || 'Admin Dashboard'}
                {role === 'admin' && <Shield className="h-5 w-5 text-[#d4a574]" title="Administrator Access" />}
            </h1>
            <p className="text-gray-500">
                Logged in as <span className="font-semibold capitalize">{role}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 bg-white p-1 rounded-lg border shadow-sm">
             {availableTabs.map(tab => (
               <button 
                 key={tab} 
                 onClick={() => {
                   setActiveTab(tab);
                   setSelectedItem(null);
                 }} 
                 className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                   activeTab === tab 
                     ? 'bg-[#8b7355] text-white shadow-sm' 
                     : 'text-gray-600 hover:bg-gray-100'
                 }`}
               >
                 {tab === 'intakes' ? t('healthForm') : tab === 'orders' ? 'Booking' : tab.charAt(0).toUpperCase() + tab.slice(1)}
               </button>
             ))}
             
             {isAdmin && (
               <>
                  <button 
                    onClick={() => {
                      setActiveTab('services');
                      setSelectedItem(null);
                    }} 
                    aria-label="Manage Products" 
                    title="Manage Products" 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                      activeTab === 'services' 
                        ? 'bg-[#8b7355] text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                     <Package className="h-4 w-4" /> Products
                  </button>

                  <button 
                    onClick={() => {
                      setActiveTab('gift-cards');
                      setSelectedItem(null);
                    }} 
                    aria-label="Manage Gift Cards" 
                    title="Manage Gift Cards" 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                      activeTab === 'gift-cards' 
                        ? 'bg-[#8b7355] text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                     <Gift className="h-4 w-4" /> Gift Cards
                  </button>

                  <button 
                    onClick={() => {
                      setActiveTab('therapists');
                      setSelectedItem(null);
                    }} 
                    aria-label="Manage Therapists" 
                    title="Manage Therapists" 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                      activeTab === 'therapists' 
                        ? 'bg-[#8b7355] text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                     <UserCog className="h-4 w-4" /> Therapists
                  </button>

                  <button 
                    onClick={() => {
                      setActiveTab('management');
                      setSelectedItem(null);
                    }} 
                    aria-label="Open Management Page" 
                    title="Manage Users" 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                      activeTab === 'management' 
                        ? 'bg-[#8b7355] text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                     <Users className="h-4 w-4" /> Management
                  </button>
                </>
             )}
          </div>
        </div>

        {activeTab === 'services' && isAdmin ? (
          <ServicesManager />
        ) : activeTab === 'management' && isAdmin ? (
          <ManagementPage 
            feedbacks={feedbacks} 
            onRefreshFeedbacks={() => {
              fetchFeedbacks();
              toast({
                title: "Success",
                description: "Feedbacks data reloaded successfully."
              });
            }} 
            isLoadingFeedbacks={isLoadingFeedbacks} 
          />
        ) : activeTab === 'gift-cards' && isAdmin ? (
          <GiftCardsPage />
        ) : activeTab === 'therapists' && isAdmin ? (
          <TherapistManager />
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium">Reference ID</th>
                  <th className="px-6 py-4 font-medium">Customer</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  {activeTab === 'orders' && <th className="px-6 py-4 font-medium">Total</th>}
                  {activeTab === 'feedbacks' && <th className="px-6 py-4 font-medium">Rating</th>}
                  <th className="px-6 py-4 font-medium">Status</th>
                  {activeTab === 'orders' && <th className="px-6 py-4 font-medium">Feedback</th>}
                  <th className="px-6 py-4 font-medium text-right">{activeTab === 'orders' ? 'Print' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.length > 0 ? (
                  displayItems.map(item => {
                    const detailsObj = (() => {
                      if (!item.details) return {};
                      if (typeof item.details === 'string') {
                        try {
                          return JSON.parse(item.details);
                        } catch (e) {
                          return {};
                        }
                      }
                      return item.details;
                    })();
                    
                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-500">
                        {item.booking_id || item.reference_id || item.id}
                      </td>
                      <td className="px-6 py-4 font-medium text-[#5a4a3a]">
                        {item.customerName || item.customer_name || detailsObj?.guestName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                        <Clock className="h-3 w-3" /> {formatDate(item.timestamp || item.created_at)}
                      </td>
                      {activeTab === 'orders' && (
                        <td className="px-6 py-4">
                            <div className="flex flex-col">
                               <span className="font-bold text-[#5a4a3a]">₱{item.totalPrice?.toLocaleString()}</span>
                               {detailsObj?.discount && (
                                 <div className="flex flex-wrap items-center gap-1 mt-1">
                                      <Badge variant="outline" className="text-[10px] text-green-600 bg-green-50 border-green-200 font-normal px-1.5 py-0.5 h-auto gap-1">
                                          <Tag className="h-3 w-3" />
                                          <span className="font-mono font-bold">{detailsObj.discount.code}</span>
                                          <span>
                                             -{detailsObj.discount.percentage}%
                                             {detailsObj.baseTotalPrice && ` (-₱${(detailsObj.baseTotalPrice - item.totalPrice).toLocaleString()})`}
                                          </span>
                                      </Badge>
                                  </div>
                               )}
                            </div>
                         </td>
                      )}
                      
                      {activeTab === 'feedbacks' && (
                        <td className="px-6 py-4">
                            <div className="flex flex-col">
                               <span className="font-bold text-[#5a4a3a] flex items-center gap-1">
                                  {detailsObj?.overallRating ? (
                                    <>
                                      <Star className="h-3 w-3 text-[#d4a574] fill-[#d4a574]" />
                                      {detailsObj.overallRating} / 5
                                    </>
                                  ) : 'N/A'}
                               </span>
                            </div>
                         </td>
                      )}

                      <td className="px-6 py-4">
                        {activeTab === 'orders' ? (
                          <BookingStatusCell item={item} />
                        ) : (
                          renderStatusBadge(item.status || 'Completed')
                        )}
                      </td>

                      {activeTab === 'orders' && (
                        <td className="px-6 py-4">
                          <FeedbackCell item={item} />
                        </td>
                      )}

                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 text-[#8b7355] border-[#8b7355]/30 hover:bg-[#8b7355]/10" 
                          onClick={() => {
                            console.log("Setting selected item from table row. Item details:", item);
                            setSelectedItem(item);
                          }}
                        >
                          <Eye className="h-3 w-3" /> View
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8" 
                            onClick={e => handleDelete(e, item)} 
                            title="Delete Record"
                          >
                                <Trash2 className="h-4 w-4" />
                             </Button>
                        )}
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td 
                      colSpan={activeTab === 'orders' ? 7 : activeTab === 'feedbacks' ? 6 : 5} 
                      className="px-6 py-12 text-center text-gray-400"
                    >
                      No submissions found in {activeTab === 'intakes' ? 'health forms' : activeTab === 'orders' ? 'bookings' : activeTab}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      <AnimatePresence>
        {selectedItem && activeTab === 'intakes' && (
          <HealthFormDetailsModal 
            key="intake-modal" 
            intake={selectedItem} 
            onClose={() => setSelectedItem(null)} 
          />
        )}

        {selectedItem && activeTab === 'orders' && (
          <OrderDetailsModal 
            key="order-modal" 
            order={selectedItem} 
            onClose={() => setSelectedItem(null)} 
          />
        )}

        {selectedItem && activeTab === 'feedbacks' && (
          <FeedbackPrintModal 
            key="feedback-print-modal" 
            feedback={selectedItem} 
            onClose={() => setSelectedItem(null)} 
            allOrders={submissions?.orders || []} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
