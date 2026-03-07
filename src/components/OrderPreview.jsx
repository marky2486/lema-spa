import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Printer, XCircle, FileText, AlertCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import PrintHeader from './PrintHeader';
import BookingFeedbackStatus from './BookingFeedbackStatus';
import SatisfactionForm from './SatisfactionForm';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

// Robust array extraction that handles JSON strings, standard arrays, and comma-separated lists
const ensureArray = (val) => {
    if (val === null || val === undefined || val === '') return [];
    
    if (Array.isArray(val)) {
        return val.flatMap(v => {
            if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
                try {
                    const parsed = JSON.parse(v);
                    return Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    return v;
                }
            }
            return v;
        }).filter(Boolean);
    }
    
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
            return [parsed];
        } catch (e) {
            if (val.includes(',')) {
                return val.split(',').map(s => s.trim()).filter(Boolean);
            }
            return [val];
        }
    }
    
    return [String(val)];
};

function OrderPreview({
  orderNumber,
  customerDetails,
  cart,
  totalPrice,
  onClose,
  onProceedToHealthForm,
  onSubmitFeedback
}) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const { toast } = useToast();
  
  useEffect(() => {
    async function fetchOrderData() {
        if (!orderNumber) return;
        try {
            const { data } = await supabase
              .from('orders')
              .select('*, therapist:therapists(name)')
              .eq('reference_id', orderNumber)
              .single();
            if (data) {
                console.log("[OrderPreview] Fetched order data:", data);
                setOrderData(data);
            }
        } catch (err) {
            console.error("[OrderPreview] Error fetching order data:", err);
        }
    }

    async function fetchFeedbackData() {
        if (!orderNumber) return;
        setLoadingFeedback(true);
        try {
            const { data, error } = await supabase
              .from('feedbacks')
              .select('*')
              .eq('booking_id', orderNumber)
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (error) {
               throw error;
            } else if (data && data.length > 0) {
                console.log("[OrderPreview] Fetched feedback data:", data[0]);
                setHasFeedback(true);
                setFeedbackData(data[0]);
                if (data[0].tip_amount) {
                    setTipAmount(Number(data[0].tip_amount));
                }
            } else {
               setHasFeedback(false);
               setFeedbackData(null);
               setTipAmount(0);
            }
        } catch (err) {
            console.error("[OrderPreview] Error fetching feedback:", err);
            setHasFeedback(false);
            setFeedbackData(null);
        } finally {
            setLoadingFeedback(false);
        }
    }
    
    fetchOrderData();
    fetchFeedbackData();
    
    const channel = supabase.channel(`public:feedbacks:preview_${orderNumber}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks', filter: `booking_id=eq.${orderNumber}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
             setHasFeedback(true);
             setFeedbackData(payload.new);
             if (payload.new.tip_amount) {
                 setTipAmount(Number(payload.new.tip_amount));
             }
          } else if (payload.eventType === 'DELETE') {
             setHasFeedback(false);
             setFeedbackData(null);
             setTipAmount(0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderNumber]);
  
  const handlePrint = () => {
    window.print();
  };
  
  const hasDiscount = !!customerDetails.discount;
  const basePrice = customerDetails.baseTotalPrice || totalPrice;
  const discountAmount = hasDiscount ? basePrice - totalPrice : 0;
  const finalTotal = totalPrice + tipAmount;
  
  // Extract therapist name
  const therapistName = orderData?.therapist?.name || customerDetails?.therapistName || orderData?.details?.therapistName;

  // Extract payment methods and note
  const rawPmMethods = orderData?.payment_methods || customerDetails?.payment_methods || [];
  const pmArray = ensureArray(rawPmMethods);
  const pmNote = orderData?.payment_method_note || customerDetails?.payment_method_note || "";

  console.log("[OrderPreview] Resolved payment methods:", pmArray);
  console.log("[OrderPreview] Resolved payment note:", pmNote);

  // Extract feedback details
  const feedbackDetails = (() => {
      if (!feedbackData?.details) return {};
      if (typeof feedbackData.details === 'string') {
          try { return JSON.parse(feedbackData.details); } catch(e) { return {}; }
      }
      return feedbackData.details;
  })();

  // Extract Guest Type and Room No
  const rawGuestType = feedbackDetails?.guest_type || feedbackDetails?.guestType || orderData?.guest_type || "";
  const rawRoomNo = feedbackDetails?.room_no || feedbackDetails?.roomNo || orderData?.room_no || "";
  
  const guestType = rawGuestType && rawGuestType !== "N/A" ? rawGuestType : null;
  const roomNo = rawRoomNo && rawRoomNo !== "N/A" ? rawRoomNo : null;
  
  console.log("[OrderPreview] Guest Type:", guestType, "Room No:", roomNo);
  
  // Extract Time Tracking
  const timeIn = feedbackDetails?.timeIn || "-";
  const timeOut = feedbackDetails?.timeOut || "-";
  
  console.log("[OrderPreview] Time In:", timeIn, "Time Out:", timeOut);

  const handleFeedbackSubmit = (formData) => {
    setHasFeedback(true);
    if (formData.gratuityAmount) {
        setTipAmount(Number(formData.gratuityAmount));
    }
    if (onSubmitFeedback) {
      onSubmitFeedback(formData);
    }
    setShowFeedbackModal(false);
  };

  const getDensitySettings = () => {
    const count = cart.length;
    if (count > 25) return {
      text: 'print:text-[8px]',
      leading: 'print:leading-none',
      padding: 'print:py-0',
      headerText: 'print:text-[9px]',
      nameClass: 'print:text-[8px]',
      subtext: 'print:hidden'
    };
    if (count > 15) return {
      text: 'print:text-[9px]',
      leading: 'print:leading-tight',
      padding: 'print:py-0.5',
      headerText: 'print:text-[10px]',
      nameClass: 'print:font-semibold',
      subtext: 'print:text-[8px]'
    };
    if (count > 8) return {
      text: 'print:text-[10px]',
      leading: 'print:leading-snug',
      padding: 'print:py-1',
      headerText: 'print:text-[11px]',
      nameClass: 'print:font-semibold',
      subtext: 'print:text-[9px]'
    };
    return {
      text: 'print:text-[11px]',
      leading: 'print:leading-normal',
      padding: 'print:py-1',
      headerText: 'print:text-[12px]',
      nameClass: 'print:font-semibold',
      subtext: 'print:text-[10px]'
    };
  };
  const density = getDensitySettings();
  
  return <motion.div initial={{
    opacity: 0,
    scale: 0.95
  }} animate={{
    opacity: 1,
    scale: 1
  }} className="max-w-3xl mx-auto print:max-w-none print:w-full print:max-h-[5.5in] print:mx-0 print:p-0 print:overflow-hidden print:flex print:flex-col">
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

      {/* Action Buttons - Hidden during print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 print:hidden bg-white p-4 rounded-lg shadow-sm border border-[#e5ddd5] shrink-0">
        
        {!loadingFeedback && !hasFeedback ? (
           <div className="flex items-center gap-4 text-sm text-amber-600 font-medium">
              <AlertCircle className="h-4 w-4" />
              <span>No feedback submitted yet</span>
              <Button onClick={() => setShowFeedbackModal(true)} variant="outline" size="sm" className="border-[#8b7355] text-[#8b7355] hover:bg-[#f5f1ed]">
                  Submit Feedback
              </Button>
           </div>
        ) : (
           <BookingFeedbackStatus 
             bookingId={orderNumber} 
             onPrint={handlePrint}
             onOpenFeedback={() => setShowFeedbackModal(true)}
           />
        )}
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={onClose} className="gap-2 flex-1 sm:flex-none">
            <XCircle className="h-4 w-4" />
            Back
          </Button>
          <Button onClick={onProceedToHealthForm} className="bg-[#d4a574] hover:bg-[#c29665] text-white gap-2 flex-1 sm:flex-none">
            <FileText className="h-4 w-4" />
            Health Form
          </Button>
        </div>
      </div>

      <div className="print:hidden">
          <PrintHeader 
            title="Service Slip" 
            therapistName={therapistName}
            guestType={guestType}
            roomNo={roomNo}
            paymentMethods={pmArray}
            paymentNote={pmNote}
          />
      </div>

      {/* Order Slip Container */}
      <div className="bg-white p-8 shadow-2xl text-[#5a4a3a] print:shadow-none print:border-0 print:p-0 print:w-full print:h-[5.5in] relative overflow-hidden flex flex-col print:flex-row print:gap-4 flex-grow">
        
        <div className="absolute top-0 left-0 w-full h-2 bg-[#8b7355] print:hidden" />
        
        <div className="w-full print:w-[40%] print:flex print:flex-col print:justify-between print:h-full print:border-r print:border-[#e5ddd5] print:pr-4">
            <div className="hidden print:block mb-2">
                <PrintHeader 
                  title="Service Slip" 
                  therapistName={therapistName}
                  guestType={guestType}
                  roomNo={roomNo}
                  paymentMethods={pmArray}
                  paymentNote={pmNote}
                  landscape={true}
                />
            </div>

            <div className="flex justify-between items-start mb-8 print:mb-2 border-b-2 border-[#f5f1ed] pb-6 print:pb-2 print:border-b">
                <div className="flex-1 print:hidden">
                    <img src="https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/bb3a6a896ed48f2a2a28957285d21bbe.png" alt="Lema Spa Logo" className="h-16 w-auto object-contain print:h-12" />
                </div>
                <div className="text-right ml-4 print:ml-0 print:w-full print:text-left">
                    <p className="text-2xl font-mono font-bold text-[#5a4a3a] print:text-[14px]">Ref: {orderNumber}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 print:block print:space-y-3 print:mb-2 print:flex-grow">
                <div>
                    <h3 className="text-xs font-semibold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-1 print:text-[10px] print:text-black">Customer Information</h3>
                    <div className="space-y-1 text-sm print:text-[11px] print:leading-tight">
                      <p className="break-words"><span className="font-semibold">Name:</span> {customerDetails.fullName}</p>
                      <p className="break-words print:hidden"><span className="font-semibold">Email:</span> {customerDetails.email}</p>
                      <p className="break-words"><span className="font-semibold">Country:</span> {customerDetails.country}</p>
                      <p className="break-words"><span className="font-semibold">Birthdate:</span> {customerDetails.birthdate}</p>
                    </div>
                </div>
                
                {/* Time Tracking Section */}
                <div className="print:block">
                    <h3 className="text-xs font-semibold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-1 print:text-[10px] print:text-black">Time Tracking</h3>
                    <div className="space-y-1 text-sm print:text-[11px] print:leading-tight">
                      <p className="break-words"><span className="font-semibold">Time In:</span> {timeIn}</p>
                      <p className="break-words"><span className="font-semibold">Time Out:</span> {timeOut}</p>
                    </div>
                </div>
            </div>

            <div className="print:mt-auto">
                <div className="mb-6 print:mb-2 border-t border-gray-300 pt-2 print:pt-1">
                    <div className="space-y-2 print:space-y-0.5">
                        <div className="flex justify-between text-sm text-[#7a6a5a] print:text-[11px]">
                          <span>Subtotal</span>
                          <span>₱{basePrice.toLocaleString()}</span>
                        </div>
                        
                        {hasDiscount && (
                            <div className="flex justify-between text-sm text-green-600 font-medium print:text-[11px]">
                              <span>Discount ({customerDetails.discount.percentage}%)</span>
                              <span>-₱{discountAmount.toLocaleString()}</span>
                            </div>
                        )}
                        
                        {tipAmount > 0 && (
                            <div className="flex justify-between text-sm text-[#8b7355] font-medium print:text-[11px]">
                              <span>Tip</span>
                              <span>₱{tipAmount.toLocaleString()}</span>
                            </div>
                        )}
                        
                        <div className="flex justify-between py-2 border-t-2 border-[#8b7355] mt-2 print:mt-1 print:py-1 print:border-t print:border-black">
                          <span className="text-lg font-bold text-[#5a4a3a] print:text-[12px]">Total Amount</span>
                          <span className="text-2xl font-bold text-[#8b7355] print:text-[14px] print:text-black">₱{finalTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="text-center border-t border-[#e5ddd5] pt-6 print:pt-1 print:border-none">
                    <p className="text-xs text-[#7a6a5a] italic print:text-[9px]">
                        "This is not an Official Receipt."
                    </p>
                    <p className="text-[10px] text-[#d4a574] mt-2 print:mt-0.5 print:text-[8px] print:text-gray-500">Thank you for choosing Lema Filipino Spa.</p>
                </div>
            </div>
        </div>

        <div className="w-full print:w-[60%] print:h-full print:flex print:flex-col">
            <h3 className="text-xs font-semibold text-[#7a6a5a] uppercase tracking-wider mb-4 print:mb-2 print:text-[10px] print:text-black print:hidden">Service Summary</h3>
            
            <div className="print:flex-grow">
                <table className={`w-full text-sm border-collapse ${density.text} ${density.leading}`}>
                    <thead>
                      <tr className="border-b border-[#e5ddd5] text-left text-[#7a6a5a] print:border-gray-300">
                          <th className={`pb-2 font-medium w-1/2 ${density.headerText}`}>Service</th>
                          <th className={`pb-2 font-medium text-center w-[15%] ${density.headerText}`}>Qty</th>
                          <th className={`pb-2 font-medium text-right w-[15%] ${density.headerText}`}>Price</th>
                          <th className={`pb-2 font-medium text-right w-[20%] ${density.headerText}`}>Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#5a4a3a] print:text-black">
                    {cart.map((item, index) => <tr key={index} className={`border-b border-[#f5f1ed] break-inside-avoid ${density.padding} print:border-gray-100`}>
                          <td className="py-3 pr-4 align-top print:pr-2 print:align-middle print:py-1">
                              <p className={`break-words ${density.nameClass}`}>{item.name}</p>
                              <p className={`text-xs text-[#7a6a5a] mt-0.5 print:mt-0 ${density.subtext}`}>{item.duration}</p>
                          </td>
                          <td className="py-3 text-center align-top print:align-middle print:py-1">{item.quantity}</td>
                          <td className="py-3 text-right align-top whitespace-nowrap print:align-middle print:py-1">₱{item.price.toLocaleString()}</td>
                          <td className="py-3 text-right font-medium align-top whitespace-nowrap print:align-middle print:py-1">
                              ₱{(item.price * item.quantity).toLocaleString()}
                          </td>
                        </tr>)}
                    </tbody>
                </table>
            </div>
        </div>

      </div>

      {showFeedbackModal && (
        <SatisfactionForm
          bookingId={orderNumber}
          customerReference={customerDetails?.fullName}
          paymentMethods={pmArray}
          paymentNote={pmNote}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </motion.div>;
}
export default OrderPreview;