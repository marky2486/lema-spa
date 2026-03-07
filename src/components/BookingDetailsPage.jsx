
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import PrintHeader from './PrintHeader';
import { isUUID } from '@/lib/isUUID';

const LEMA_LOGO = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/d1952d3bda1cba2e721a0a8c399d7c46.png";

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

export default function BookingDetailsPage() {
    const { reference_id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDetails() {
            try {
                console.log(`[BookingDetailsPage] Fetching data for reference_id: ${reference_id}`);
                
                const orderField = isUUID(reference_id) ? 'id' : 'reference_id';
                
                const [orderRes, feedbackRes] = await Promise.all([
                    supabase.from('orders').select('*, therapist:therapists(name)').eq(orderField, reference_id).single(),
                    supabase.from('feedbacks').select('*').eq('booking_id', reference_id).maybeSingle()
                ]);
                
                if (orderRes.error) {
                    console.error("[BookingDetailsPage] Supabase Error fetching order:", orderRes.error);
                } else if (orderRes.data) {
                    console.log("[BookingDetailsPage] Order fetched successfully:", orderRes.data);
                    setOrder(orderRes.data);
                }

                if (feedbackRes.error) {
                    console.error("[BookingDetailsPage] Supabase Error fetching feedback:", feedbackRes.error);
                } else if (feedbackRes.data) {
                    console.log("[BookingDetailsPage] Feedback fetched successfully:", feedbackRes.data);
                    setFeedback(feedbackRes.data);
                }
            } catch (e) {
                console.error("[BookingDetailsPage] Caught error fetching booking details:", e);
            } finally {
                setLoading(false);
            }
        }
        if (reference_id) fetchDetails();
    }, [reference_id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f5f1ed] text-[#8b7355]">Loading booking details...</div>;
    if (!order) return <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#f5f1ed] text-red-500">
        <p>Booking not found.</p>
        <Button variant="outline" onClick={() => navigate('/')}>Return Home</Button>
    </div>;

    const details = order.details || {};
    const customer = details.customerDetails || {};
    const cart = details.cart || [];
    
    // Extract feedback details - handle both string and object
    const feedbackDetails = (() => {
        if (!feedback?.details) return {};
        if (typeof feedback.details === 'string') {
            try { return JSON.parse(feedback.details); } catch(e) { 
                console.error("[BookingDetailsPage] Error parsing feedback.details:", e);
                return {}; 
            }
        }
        return feedback.details;
    })();
    
    console.log("[BookingDetailsPage] Parsed feedbackDetails:", feedbackDetails);
    
    const tipAmount = feedback?.tip_amount || feedbackDetails.gratuityAmount || 0;
    
    // Customer information
    const guestName = feedbackDetails?.guestName || order.customer_name || customer.fullName || "Anonymous Guest";
    const email = customer.email || details.email || "\u00A0";
    const phone = customer.phone || details.phone || details.phone_number || "\u00A0";
    
    // Guest Type and Room No - Check multiple sources
    const rawGuestType = feedbackDetails?.guest_type || feedbackDetails?.guestType || order?.guest_type || "";
    const rawRoomNo = feedbackDetails?.room_no || feedbackDetails?.roomNo || order?.room_no || "";
    
    const guestType = rawGuestType && rawGuestType !== "N/A" ? rawGuestType : "\u00A0";
    const roomNo = rawRoomNo && rawRoomNo !== "N/A" ? rawRoomNo : "\u00A0";
    
    console.log("[BookingDetailsPage] Guest Type resolved:", { rawGuestType, guestType });
    console.log("[BookingDetailsPage] Room No resolved:", { rawRoomNo, roomNo });
    
    // Therapist name - Check all possible sources
    let therapistName = null;
    
    // Priority 1: From therapist join (most reliable)
    if (order?.therapist?.name) {
        therapistName = order.therapist.name;
        console.log("[BookingDetailsPage] Therapist from order.therapist.name:", therapistName);
    }
    // Priority 2: From feedback details (saved during satisfaction form)
    else if (feedbackDetails?.therapistName) {
        therapistName = feedbackDetails.therapistName;
        console.log("[BookingDetailsPage] Therapist from feedbackDetails.therapistName:", therapistName);
    }
    // Priority 3: From order details
    else if (details?.therapistName) {
        therapistName = details.therapistName;
        console.log("[BookingDetailsPage] Therapist from details.therapistName:", therapistName);
    }
    // Priority 4: If therapist_id exists but no name, show "Assigned"
    else if (order?.therapist_id) {
        therapistName = "Assigned (Name not available)";
        console.log("[BookingDetailsPage] Therapist ID exists but no name");
    }
    
    console.log("[BookingDetailsPage] Final therapist name:", therapistName);
    
    // Time tracking - these fields don't exist in the satisfaction form yet
    // So they will always show "-" unless manually added
    const timeIn = feedbackDetails?.timeIn || "-";
    const timeOut = feedbackDetails?.timeOut || "-";
    
    console.log("[BookingDetailsPage] Time In:", timeIn, "Time Out:", timeOut);
    
    // Payment methods extraction
    let rawPmArray = [];
    if (order?.payment_methods && ensureArray(order.payment_methods).length > 0) {
        rawPmArray = order.payment_methods;
        console.log("[BookingDetailsPage] Using order.payment_methods:", rawPmArray);
    } else if (details?.payment_methods && ensureArray(details.payment_methods).length > 0) {
        rawPmArray = details.payment_methods;
        console.log("[BookingDetailsPage] Using details.payment_methods:", rawPmArray);
    } else if (feedbackDetails?.payment_methods && ensureArray(feedbackDetails.payment_methods).length > 0) {
        rawPmArray = feedbackDetails.payment_methods;
        console.log("[BookingDetailsPage] Using feedbackDetails.payment_methods:", rawPmArray);
    } else if (customer?.payment_methods && ensureArray(customer.payment_methods).length > 0) {
        rawPmArray = customer.payment_methods;
        console.log("[BookingDetailsPage] Using customer.payment_methods:", rawPmArray);
    }
    
    const pmArray = ensureArray(rawPmArray);
    const pmNote = order?.payment_method_note || feedbackDetails?.payment_method_note || feedbackDetails?.paymentNote || details?.payment_method_note || "";
    const displayPaymentMethodsStr = (!pmArray || pmArray.length === 0) ? "Not specified" : pmArray.join(', ');
    
    console.log("[BookingDetailsPage] Payment methods:", pmArray);
    console.log("[BookingDetailsPage] Payment note:", pmNote);
    
    // Calculate totals
    const basePrice = customer.baseTotalPrice || order.total_price || order.totalPrice || 0;
    const hasDiscount = !!customer.discount;
    const discountAmount = hasDiscount ? basePrice - (order.total_price || order.totalPrice || 0) : 0;
    const finalTotal = Number(order.total_price || order.totalPrice || basePrice) + Number(tipAmount);

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
        <div className="min-h-screen bg-[#f5f1ed] p-4 sm:p-8 print:bg-white print:p-0">
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
            </style>
            
            {/* Actions Bar - Hidden on Print */}
            <div className="max-w-4xl mx-auto mb-6 print:hidden">
                <div className="flex justify-between items-center">
                    <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 border-[#d4a574] text-[#5a4a3a] hover:bg-[#fdfbf7]">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button onClick={() => window.print()} className="bg-[#8b7355] hover:bg-[#7a6345] text-white gap-2">
                        <Printer className="w-4 h-4" /> Print Details
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl border border-[#e5ddd5] print:shadow-none print:w-full print:max-h-none print:rounded-none print:border-none print:overflow-visible">
                <div className="p-6 sm:p-8 space-y-6 print:p-0 print:space-y-3 bg-white print:font-sans print:h-full print:flex print:flex-col print:justify-between">
                    
                    <div>
                        {/* Print Header Call */}
                        <div className="mb-4 pt-2 print:mb-2">
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
                        <div className="flex justify-between items-end border-b-2 border-[#f5f1ed] pb-4 print:border-black print:mt-1 print:pb-2">
                            <div>
                                <h2 className="text-2xl font-mono font-bold text-[#5a4a3a] print:text-black print:text-xl">Ref: {order.reference_id}</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold uppercase text-gray-400 print:text-black print:text-xs">Date</p>
                                <p className="font-medium text-[#5a4a3a] print:text-black print:text-sm">{feedbackDetails?.dateOfVisit || formatDate(order.created_at)}</p>
                            </div>
                        </div>

                        {/* Landscape Grid Layout for Content */}
                        <div className="print:grid print:grid-cols-[35%_65%] print:gap-6 print:mt-3">
                            
                            {/* Left Column */}
                            <div className="flex flex-col gap-6 print:gap-3">
                                {/* Customer Information Box */}
                                <div>
                                    <h3 className="text-sm font-bold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-1.5 print:text-black print:text-xs">Customer Information</h3>
                                    <div className="grid grid-cols-2 gap-4 bg-[#fdfbf7] p-4 rounded-lg border border-[#e5ddd5] print:grid-cols-1 print:bg-white print:border-black print:p-2.5 print:gap-1 print:text-[11px]">
                                        <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[9px]">Name</span>
                                            <span className="font-medium text-[#5a4a3a] print:text-black leading-tight text-right">{guestName}</span>
                                        </div>
                                        <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[9px]">Email</span>
                                            <span className="font-medium text-[#5a4a3a] print:text-black leading-tight truncate text-right">{email}</span>
                                        </div>
                                        <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[9px]">Phone</span>
                                            <span className="font-medium text-[#5a4a3a] print:text-black leading-tight text-right">{phone}</span>
                                        </div>
                                        <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start border-b border-transparent print:border-gray-200 print:pb-0.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[9px]">Guest Type</span>
                                            <span className="font-medium text-[#5a4a3a] print:text-black leading-tight text-right">{guestType}</span>
                                        </div>
                                        <div className="space-y-1 print:space-y-0 print:flex print:justify-between print:items-start">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase print:text-gray-600 print:text-[9px]">Room No</span>
                                            <span className="font-medium text-[#5a4a3a] print:text-black leading-tight text-right">{roomNo}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Service Time Tracking */}
                                <div>
                                    <h3 className="text-sm font-bold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-1.5 print:text-black print:text-xs">Time Tracking</h3>
                                    <div className="grid grid-cols-1 gap-4 p-4 rounded-lg border border-[#e5ddd5] print:border-black print:p-2.5 print:gap-2.5">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-bold text-[#5a4a3a] print:text-black whitespace-nowrap print:text-[11px]">Time In:</span>
                                            <span className="font-medium text-[#5a4a3a] print:text-black">{timeIn}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 pt-2 print:pt-0.5 border-t border-dashed border-[#e5ddd5] print:border-gray-300">
                                            <span className="font-bold text-[#5a4a3a] print:text-black whitespace-nowrap print:text-[11px]">Time Out:</span>
                                            <span className="font-medium text-[#5a4a3a] print:text-black">{timeOut}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="flex flex-col gap-6 print:gap-3 mt-6 print:mt-0">
                                {/* Services Ordered */}
                                <div>
                                    <h3 className="text-sm font-bold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-1.5 print:text-black print:text-xs">Services Ordered</h3>
                                    <div className="overflow-x-auto print:overflow-visible">
                                        <table className="w-full text-sm text-left border-collapse print:text-[11px]">
                                            <thead>
                                                <tr className="border-y-2 border-[#e5ddd5] text-[#7a6a5a] print:border-black print:text-black">
                                                    <th className="py-2 px-2 font-bold w-[50%] print:py-1 print:px-1.5">Service</th>
                                                    <th className="py-2 px-2 font-bold text-center w-[15%] print:py-1 print:px-1.5">Qty</th>
                                                    <th className="py-2 px-2 font-bold text-right w-[15%] print:py-1 print:px-1.5">Price</th>
                                                    <th className="py-2 px-2 font-bold text-right w-[20%] print:py-1 print:px-1.5">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[#5a4a3a] print:text-black">
                                                {cart.length > 0 ? cart.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-[#f5f1ed] print:border-gray-300">
                                                        <td className="py-2.5 px-2 print:py-1 print:px-1.5">
                                                            <p className="font-medium leading-tight">{item.name}</p>
                                                            <p className="text-xs text-[#7a6a5a] print:text-gray-600 mt-0.5 print:text-[9px]">{item.duration}</p>
                                                        </td>
                                                        <td className="py-2.5 px-2 text-center align-top print:py-1 print:px-1.5">{item.quantity}</td>
                                                        <td className="py-2.5 px-2 text-right align-top print:py-1 print:px-1.5">₱{item.price?.toLocaleString()}</td>
                                                        <td className="py-2.5 px-2 text-right font-medium align-top print:py-1 print:px-1.5">₱{(item.price * item.quantity).toLocaleString()}</td>
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
                                <div className="border-t-2 border-[#e5ddd5] pt-4 flex flex-col items-end print:border-black print:pt-2 print:mt-1 h-full justify-end">
                                    <div className="w-full sm:w-72 print:w-56 space-y-2 text-[#5a4a3a] print:text-black print:space-y-1 print:text-[11px]">
                                        <div className="flex justify-between text-sm print:text-[11px]">
                                            <span className="font-medium text-[#7a6a5a] print:text-gray-700">Subtotal:</span>
                                            <span className="font-medium">₱{basePrice.toLocaleString()}</span>
                                        </div>
                                        {hasDiscount && (
                                            <div className="flex justify-between text-sm text-green-600 print:text-gray-700 print:text-[11px]">
                                                <span className="font-medium">Discount ({feedbackDetails.discount?.percentage || customer.discount?.percentage}%):</span>
                                                <span className="font-medium">-₱{discountAmount.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm print:text-[11px]">
                                            <span className="font-medium text-[#7a6a5a] print:text-gray-700">Tip / Gratuity:</span>
                                            <span className="font-medium">₱{Number(tipAmount).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xl print:text-base font-bold text-[#5a4a3a] pt-3 border-t border-[#8b7355] mt-2 print:border-black print:text-black print:pt-1.5 print:mt-1">
                                            <span>Total:</span>
                                            <span>₱{finalTotal.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Payment Method Section */}
                                    <div className="w-full sm:w-72 print:w-56 mt-4 pt-4 border-t border-[#e5ddd5] print:border-gray-300 print:mt-2 print:pt-2">
                                        <div className="flex flex-col text-sm text-[#5a4a3a] print:text-black print:text-[10px]">
                                            <div className="flex justify-between items-start">
                                                <span className="font-bold text-[#7a6a5a] print:text-black uppercase tracking-wider text-xs print:text-[9px]">Payment Methods:</span>
                                                <span className="font-medium text-sm print:text-[10px] text-right break-words max-w-[60%]">
                                                    {displayPaymentMethodsStr}
                                                </span>
                                            </div>
                                            {pmNote && (
                                                <div className="mt-1 text-right text-xs text-gray-500 italic print:text-[9px] break-words">
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
                    <div className="text-center mt-8 pt-4 border-t border-[#f5f1ed] text-[#7a6a5a] print:border-black print:text-black print:mt-3 print:pt-2">
                        <p className="text-sm print:text-[10px] italic font-serif">Thank you for visiting Lema Filipino Spa.</p>
                        <p className="text-xs print:text-[9px] mt-1">This document serves as your service slip reference.</p>
                    </div>

                </div>
            </div>
        </div>
    );
}
