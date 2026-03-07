import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { countries } from '@/data/countries';
import { motion, AnimatePresence } from 'framer-motion';

export function CountrySelect({ value, onChange, placeholder = "Select country...", className, id }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Filter countries based on input
  const filteredCountries = countries.filter(country => 
    country.toLowerCase().includes(search.toLowerCase())
  );

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Ensure search reflects the actual selected value on blur if no new selection was made
        // But allowing free text might be desired? 
        // For now, let's keep the text as is to allow for custom entries or partials,
        // but ideally we sync back to value if we want strict mode. 
        // Given prompt "start typing to filter", usually implies selection.
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync internal search state with prop value changes
  useEffect(() => {
    if (value !== undefined) {
      setSearch(value);
    }
  }, [value]);

  const handleSelect = (countryName) => {
    onChange(countryName);
    setSearch(countryName);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange(newValue); // Update parent immediately to allow typing
    setIsOpen(true);
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        className="w-full"
        autoComplete="off"
      />
      <AnimatePresence>
        {isOpen && filteredCountries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
            className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredCountries.map((country) => (
              <div
                key={country}
                className={cn(
                  "px-4 py-2 text-sm cursor-pointer hover:bg-slate-100 flex items-center justify-between transition-colors",
                  value === country ? "bg-slate-50 text-[#8b7355] font-medium" : "text-slate-700"
                )}
                onClick={() => handleSelect(country)}
              >
                {country}
                {value === country && <Check className="h-4 w-4" />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}