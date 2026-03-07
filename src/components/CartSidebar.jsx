import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

function CartSidebar({ 
  isOpen, 
  onClose, 
  cart, 
  onUpdateQuantity, 
  onRemoveItem, 
  onClearCart, 
  totalPrice,
  onCheckoutStart 
}) {
  const { toast } = useToast();

  const handleCheckout = () => {
    if (cart.length === 0) {
       toast({
         title: "Empty Cart",
         description: "Please add services before checking out.",
         variant: "destructive"
       });
       return;
    }
    onCheckoutStart();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="bg-[#8b7355] text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-6 w-6" />
                <h2 className="text-xl font-semibold">Cart</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="h-16 w-16 text-[#d4a574] mb-4" />
                  <p className="text-[#7a6a5a] text-lg">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-[#f5f1ed] rounded-lg p-4 border border-[#e5ddd5]"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#5a4a3a] mb-1">
                            {item.name}
                          </h4>
                          <p className="text-sm text-[#7a6a5a]">{item.duration}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveItem(item.id)}
                          className="h-8 w-8 text-[#7a6a5a] hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-white rounded-md border border-[#d4a574]">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8 text-[#8b7355] hover:bg-[#f5f1ed]"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium text-[#5a4a3a]">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 text-[#8b7355] hover:bg-[#f5f1ed]"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#8b7355]">
                            ₱{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-[#e5ddd5] p-6 bg-[#f5f1ed]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-[#5a4a3a]">Total</span>
                  <span className="text-2xl font-bold text-[#8b7355]">
                    ₱{totalPrice.toLocaleString()}
                  </span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-[#8b7355] hover:bg-[#7a6345] text-white mb-3"
                >
                  Proceed to next step
                </Button>
                <Button
                  onClick={onClearCart}
                  variant="outline"
                  className="w-full border-[#d4a574] text-[#8b7355] hover:bg-[#f5f1ed]"
                >
                  Clear Cart
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CartSidebar;