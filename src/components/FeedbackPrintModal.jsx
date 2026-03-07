
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Printer, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PrintHeader from './PrintHeader';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';

const LEMA_LOGO = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/d1952d3bda1cba2e721a0a8c399d7c46.png";

// Robust array extraction that handles JSON strings, standard arrays, and comma-separated lists
const ensureArray = (val) => {
    if (val === null || val === undefined || val === '') return [];
    
    // If it's already an array, check if its contents are stringified JSON
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
    
    // If it's a string, try parsing it as JSON first
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
            return [parsed];
        } catch (e) {
            // Not valid JSON, maybe it's comma separated
            if (val.includes(',')) {
                return val.split(',').map(s => s.trim()).filter(Boolean);
            }
            return [val];
        }
    }
    
    return [String(val)];
};

export default function FeedbackPrintModal({ feedback, order: initialOrder, allOrders = [], paymentMethods: passedPaymentMethods, paymentNote: passedPaymentNote, onClose }) {
    const [fetchedOrder, setFetchedOrder] = useState(initialOrder);
    const navigate = useNavigate();

    // 1. Comprehensive Logging of incoming props
    console.group("=== FEEDBACK PRINT MODAL DEBUG ===");
    console.log("Prop received - feedback object:", feedback);
    console.log("Prop received - order object (initial):", initialOrder);
    console.log("Prop received - paymentMethods:", passedPaymentMethods);
    console.log("Prop received - allOrders array length:", allOrders?.length, "structure:", allOrders);
    console.groupEnd();

    useEffect(() => {
        const fetchFullOrder = async () => {
            if (initialOrder && initialOrder.therapist) return; // Skip if we already have order with therapist joined
            const targetId = feedback?.booking_id || feedback?.reference_id;
            if (!targetId) return;

            try {
                console.log(`[Fetch] Fetching full order details for ${targetId}`);
                const { data, error } = await supabase
                    .from('orders')
                    .select('*, therapist:therapists(name)')
                    .eq('reference_id', targetId)
                    .single();
                    
                if (data && !error) {
                    console.log("[Fetch] Success! Fetched Order:", data);
                    setFetchedOrder(data);
                } else {
                    console.warn("[Fetch] Failed or not found, falling back to allOrders prop");
                    const found = allOrders.find(o => o.reference_id === targetId);
                    if (found) setFetchedOrder(found);
                }
            } catch (err) {
                console.error("[Fetch] Error fetching full order:", err);
                const found = allOrders.find(o => o.reference_id === targetId);
                if (found) setFetchedOrder(found);
            }
        };
        fetchFullOrder();
    }, [feedback, initialOrder, allOrders]);

    const handlePrint = () => {
        window.print();
        setTimeout(() => {
            navigate('/admin-dashboard');
        }, 1000);
    };

    if (!feedback) {
        console.error("Critical Error: feedback prop is missing");
        return null;
    }

    const details = (() => {
        if (!feedback.details) return {};
        if (typeof feedback.details === 'string') {
            try { return JSON.parse(feedback.details); } catch(e) { return {}; }
        }
        return feedback.details;
    })();

    const order = fetchedOrder || null;
    const orderDetails = order?.details || {};
    const cart = orderDetails.cart || [];
    const customer = orderDetails.customerDetails || {};

    const basePrice = customer.baseTotalPrice || order?.total_price || order?.totalPrice || 0;
    const tipAmount = feedback.tip_amount || details.gratuityAmount || 0;
    const hasDiscount = !!customer.discount;
    const discountAmount = hasDiscount ? basePrice - (order?.total_price || order?.totalPrice || 0) : 0;
    const finalTotal = Number(order?.total_price || order?.totalPrice || basePrice) + Number(tipAmount);

    const guestName = details?.guestName || feedback.customer_name || customer.fullName || order?.customer_name || "Anonymous Guest";
    const email = customer.email || orderDetails.email || "\u00A0";
    const phone = customer.phone || orderDetails.phone || "\u00A0";

    const { guest_type, room_no, guestType: cGuestType, roomNo: cRoomNo } = details || {};
    const rawGuestType = guest_type || cGuestType || order?.guest_type || "";
    const rawRoomNo = room_no || cRoomNo || order?.room_no || "";

    const guestType = rawGuestType && rawGuestType !== "N/A" ? rawGuestType : "\u00A0";
    const roomNo = rawRoomNo && rawRoomNo !== "N/A" ? rawRoomNo : "\u00A0";
    
    const therapistName = order?.therapist?.name || details?.therapistName || orderDetails?.therapistName;
    
    // 2. Logging specific order structure for payment
    console.group("=== PAYMENT METHODS EXTRACTION DEBUG ===");
    console.log("Raw order.payment_methods (plural):", order?.payment_methods);
    console.log("Raw order.payment_method (singular):", order?.payment_method);
    console.log("Raw order.payment_method_note:", order?.payment_method_note);
    console.log("Passed props.paymentMethods:", passedPaymentMethods);
    console.log("Passed props.paymentNote:", passedPaymentNote);
    console.log("Feedback details.payment_methods:", details?.payment_methods);

    // 3. Fallback extraction logic
    let rawPmArray = [];
    if (passedPaymentMethods !== undefined && passedPaymentMethods !== null && ensureArray(passedPaymentMethods).length > 0) {
        rawPmArray = passedPaymentMethods;
        console.log("-> Using passedPaymentMethods prop:", rawPmArray);
    } else if (order?.payment_methods && ensureArray(order.payment_methods).length > 0) {
        rawPmArray = order.payment_methods;
        console.log("-> Falling back to order.payment_methods:", rawPmArray);
    } else if (order?.payment_method && ensureArray(order.payment_method).length > 0) {
        rawPmArray = order.payment_method;
        console.log("-> Falling back to order.payment_method (singular):", rawPmArray);
    } else if (details?.payment_methods && ensureArray(details.payment_methods).length > 0) {
        rawPmArray = details.payment_methods;
        console.log("-> Falling back to feedback.details.payment_methods:", rawPmArray);
    } else if (details?.paymentMethods && ensureArray(details.paymentMethods).length > 0) {
        rawPmArray = details.paymentMethods;
        console.log("-> Falling back to feedback.details.paymentMethods:", rawPmArray);
    } else if (customer?.payment_methods && ensureArray(customer.payment_methods).length > 0) {
        rawPmArray = customer.payment_methods;
        console.log("-> Falling back to customer.payment_methods:", rawPmArray);
    } else if (details?.paymentMethod) {
        rawPmArray = [details.paymentMethod];
        console.log("-> Falling back to details.paymentMethod (singular):", rawPmArray);
    } else {
        console.log("-> No payment methods found across all sources.");
    }
    
    // Safely force to an array of valid strings
    const pmArray = ensureArray(rawPmArray);
                     
    const pmNote = passedPaymentNote || order?.payment_method_note || details?.payment_method_note || details?.paymentNote || 
                   details?.customerDetails?.payment_method_note || customer?.payment_method_note || "";
                        
    console.log("-> Final resolved pmArray BEFORE rendering:", pmArray);
    console.log("-> Final resolved pmNote BEFORE rendering:", pmNote);
    console.groupEnd();

    // 4. Fallback check: if array empty, it will be mapped to "Not specified" in PrintHeader 
    // Format for local display
    const isMissingPaymentMethods = !pmArray || pmArray.length === 0;
    const displayPaymentMethodsStr = isMissingPaymentMethods ? "Not specified" : pmArray.join(', ');

    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        try {
            return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return 'Invalid Date';
        }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:bg-white print:p-0 print:static print:block print:inset-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col border border-[#e5ddd5] print:shadow-none print:w-full print:max-h-none print:rounded-none print:border-none print:overflow-visible"
        >
           <div className="flex items-center justify-between p-6 border-b border-[#f5f1ed] bg-white sticky top-0 z-10 print:hidden">
              <div>
                <h2 className="text-xl font-bold text-[#5a4a3a]">Service Slip Preview</h2>
                <p className="text-sm text-gray-500">Ref: {feedback.booking_id || feedback.reference_id || feedback.id}</p>
                {isMissingPaymentMethods && (
                    <div className="flex items-center gap-1 mt-1 text-amber-600 text-xs font-medium bg-amber-50 px-2 py-1 rounded w-fit">
                        <AlertCircle className="h-3 w-3" /> Warning: No payment methods linked to this order
                    </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 bg-[#8b7355] text-white hover:bg-[#7a6345] hover:text-white border-none">
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
              </div>
           </div>

           <div className="p-6 sm:p-8 space-y-8 print:p-0 print:space-y-4 bg-white print:font-sans print:h-full print:flex print:flex-col print:justify-between">
              
              <div>
                {/* 5. Print Header Call */}
                <div className="mb-4 pt-2">
                    <PrintHeader 
                      title="SERVICE SLIP" 
                      logo={LEMA_LOGO} 
                      guestType={guestType !== "\u00A0" ? guestType : undefined} 
                      roomNo={roomNo !== "\u00A0" ? roomNo : undefined} 
                      therapistName={therapistName}
                      paymentMethods={pmArray}
                      paymentNote={pmNote}
                    />
                </div>

                {/* Header Info */}
                <div className="flex justify-between items-end border-b-2 border-[#f5f1ed] pb-4 print:border-black print:mt-2 print:pb-2">
                    <div>
                        <h2 className="text-2xl font-mono font-bold text-[#5a4a3a] print:text-black print:text-xl">Ref: {feedback.booking_id || feedback.reference_id || feedback.id}</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold uppercase text-gray-400 print:text-black print:text-xs">Date</p>
                        <p className="font-medium text-[#5a4a3a] print:text-black print:text-sm">{details?.dateOfVisit || formatDate(feedback.created_at)}</p>
                    </div>
                </div>

                {/* Landscape Grid Layout for Content */}
                <div className="print:grid print:grid-cols-[35%_65%] print:gap-8 print:mt-4">
                  
                  {/* Left Column */}
                  <div className="flex flex-col gap-6 print:gap-4">
                      {/* Customer Information Box */}
                      <div>
                          <h3 className="text-sm font-bold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-2 print:text-black">Customer Information</h3>
                          <div className="grid grid-cols-2 gap-4 bg-[#fdfbf7] p-4 rounded-lg border border-[#e5ddd5] print:grid-cols-1 print:bg-white print:border-black print:p-3 print:gap-1.5 print:text-sm">
                            <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[11px]">Name</span>
                                <span className="font-medium text-[#5a4a3a] print:text-black leading-tight text-right">{guestName}</span>
                            </div>
                            <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[11px]">Email</span>
                                <span className="font-medium text-[#5a4a3a] print:text-black leading-tight truncate text-right">{email}</span>
                            </div>
                            <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[11px]">Phone</span>
                                <span className="font-medium text-[#5a4a3a] print:text-black leading-tight text-right">{phone}</span>
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
                          <h3 className="text-sm font-bold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-2 print:text-black">Time Tracking</h3>
                          <div className="grid grid-cols-1 gap-4 p-4 rounded-lg border border-[#e5ddd5] print:border-black print:p-3 print:gap-3">
                            <div className="flex items-end gap-3">
                                <span className="font-bold text-[#5a4a3a] print:text-black whitespace-nowrap print:text-sm">Time In:</span>
                                <div className="flex-grow border-b border-dashed border-gray-300 print:border-black"></div>
                            </div>
                            <div className="flex items-end gap-3 pt-2 print:pt-1">
                                <span className="font-bold text-[#5a4a3a] print:text-black whitespace-nowrap print:text-sm">Time Out:</span>
                                <div className="flex-grow border-b border-dashed border-gray-300 print:border-black"></div>
                            </div>
                          </div>
                      </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col gap-6 print:gap-4 mt-6 print:mt-0">
                      {/* Services Ordered */}
                      <div>
                        <h3 className="text-sm font-bold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-2 print:text-black">Services Ordered</h3>
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
                                  {cart.length > 0 ? cart.map((item, idx) => (
                                    <tr key={idx} className="border-b border-[#f5f1ed] print:border-gray-300">
                                        <td className="py-2.5 px-2">
                                          <p className="font-medium leading-tight">{item.name}</p>
                                          <p className="text-xs text-[#7a6a5a] print:text-gray-600 mt-0.5">{item.duration}</p>
                                        </td>
                                        <td className="py-2.5 px-2 text-center align-top">{item.quantity}</td>
                                        <td className="py-2.5 px-2 text-right align-top">₱{item.price?.toLocaleString()}</td>
                                        <td className="py-2.5 px-2 text-right font-medium align-top">₱{(item.price * item.quantity).toLocaleString()}</td>
                                    </tr>
                                  )) : (
                                      <tr>
                                          <td colSpan="4" className="py-4 text-center text-gray-500">Service details not available</td>
                                      </tr>
                                  )}
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
                                  <span className="font-medium">Discount ({details.discount?.percentage || customer.discount?.percentage}%):</span>
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

                        {/* Payment Method Section - Local fallback display */}
                        <div className="w-full sm:w-72 print:w-64 mt-4 pt-4 border-t border-[#e5ddd5] print:border-gray-300">
                            <div className="flex flex-col text-sm text-[#5a4a3a] print:text-black">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-[#7a6a5a] print:text-black uppercase tracking-wider text-xs print:text-[10px]">Payment Methods:</span>
                                    <span className={`font-medium text-sm print:text-xs text-right break-words max-w-[60%] ${isMissingPaymentMethods ? 'text-gray-400 italic' : ''}`}>
                                        {displayPaymentMethodsStr}
                                    </span>
                                </div>
                                {pmNote && (
                                    <div className="mt-1 text-right text-xs text-gray-500 italic print:text-[10px] break-words">
                                        Note: {pmNote}
                                    </div>
                                )}
                            </div>
                        </div>
                      </div>
                  </div>

                </div>
              </div>

              {/* Footer text */}
              <div className="text-center mt-8 pt-4 border-t border-[#f5f1ed] text-[#7a6a5a] print:border-black print:text-black print:mt-4 print:pt-2">
                  <p className="text-sm print:text-xs italic font-serif">Thank you for visiting Lema Filipino Spa.</p>
                  <p className="text-xs print:text-[10px] mt-1">This document serves as your service slip reference.</p>
              </div>

           </div>

           <div className="p-6 border-t border-[#f5f1ed] bg-gray-50 mt-auto print:hidden">
              <Button onClick={onClose} className="w-full md:w-auto">Close Details</Button>
           </div>
        </motion.div>
      </div>
    );
}
