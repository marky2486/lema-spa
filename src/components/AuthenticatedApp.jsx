import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, FileText, MessageSquare as MessageSquareHeart, LayoutDashboard, LogOut, User, Loader2, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import ServiceCard from '@/components/ServiceCard';
import CartSidebar from '@/components/CartSidebar';
import CheckoutForm from '@/components/CheckoutForm';
import OrderPreview from '@/components/OrderPreview';
import AdminDashboard from '@/components/AdminDashboard';
import HealthForm from '@/components/HealthForm';
import SatisfactionForm from '@/components/SatisfactionForm';
import LanguageSelector from '@/components/LanguageSelector';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useLanguage, LanguageProvider } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useServices } from '@/hooks/useServices';

const LEMA_LOGO_NAV = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/7a99cbbee4d7bc8eeac1957f646452aa.png";

function AuthenticatedAppContent() {
  const { user, signOut, role } = useAuth();
  const { toast } = useToast();
  const { t, currentLanguage } = useLanguage();
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentView, setCurrentView] = useState('catalog'); 
  const [orderData, setOrderData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const { services, loading: loadingCatalog, error: catalogError, refetch: refetchCatalog } = useServices();
  
  const [submissions, setSubmissions] = useState({
    orders: [],
    intakes: [],
    feedbacks: []
  });

  // Group services by category
  const catalogGrouped = useMemo(() => {
    return services.reduce((acc, curr) => {
      acc[curr.category] = acc[curr.category] || [];
      acc[curr.category].push(curr);
      return acc;
    }, {});
  }, [services]);

  const fetchSubmissions = async () => {
    setIsLoadingData(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;

      const { data: intakesData, error: intakesError } = await supabase
        .from('intakes')
        .select('*')
        .order('created_at', { ascending: false });

      if (intakesError) throw intakesError;

      const { data: feedbacksData, error: feedbacksError } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (feedbacksError) throw feedbacksError;

      setSubmissions({
        orders: ordersData.map(o => ({
          id: o.reference_id,
          dbId: o.id,
          type: 'order',
          customerName: o.customer_name,
          details: o.details,
          totalPrice: o.total_price,
          timestamp: o.created_at,
          status: o.status
        })),
        intakes: intakesData.map(i => ({
          id: i.reference_id,
          dbId: i.id,
          type: 'intake',
          customerName: i.customer_name,
          details: i.details,
          timestamp: i.created_at,
          status: i.status
        })),
        feedbacks: feedbacksData.map(f => ({
          id: f.reference_id,
          dbId: f.id,
          type: 'feedback',
          customerName: f.customer_name,
          details: f.details,
          timestamp: f.created_at,
          status: f.status
        }))
      });

    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Data Loading Error",
        description: "Could not load submission data. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (currentView === 'admin') {
      fetchSubmissions();
    }
  }, [currentView]);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const addToCart = (service) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === service.id);
      if (existing) {
        return prev.map(item =>
          item.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...service, quantity: 1 }];
    });
  };

  const removeFromCart = (serviceId) => {
    setCart(prev => prev.filter(item => item.id !== serviceId));
  };

  const updateQuantity = (serviceId, newQuantity) => {
    if (newQuantity === 0) {
      removeFromCart(serviceId);
    } else {
      setCart(prev =>
        prev.map(item =>
          item.id === serviceId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const submitOrder = async (formData) => {
    const orderNumber = "SRV-" + Math.floor(100000 + Math.random() * 900000);
    const baseTotalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let finalTotalPrice = baseTotalPrice;
    let discountDetails = null;

    if (formData.discount) {
        const discountAmount = (baseTotalPrice * formData.discount.percentage) / 100;
        finalTotalPrice = baseTotalPrice - discountAmount;
        discountDetails = formData.discount;
    }

    const newOrderDetails = {
      ...formData,
      cart: [...cart],
      baseTotalPrice,
      discount: discountDetails
    };

    try {
      const { error } = await supabase.from('orders').insert({
        reference_id: orderNumber,
        customer_name: formData.fullName,
        customer_email: formData.email,
        total_price: finalTotalPrice,
        status: 'Pending',
        details: newOrderDetails,
        therapist_id: formData.therapist_id || null
      });

      if (error) throw error;

      const newOrder = {
        id: orderNumber,
        type: 'order',
        customerName: formData.fullName,
        details: newOrderDetails,
        totalPrice: finalTotalPrice,
        timestamp: new Date().toISOString(),
        status: 'Pending'
      };
      
      setSubmissions(prev => ({
        ...prev,
        orders: [newOrder, ...prev.orders]
      }));
      
      setOrderData(newOrder);
      setCurrentView('preview');
      toast({ title: "Booking Confirmed", description: `Service ${orderNumber} has been successfully booked.` });

    } catch (error) {
      console.error("Order submission error:", error);
      toast({ title: "Booking Failed", description: "Failed to save booking to database.", variant: "destructive" });
    }
  };

  const submitHealthForm = async (formData) => {
    const id = "INT-" + Math.floor(100000 + Math.random() * 900000);
    const conditionsList = Object.keys(formData).filter(key => 
        ['highBloodPressure', 'backPain', 'allergies', 'recentSurgery', 'injuries', 'soreThroatCongestion', 'pregnancy', 'painArmLegNeck', 'peanutAllergy', 'coconutOilAllergy', 'otherAllergy'].includes(key) && 
        formData[key] === true
    );

    const details = {
        ...formData,
        conditions: conditionsList
    };

    try {
      const { error } = await supabase.from('intakes').insert({
        reference_id: id,
        customer_name: formData.clientName,
        status: 'New',
        details: details
      });

      if (error) throw error;

      const newIntake = {
        id,
        type: 'intake',
        customerName: formData.clientName,
        details,
        timestamp: new Date().toISOString(),
        status: 'New'
      };

      setSubmissions(prev => ({
        ...prev,
        intakes: [newIntake, ...prev.intakes]
      }));

      toast({ title: "Health Form Saved", description: "Patient health form recorded successfully." });

    } catch (error) {
      console.error("Health form submission error:", error);
      toast({ title: "Submission Failed", description: "Could not save health form.", variant: "destructive" });
    }
  };

  const submitFeedback = async (formData) => {
    const id = "FB-" + Math.floor(100000 + Math.random() * 900000);
    const details = {
        ...formData,
        rating: formData.overallRating,
        service: formData.serviceAvailed,
        comment: formData.enjoyedMost
    };

    try {
       const { error } = await supabase.from('feedbacks').insert({
          reference_id: id,
          customer_name: formData.guestName || "Anonymous",
          status: 'New',
          details: details,
          booking_id: formData.booking_id || null,
          tip_amount: formData.gratuityAmount || 0
       });

       if (error) throw error;

       const newFeedback = {
        id,
        type: 'feedback',
        customerName: formData.guestName || "Anonymous",
        details,
        timestamp: new Date().toISOString(),
        status: 'New'
      };

      setSubmissions(prev => ({
        ...prev,
        feedbacks: [newFeedback, ...prev.feedbacks]
      }));

    } catch (error) {
      console.error("Feedback submission error:", error);
      toast({ title: "Submission Failed", description: "Could not save feedback.", variant: "destructive" });
    }
  };

  const handleDeleteSubmission = async (type, id) => {
      const listKey = type + 's';
      const tableName = listKey;
      const itemToDelete = submissions[listKey].find(i => i.id === id);
      if (!itemToDelete) return;

      try {
          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', itemToDelete.dbId);

          if (error) throw error;

          if (submissions[listKey]) {
              setSubmissions(prev => ({
                  ...prev,
                  [listKey]: prev[listKey].filter(item => item.id !== id)
              }));
          }
          toast({ title: "Deleted", description: "Record removed permanently." });

      } catch (error) {
          console.error("Delete error:", error);
          toast({ title: "Delete Failed", description: "Could not remove record.", variant: "destructive" });
      }
  };

  const handleUpdateStatus = async (type, id, newStatus) => {
      const listKey = type + 's';
      const tableName = listKey;
      const itemToUpdate = submissions[listKey].find(i => i.id === id);
      if (!itemToUpdate) return;

      try {
          const { error } = await supabase
            .from(tableName)
            .update({ status: newStatus })
            .eq('id', itemToUpdate.dbId);

          if (error) throw error;

          setSubmissions(prev => ({
              ...prev,
              [listKey]: prev[listKey].map(item => 
                  item.id === id ? { ...item, status: newStatus } : item
              )
          }));

          toast({ title: "Status Updated", description: `Record marked as ${newStatus}.` });

      } catch (error) {
          console.error("Update error:", error);
          toast({ title: "Update Failed", description: "Could not update status.", variant: "destructive" });
      }
  };

  const startCheckout = () => {
    setIsCartOpen(false);
    setCurrentView('checkout');
  };

  const cancelCheckout = () => {
    setCurrentView('catalog');
  };

  const finishOrder = () => {
    clearCart();
    setOrderData(null);
    setCurrentView('catalog');
  };

  const proceedToHealthFormFromOrder = () => {
    clearCart();
    setOrderData(null);
    setCurrentView('intake');
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Extract all service names safely using localized fallback for dropdowns
  const allServiceNames = services.map(s => s[`name_${currentLanguage}`] || s.name_en || s.name || '');

  return (
      <div className="min-h-screen bg-[#f5f1ed] print:bg-white flex flex-col">
        <header className="bg-[#f5f1ed] text-[#5a4a3a] sticky top-0 z-40 shadow-sm border-b border-[#e2ddd8] print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <button 
                  className="flex items-center transition-all duration-300 hover:scale-105 active:scale-95" 
                  onClick={() => setCurrentView('catalog')}
                >
                  <img 
                    src={LEMA_LOGO_NAV} 
                    alt="Lema Filipino Spa logo" 
                    className="h-12 sm:h-14 w-auto object-contain"
                  />
                </button>
                <div className="hidden sm:flex items-center text-[10px] uppercase tracking-wider font-semibold bg-[#8b7355]/5 px-2.5 py-1 rounded-md border border-[#8b7355]/10 ml-4 text-[#8b7355]">
                    <User className="h-3 w-3 mr-1.5" />
                    {role ? role : 'User'}
                </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-1.5">
              <LanguageSelector />
              
              <Button
                 variant="ghost"
                 size="sm"
                 className={`text-[#7a6a5a] hover:text-[#5a4a3a] hover:bg-[#8b7355]/10 gap-2 px-2 sm:px-4 transition-colors ${currentView === 'satisfaction' ? 'bg-[#8b7355]/10 text-[#5a4a3a]' : ''}`}
                 onClick={() => setCurrentView('satisfaction')}
                 title={t('feedback')}
              >
                 <MessageSquareHeart className="h-4.5 w-4.5 text-rose-500" />
                 <span className="hidden lg:inline text-sm font-medium">{t('feedback')}</span>
              </Button>

              <Button
                 variant="ghost"
                 size="sm"
                 className={`text-[#7a6a5a] hover:text-[#5a4a3a] hover:bg-[#8b7355]/10 gap-2 px-2 sm:px-4 transition-colors ${currentView === 'intake' ? 'bg-[#8b7355]/10 text-[#5a4a3a]' : ''}`}
                 onClick={() => setCurrentView('intake')} 
                 title={t('healthForm')}
              >
                 <FileText className="h-4.5 w-4.5 text-emerald-600" />
                 <span className="hidden lg:inline text-sm font-medium">{t('healthForm')}</span>
              </Button>

              <Button
                 variant="ghost"
                 size="sm"
                 className={`text-[#7a6a5a] hover:text-[#5a4a3a] hover:bg-[#8b7355]/10 gap-2 px-2 sm:px-4 transition-colors ${currentView === 'admin' ? 'bg-[#8b7355]/10 text-[#5a4a3a]' : ''}`}
                 onClick={() => setCurrentView(currentView === 'admin' ? 'catalog' : 'admin')}
                 title={t('submissions')}
              >
                 <LayoutDashboard className="h-4.5 w-4.5 text-amber-600" />
                 <span className="hidden lg:inline text-sm font-medium">{t('submissions')}</span>
              </Button>

              {currentView === 'catalog' && (
                <Button
                  variant="outline"
                  size="icon"
                  className="relative bg-[#8b7355]/5 hover:bg-[#8b7355]/10 border-[#8b7355]/20 text-[#5a4a3a] ml-2 transition-all duration-200"
                  onClick={() => setIsCartOpen(true)}
                >
                  <ShoppingCart className="h-5 w-5 text-sky-600" />
                  {totalItems > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center shadow-md"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </Button>
              )}

              <div className="w-px h-8 bg-[#8b7355]/20 mx-2 hidden sm:block" />

              <Button 
                 variant="ghost" 
                 size="icon" 
                 className="text-[#7a6a5a] hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                 onClick={() => signOut()}
                 title={t('signOut')}
              >
                  <LogOut className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:max-w-none print:mx-0 print:p-0">
          <AnimatePresence mode="wait">
            {currentView === 'catalog' && (
              <motion.div
                key="catalog"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="print:hidden"
              >
                <div className="mb-8 flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#5a4a3a] mb-2 tracking-tight">{t('catalog')}</h2>
                    <p className="text-[#7a6a5a]">{t('catalogDesc')}</p>
                  </div>
                </div>

                {loadingCatalog ? (
                   <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-[#8b7355]" />
                      <p className="text-[#7a6a5a]">Loading services from database...</p>
                   </div>
                ) : catalogError ? (
                   <div className="bg-white rounded-xl border border-red-100 p-8 flex flex-col items-center justify-center text-center shadow-sm max-w-md mx-auto mt-12">
                     <p className="text-red-500 mb-4">{catalogError}</p>
                     <Button onClick={refetchCatalog} variant="outline" className="gap-2 border-red-200 hover:bg-red-50 text-red-600">
                       <RefreshCcw className="h-4 w-4" /> Retry
                     </Button>
                   </div>
                ) : Object.keys(catalogGrouped).length === 0 ? (
                    <div className="text-center text-gray-500 py-10 bg-white rounded-xl border border-dashed border-gray-300">
                        No services available in the catalog.
                    </div>
                ) : (
                  <div className="space-y-12">
                    {Object.entries(catalogGrouped).map(([category, items]) => (
                      <section key={category}>
                        <h3 className="text-lg sm:text-xl font-semibold text-[#5a4a3a] mb-6 pb-2 border-b-2 border-[#d4a574]/40">
                          {category}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {items.map((service) => (
                            <ServiceCard
                              key={service.id}
                              service={service}
                              onAddToCart={addToCart}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {currentView === 'checkout' && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="print-hidden"
              >
                <CheckoutForm 
                  cart={cart}
                  totalPrice={totalPrice}
                  onCancel={cancelCheckout}
                  onSubmit={submitOrder}
                />
              </motion.div>
            )}

            {currentView === 'preview' && orderData && (
               <motion.div
                 key="preview"
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.9 }}
               >
                 <OrderPreview 
                   orderNumber={orderData.id}
                   customerDetails={orderData.details}
                   cart={orderData.details.cart}
                   totalPrice={orderData.totalPrice}
                   onClose={finishOrder}
                   onProceedToHealthForm={proceedToHealthFormFromOrder}
                   onSubmitFeedback={submitFeedback}
                 />
               </motion.div>
            )}

            {currentView === 'admin' && (
               <motion.div
                 key="admin"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
               >
                 <AdminDashboard 
                    submissions={submissions} 
                    onDeleteSubmission={handleDeleteSubmission}
                    onUpdateStatus={handleUpdateStatus}
                 />
               </motion.div>
            )}

            {currentView === 'intake' && (
               <AnimatePresence>
                 <HealthForm
                    onClose={() => setCurrentView('catalog')} 
                    onSubmit={submitHealthForm}
                 />
               </AnimatePresence>
            )}

            {currentView === 'satisfaction' && (
               <AnimatePresence>
                  <SatisfactionForm 
                     services={allServiceNames}
                     onClose={() => setCurrentView('catalog')}
                     onSubmit={submitFeedback}
                  />
               </AnimatePresence>
            )}
          </AnimatePresence>
        </main>

        <CartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          totalPrice={totalPrice}
          onCheckoutStart={startCheckout}
        />
      </div>
  );
}

function AuthenticatedApp() {
  return (
    <LanguageProvider>
      <AuthenticatedAppContent />
    </LanguageProvider>
  );
}

export default AuthenticatedApp;