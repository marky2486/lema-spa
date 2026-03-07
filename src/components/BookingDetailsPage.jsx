
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import PrintHeader from './PrintHeader';

const LEMA_LOGO = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/d1952d3bda1cba2e721a0a8c399d7c46.png";

export default function BookingDetailsPage() {
    const { reference_id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDetails() {
            try {
                const [orderRes, feedbackRes] = await Promise.all([
                    supabase.from('orders').select('*, therapists(*)').eq('reference_id', reference_id).single(),
                    supabase.from('feedbacks').select('*').eq('booking_id', reference_id).maybeSingle()
                ]);
                
                if (orderRes.error) {
                    console.error("Supabase Error fetching order:", orderRes.error);
                } else if (orderRes.data) {
                    setOrder(orderRes.data);
                }

                if (feedbackRes.error) {
                    console.error("Supabase Error fetching feedback:", feedbackRes.error);
                } else if (feedbackRes.data) {
                    setFeedback(feedbackRes.data);
                }
            } catch (e) {
                console.error("Caught error fetching booking details:", e);
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
    const tipAmount = feedback?.tip_amount || 0;
    
    // Extract contact information handling various possible structures in the jsonb
    const displayEmail = order.customer_email || details.email || customer.email || 'N/A';
    const displayPhone = details.phone_number || details.phone || customer.phone || 'N/A';
    const displayCountry = details.country || customer.country || 'N/A';
    
    // Extract Guest Type and Room No from feedback
    const feedbackDetails = feedback?.details || {};
    const guestType = feedbackDetails.guestType;
    const roomNo = feedbackDetails.roomNo;
    
    // Extract therapist name correctly
    let therapistName = 'Not assigned';
    if (order.therapists && order.therapists.name) {
        therapistName = order.therapists.name;
    } else if (order.therapist_id) {
        therapistName = 'Assigned (Name missing)';
    } else if (details.therapistName || feedbackDetails.therapistName) {
        therapistName = details.therapistName || feedbackDetails.therapistName;
    }
    
    // Calculate totals
    const basePrice = customer.baseTotalPrice || order.total_price;
    const hasDiscount = !!customer.discount;
    const discountAmount = hasDiscount ? basePrice - order.total_price : 0;
    const finalTotal = Number(order.total_price) + Number(tipAmount);

    return (
        <div className="min-h-screen bg-[#f5f1ed] p-4 sm:p-8 print:bg-white print:p-0">
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
            <div className="max-w-3xl mx-auto print:max-w-none print:w-full print:max-h-[5.5in] print:overflow-hidden print:flex print:flex-col">
                {/* Actions */}
                <div className="flex justify-between items-center mb-6 print:hidden shrink-0">
                    <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 border-[#d4a574] text-[#5a4a3a] hover:bg-[#fdfbf7]">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button onClick={() => window.print()} className="bg-[#8b7355] hover:bg-[#7a6345] text-white gap-2">
                        <Printer className="w-4 h-4" /> Print Details
                    </Button>
                </div>

                {/* Receipt Card */}
                <div className="bg-white p-8 rounded-xl shadow-lg border border-[#e5ddd5] print:shadow-none print:border-none print:p-0 print:flex print:flex-row print:gap-4 print:h-[5.5in]">
                    
                    {/* Left Column for Print Landscape */}
                    <div className="print:w-[45%] print:flex print:flex-col print:border-r print:border-gray-200 print:pr-4">
                        <PrintHeader title="Booking Details" logo={LEMA_LOGO} guestType={guestType} roomNo={roomNo} therapistName={therapistName} landscape={true} />
                        
                        {/* Header Info */}
                        <div className="mb-6 print:mb-2 border-b-2 border-[#f5f1ed] print:border-gray-300 pb-4 print:pb-2 mt-4 print:mt-1">
                            <h2 className="text-2xl font-mono font-bold text-[#5a4a3a] print:text-[14px]">Ref: {order.reference_id}</h2>
                            <p className="text-[#7a6a5a] print:text-[11px]">Date: {new Date(order.created_at).toLocaleDateString()}</p>
                        </div>

                        {/* Customer Info */}
                        <div className="mb-6 print:mb-2 print:flex-grow">
                            <h3 className="text-sm font-semibold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-1 print:text-[10px] print:text-black">Customer Information</h3>
                            <div className="grid grid-cols-1 gap-2 text-sm text-[#5a4a3a] print:text-[11px] print:gap-1">
                                <p><span className="font-semibold w-20 inline-block">Name:</span> {order.customer_name}</p>
                                <p><span className="font-semibold w-20 inline-block print:hidden">Email:</span> <span className="print:hidden">{displayEmail}</span></p>
                                <p><span className="font-semibold w-20 inline-block print:hidden">Phone:</span> <span className="print:hidden">{displayPhone}</span></p>
                                <p><span className="font-semibold w-20 inline-block">Country:</span> {displayCountry}</p>
                            </div>
                        </div>

                        {/* Manual Time Tracking Section */}
                        <div className="mb-6 bg-[#fdfbf7] p-4 rounded-xl border-2 border-[#e5ddd5] print:bg-transparent print:border-gray-300 print:p-2 print:mb-2">
                            <h3 className="text-sm font-semibold text-[#7a6a5a] uppercase tracking-wider mb-4 print:mb-2 print:text-[10px] print:text-black">Service Time Tracking</h3>
                            <div className="grid grid-cols-1 gap-4 print:gap-2">
                                <div className="flex items-end gap-2">
                                    <span className="text-sm font-bold text-[#5a4a3a] whitespace-nowrap print:text-[11px]">Time In:</span>
                                    <div className="border-b border-[#8b7355] flex-grow h-4 print:border-gray-500"></div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-sm font-bold text-[#5a4a3a] whitespace-nowrap print:text-[11px]">Time Out:</span>
                                    <div className="border-b border-[#8b7355] flex-grow h-4 print:border-gray-500"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column for Print Landscape */}
                    <div className="print:w-[55%] print:flex print:flex-col">
                        {/* Services Table */}
                        <div className="mb-6 print:mb-2 print:flex-grow">
                            <h3 className="text-sm font-semibold text-[#7a6a5a] uppercase tracking-wider mb-3 print:mb-1 print:text-[10px] print:text-black print:hidden">Services Ordered</h3>
                            <div className="overflow-hidden">
                                <table className="w-full text-left border-collapse print:text-[11px]">
                                    <thead>
                                        <tr className="border-b border-[#f5f1ed] text-[#7a6a5a] text-sm print:text-[10px] print:border-gray-300">
                                            <th className="pb-2 font-medium w-1/2 print:pb-1">Service</th>
                                            <th className="pb-2 font-medium text-center w-[15%] print:pb-1">Qty</th>
                                            <th className="pb-2 font-medium text-right w-[15%] print:pb-1">Price</th>
                                            <th className="pb-2 font-medium text-right w-[20%] print:pb-1">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[#5a4a3a]">
                                        {cart.map((item, i) => (
                                            <tr key={i} className="border-b border-[#f5f1ed] print:border-gray-100">
                                                <td className="py-2 print:py-1">
                                                    <p className="font-medium print:font-semibold leading-tight">{item.name}</p>
                                                    <p className="text-xs text-[#7a6a5a] mt-0.5 print:text-[9px]">{item.duration}</p>
                                                </td>
                                                <td className="py-2 text-center print:py-1">{item.quantity}</td>
                                                <td className="py-2 text-right print:py-1">₱{item.price?.toLocaleString()}</td>
                                                <td className="py-2 text-right font-medium print:py-1">₱{(item.price * item.quantity).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals Section */}
                        <div className="border-t border-[#f5f1ed] pt-4 print:pt-2 flex flex-col items-end print:border-gray-300">
                            <div className="w-full sm:w-64 print:w-full space-y-2 print:space-y-1">
                                <div className="flex justify-between text-sm text-[#7a6a5a] print:text-[11px] print:text-gray-600">
                                    <span>Subtotal:</span>
                                    <span>₱{basePrice.toLocaleString()}</span>
                                </div>
                                
                                {hasDiscount && (
                                    <div className="flex justify-between text-sm text-green-600 font-medium print:text-[11px]">
                                        <span>Discount ({customer.discount.percentage}%):</span>
                                        <span>-₱{discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                
                                {tipAmount > 0 && (
                                    <div className="flex justify-between text-sm text-[#8b7355] font-medium bg-[#fdfbf7] -mx-2 px-2 py-1 rounded print:bg-transparent print:p-0 print:m-0 print:text-[11px] print:text-black">
                                        <span>Tip:</span>
                                        <span>₱{Number(tipAmount).toLocaleString()}</span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between text-lg font-bold text-[#5a4a3a] pt-2 border-t border-[#8b7355] print:text-[14px] print:pt-1 print:border-black">
                                    <span>Total:</span>
                                    <span className="text-[#8b7355] print:text-black">₱{finalTotal.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Footer */}
                        <div className="text-center mt-6 pt-4 border-t border-[#e5ddd5] print:border-none print:mt-auto print:pt-2 text-[#7a6a5a]">
                            <p className="text-sm italic print:text-[10px]">Thank you for choosing Lema Filipino Spa.</p>
                            <p className="text-xs mt-1 print:text-[9px]">This document serves as your booking reference.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
