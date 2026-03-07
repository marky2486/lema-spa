import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

function ServiceCard({ service, onAddToCart }) {
  const { toast } = useToast();
  const { currentLanguage, t } = useLanguage();

  // Use the appropriate localized fields from Supabase schema
  const title = service[`name_${currentLanguage}`] || service.name_en || service.name || service.localizedName;
  const description = service[`description_${currentLanguage}`] || service.description_en || service.description || service.localizedDescription;

  const handleAddToCart = () => {
    onAddToCart({ ...service, name: title }); // Pass translated name for cart
    toast({
      title: t('addedToCart'),
      description: `${title} ${t('cartAddedDesc')}`,
      duration: 2000,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-[#e5ddd5] flex flex-col h-full"
    >
      {/* Image Container */}
      <div className="h-48 w-full overflow-hidden">
        {service.image ? (
          <img 
            src={service.image} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4 flex-grow">
          <h4 className="text-lg font-semibold text-[#5a4a3a] mb-2 leading-snug">
            {title}
          </h4>
          <p className="text-sm text-[#7a6a5a] leading-relaxed line-clamp-3">
            {description}
          </p>
        </div>

        <div className="mt-auto pt-4 border-t border-[#e5ddd5]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[#7a6a5a]">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">{service.duration || 'N/A'}</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-[#8b7355]">
                ₱{service.price?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          <Button
            onClick={handleAddToCart}
            className="w-full bg-[#8b7355] hover:bg-[#7a6345] text-white transition-colors duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addToCart')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default ServiceCard;