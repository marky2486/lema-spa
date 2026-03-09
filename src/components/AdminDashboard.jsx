import React, { useState, useEffect } from 'react';
import { X, Eye, Clock, CheckCircle2, AlertCircle, Printer, Star, Coffee, Trash2, Shield, Users, Gift, Tag, Package, UserCog, Loader2, MessageSquare } from 'lucide-react';
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
import FeedbackReviewModal from '@/components/FeedbackReviewModal.jsx';
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
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 font-medium border-0">
        Submitted{feedback.tip_amount > 0 ? ` - ₱${feedback.tip_amount} tip` : ''}
      </Badge>
    );
  }

  return (
    <Badge className="bg-gray-100 text-gray-800 border-0 hover:bg-gray-100 font-medium">
      Pending
    </Badge>
  );
};

const AdminDashboard = ({ submissions, onDeleteSubmission, onUpdateStatus }) => {
  const { role } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedFeedbackForReview, setSelectedFeedbackForReview] = useState(null);
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
    return (
      <Badge className={`${styles[status] || 'bg-gray-100 text-gray-800'} border-0 font-medium`}>
        {status}
      </Badge>
    );
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
          className={`h-3 w-3 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );

  const HealthFormDetailsModal = ({ intake, onClose }) => {
    if (!intake) return null;
    const { details } = intake;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Health Form Details</h2>
              <p className="text-sm text-gray-500 font-mono">Ref: {intake.reference_id || intake.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client Name</p>
                <p className="text-lg font-medium text-gray-900">{details.clientName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Guest Details</p>
                <p className="text-lg font-medium text-gray-900">
                  {details.guestType ? (
                    <>
                      {details.guestType}
                      {details.roomNumber && <span className="ml-2 text-gray-500 text-sm font-normal">(Rm {details.roomNumber})</span>}
                    </>
                  ) : details.roomNumber || 'N/A'}
                </p>
              </div>
              {details.therapist && (
                <div className="col-span-2 space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned Therapist</p>
                  <p className="text-lg font-medium text-gray-900">{details.therapist}</p>
                </div>
              )}
            </div>

            <section>
              <h3 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b uppercase tracking-widest">Medical Conditions</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(details).map(([key, value]) => {
                  if (value === true && !['agreement', 'bodyMapImage'].includes(key)) {
                    return (
                      <div key={key} className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
              <div className="mt-4 space-y-3">
                {details.recentSurgeryDetails && (
                  <p className="text-sm"><span className="font-semibold text-gray-700">Surgery:</span> {details.recentSurgeryDetails}</p>
                )}
                {details.injuriesDetails && (
                  <p className="text-sm"><span className="font-semibold text-gray-700">Injuries:</span> {details.injuriesDetails}</p>
                )}
                {details.painDetails && (
                  <p className="text-sm"><span className="font-semibold text-gray-700">Pain Areas:</span> {details.painDetails}</p>
                )}
                {details.otherAllergyDetails && (
                  <p className="text-sm"><span className="font-semibold text-gray-700">Other Allergies:</span> {details.otherAllergyDetails}</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b uppercase tracking-widest">Body Map Areas</h3>
              <div className="relative aspect-[3/4] max-w-sm mx-auto bg-gray-50 rounded-xl border border-dashed border-gray-300 overflow-hidden">
                <img src={BODY_DIAGRAM_URL} alt="Body Figure Base" className="absolute inset-0 w-full h-full object-contain opacity-40" />
                {details.bodyMapImage ? (
                  <img src={details.bodyMapImage} alt="Client Marks Overlay" className="absolute inset-0 w-full h-full object-contain z-10" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-gray-400 text-sm">No marks recorded</p>
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-gray-500 mt-4 italic">Red marks indicate areas to avoid.</p>
            </section>
          </div>

          <div className="border-t p-6 bg-gray-50 flex justify-end">
            <Button onClick={onClose} variant="secondary">Close Details</Button>
          </div>
        </motion.div>
      </div>
    );
  };

  const OrderDetailsModal = ({ order, onClose }) => {
    const { feedback } = useBookingFeedback(order?.id, order?.reference_id);
    const [fetchedOrder, setFetchedOrder] = useState(order);

    useEffect(() => {
      const fetchFullOrderAndTherapist = async () => {
        const orderRef = order?.reference_id || order?.id || order?.booking_id || order?.order_id;
        if (!orderRef) return;

        try {
          let query = supabase.from('orders').select('*');
          if (isUUID(orderRef)) {
            query = query.eq('id', orderRef);
          } else {
            query = query.eq('reference_id', orderRef);
          }

          const { data: orderData, error: orderError } = await query.single();
          if (orderError) throw orderError;

          let mergedOrder = { ...orderData };
          const targetTherapistId = orderData.therapist_id || orderData.details?.therapist_id || orderData.details?.therapist?.id;

          if (targetTherapistId) {
            const { data: therapistData } = await supabase
              .from('therapists')
              .select('*')
              .eq('id', targetTherapistId)
              .single();
            if (therapistData) {
              mergedOrder.therapist = therapistData;
              mergedOrder.therapists = therapistData;
            }
          }
          setFetchedOrder(mergedOrder);
        } catch (err) {
          console.error(`fetchFullOrderAndTherapist failed:`, err);
          setFetchedOrder(order);
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

    const feedbackDetails = (() => {
      if (!feedback?.details) return {};
      if (typeof feedback.details === 'string') {
        try {
          return JSON.parse(feedback.details);
        } catch(e) {
          return {};
        }
      }
      return feedback.details;
    })();

    // Robust extraction for guest type and room number
    const rawGuestType = feedbackDetails?.guest_type || feedbackDetails?.guestType || fetchedOrder?.guest_type || fetchedOrder?.guestType || details?.guest_type || details?.guestType || customerDetails?.guestType || customerDetails?.guest_type || fetchedOrder?.customerDetails?.guestType || "";
    const rawRoomNo = feedbackDetails?.room_no || feedbackDetails?.roomNo || feedbackDetails?.room_number || fetchedOrder?.room_no || fetchedOrder?.roomNo || fetchedOrder?.room_number || details?.room_no || details?.roomNo || details?.roomNumber || details?.room_number || customerDetails?.roomNo || customerDetails?.room_no || customerDetails?.roomNumber || fetchedOrder?.customerDetails?.roomNo || "";
    const guestType = rawGuestType || "N/A";
    const roomNo = rawRoomNo || "N/A";

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

    let rawPmArray = [];
    if (fetchedOrder?.payment_methods && ensureArray(fetchedOrder.payment_methods).length > 0) {
      rawPmArray = fetchedOrder.payment_methods;
    } else if (details?.payment_methods && ensureArray(details.payment_methods).length > 0) {
      rawPmArray = details.payment_methods;
    } else if (details?.paymentMethods && ensureArray(details.paymentMethods).length > 0) {
      rawPmArray = details.paymentMethods;
    } else if (customerDetails?.payment_methods && ensureArray(customerDetails.payment_methods).length > 0) {
      rawPmArray = customerDetails.payment_methods;
    } else if (fetchedOrder?.payment_method && ensureArray(fetchedOrder.payment_method).length > 0) {
      rawPmArray = fetchedOrder.payment_method;
    }
    const pmArray = ensureArray(rawPmArray);
    const pmNote = fetchedOrder?.payment_method_note || details?.payment_method_note || customerDetails?.payment_method_note || "";
    const displayTherapistName = fetchedOrder?.therapist?.name || fetchedOrder?.therapists?.name || details?.therapistName || order?.therapist?.name || "Not assigned";

    const timeIn = feedbackDetails?.timeIn || "-";
    const timeOut = feedbackDetails?.timeOut || "-";

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <style>
          {`
            @media print {
              @page { size: letter landscape; margin: 0.5in; }
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; background-color: white !important; }
            }
          `}
        </style>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Service Slip Preview</h2>
              <p className="text-sm text-gray-500 font-mono">Ref: {fetchedOrder.reference_id || order.id || order.reference_id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8" id="printable-area">
            <div className="max-w-4xl mx-auto space-y-8">
              <PrintHeader
                logo={LEMA_LOGO}
                therapist={displayTherapistName}
                paymentMethods={pmArray}
                paymentNote={pmNote}
              />

              <div className="border-b border-gray-100 pb-2 mb-6">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-mono text-gray-400">Ref: {fetchedOrder.reference_id || order.id || order.reference_id}</span>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Date</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(fetchedOrder.created_at || order.timestamp || order.created_at)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-[10px] font-bold text-gray-900 mb-4 pb-2 border-b uppercase tracking-widest">Customer Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Name</span>
                        <span className="text-xs font-semibold text-gray-900">{fetchedOrder.customer_name || order.customerName || order.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Email</span>
                        <span className="text-xs font-semibold text-gray-900">{details.email || fetchedOrder.customer_email || order.customer_email || "\u00A0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Phone</span>
                        <span className="text-xs font-semibold text-gray-900">{details.phone || "\u00A0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Country</span>
                        <span className="text-xs font-semibold text-gray-900">{details.country || "\u00A0"}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-50">
                        <span className="text-xs text-gray-500">Guest Type</span>
                        <span className="text-xs font-semibold text-gray-900">{guestType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Room No</span>
                        <span className="text-xs font-semibold text-gray-900">{roomNo}</span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-bold text-gray-900 mb-4 pb-2 border-b uppercase tracking-widest">Time Tracking</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-[9px] uppercase tracking-tighter text-gray-400 font-bold mb-1">Time In:</p>
                        <p className="text-sm font-mono font-bold text-gray-900">{timeIn}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-[9px] uppercase tracking-tighter text-gray-400 font-bold mb-1">Time Out:</p>
                        <p className="text-sm font-mono font-bold text-gray-900">{timeOut}</p>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section>
                    <h3 className="text-[10px] font-bold text-gray-900 mb-4 pb-2 border-b uppercase tracking-widest">Services Ordered</h3>
                    <div className="overflow-hidden border border-gray-100 rounded-lg">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-3 py-2 text-[9px] font-bold uppercase text-gray-500">Service</th>
                            <th className="px-3 py-2 text-[9px] font-bold uppercase text-gray-500 text-center">Qty</th>
                            <th className="px-3 py-2 text-[9px] font-bold uppercase text-gray-500 text-right">Price</th>
                            <th className="px-3 py-2 text-[9px] font-bold uppercase text-gray-500 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {cart.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-[11px] text-gray-900 leading-tight">
                                <span className="font-semibold block">{item.name}</span>
                                <span className="text-gray-400 text-[10px]">{item.duration}</span>
                              </td>
                              <td className="px-3 py-2 text-[11px] text-center font-medium">{item.quantity}</td>
                              <td className="px-3 py-2 text-[11px] text-right">₱{item.price?.toLocaleString()}</td>
                              <td className="px-3 py-2 text-[11px] text-right font-bold">₱{(item.price * item.quantity).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 space-y-3">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal:</span>
                      <span className="font-medium text-gray-900">₱{basePrice.toLocaleString()}</span>
                    </div>
                    {hasDiscount && (
                      <div className="flex justify-between text-xs text-red-600 font-medium">
                        <span>{details.discount.percentage === 28.5714 ? 'SC Discount – VAT‑Exempt' : `Discount (${details.discount.percentage}%)`}:</span>
                        <span>-₱{discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Tip / Gratuity:</span>
                      <span className="font-medium text-gray-900">₱{Number(tipAmount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="text-sm font-bold text-gray-900 uppercase tracking-tighter">Total:</span>
                      <span className="text-xl font-black text-gray-900">₱{finalTotal.toLocaleString()}</span>
                    </div>
                  </section>
                </div>
              </div>

              <div className="pt-12 mt-12 border-t border-gray-100 text-center space-y-2 pb-8">
                <p className="text-xs font-medium text-gray-900 uppercase tracking-widest">Thank you for choosing Lema Filipino Spa.</p>
                <p className="text-[10px] text-gray-400">This document serves as your booking reference.</p>
              </div>
            </div>
          </div>

          <div className="border-t p-6 bg-gray-50 flex justify-end shrink-0">
            <Button onClick={onClose} variant="secondary">Close Details</Button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('submissions') || 'Admin Dashboard'}</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            Logged in as <Badge variant="secondary" className="capitalize">{role}</Badge>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 bg-gray-50 p-1.5 rounded-xl border border-gray-200 w-fit">
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
            <div className="w-px h-6 bg-gray-200 self-center mx-1" />
            <button
              key="services"
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
              <Package className="h-4 w-4" />
              Products
            </button>
            <button
              key="gift-cards"
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
              <Gift className="h-4 w-4" />
              Gift Cards
            </button>
            <button
              key="therapists"
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
              <Users className="h-4 w-4" />
              Therapists
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
              <UserCog className="h-4 w-4" />
              Management
            </button>
          </>
        )}
      </div>

      {activeTab === 'services' && isAdmin ? (
        <ServicesManager />
      ) : activeTab === 'management' && isAdmin ? (
        <ManagementPage />
      ) : activeTab === 'feedbacks' && isAdmin ? (
        <FeedbackReviewModal feedbacks={feedbacks} onRefresh={fetchFeedbacks} isLoadingFeedbacks={isLoadingFeedbacks} />
      ) : activeTab === 'gift-cards' && isAdmin ? (
        <GiftCardsPage />
      ) : activeTab === 'therapists' && isAdmin ? (
        <TherapistManager />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Reference ID</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Total</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Rating</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Feedback</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">{activeTab === 'orders' ? 'Print' : 'Action'}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">FB Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4 text-sm font-mono text-gray-500">
                          {item.booking_id || item.reference_id || item.id}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">
                            {item.customerName || item.customer_name || detailsObj?.guestName || 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(item.timestamp || item.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">₱{item.totalPrice?.toLocaleString()}</span>
                            {detailsObj?.discount && (
                              <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md w-fit mt-1">
                                {detailsObj.discount.percentage === 28.5714 ? 'SC Discount – VAT‑Exempt' : `${detailsObj.discount.percentage}%`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {detailsObj?.overallRating ? (
                            <div className="flex flex-col gap-1">
                              <StarRating rating={detailsObj.overallRating} />
                              <span className="text-[10px] text-gray-400 font-medium">{detailsObj.overallRating} / 5</span>
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          {activeTab === 'orders' ? (
                            <BookingStatusCell item={item} />
                          ) : (
                            renderStatusBadge(item.status || 'Completed')
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <FeedbackCell item={item} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2"
                              onClick={() => setSelectedItem(item)}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDelete(e, item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-2"
                            onClick={() => setSelectedFeedbackForReview(item)}
                          >
                            <MessageSquare className="h-4 w-4" />
                            FB Review
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedItem && activeTab === 'intakes' && (
        <HealthFormDetailsModal intake={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
      {selectedItem && activeTab === 'orders' && (
        <OrderDetailsModal order={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
      {selectedItem && activeTab === 'feedbacks' && (
        <FeedbackPrintModal
          feedback={selectedItem}
          onClose={() => setSelectedItem(null)}
          allOrders={submissions?.orders || []}
        />
      )}
      {selectedFeedbackForReview && activeTab === 'feedbacks' && (
        <FeedbackReviewModal
          isOpen={true}
          onClose={() => setSelectedFeedbackForReview(null)}
          specificFeedback={selectedFeedbackForReview}
          onRefresh={fetchFeedbacks}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
