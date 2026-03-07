
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Eraser, PenTool, X, RefreshCw, Search, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/customSupabaseClient';
import PrintHeader from './PrintHeader';

export const BODY_DIAGRAM_URL = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/98955f0a88244c3fcf168145a115e104.png";
const LEMA_LOGO = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/d1952d3bda1cba2e721a0a8c399d7c46.png";

function HealthForm({ onClose, onSubmit, isPublic = false }) {
  const [currentStep, setCurrentStep] = useState(1);
  const initialFormData = {
    clientName: '',
    guestType: '',
    roomNumber: '',
    therapist: '',
    highBloodPressure: false,
    backPain: false,
    soreThroatCongestion: false,
    pregnancy: false,
    allergies: false,
    peanutAllergy: false,
    coconutOilAllergy: false,
    otherAllergy: false,
    otherAllergyDetails: '',
    recentSurgery: false,
    recentSurgeryDetails: '',
    injuries: false,
    injuriesDetails: '',
    painArmLegNeck: false,
    painDetails: '',
    agreement: false,
    bodyMapImage: null,
  };
  
  const [formData, setFormData] = useState(initialFormData);
  const [serviceId, setServiceId] = useState('');
  const [guestOptions, setGuestOptions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [therapistOptions, setTherapistOptions] = useState([]);
  
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState('draw');
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 320, height: 320 });

  const fetchSuggestions = async (query = '') => {
    try {
        let queryBuilder = supabase
            .from('orders')
            .select('reference_id, customer_name, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
        if (query && query.trim().length > 0) {
            queryBuilder = queryBuilder.or(`customer_name.ilike.%${query}%,reference_id.ilike.%${query}%`);
        }
        const { data, error } = await queryBuilder;
        if (error) throw error;
        if (data) setSuggestions(data);
    } catch (err) {
        console.error("Error fetching suggestions:", err);
    }
  };

  const fetchTherapists = async () => {
    try {
        const { data, error } = await supabase.from('therapists').select('name').order('name');
        if (error) throw error;
        setTherapistOptions(data || []);
    } catch (err) {
        console.error("Error fetching therapists:", err);
    }
  };

  useEffect(() => {
    fetchSuggestions('');
    fetchTherapists();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
        if (showSuggestions && !event.target.closest('.service-id-container')) {
            setShowSuggestions(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  useEffect(() => {
    if (currentStep === 3 && containerRef.current) {
        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                setCanvasDimensions({ width: clientWidth, height: Math.max(300, clientHeight - 80) });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 3 && canvasRef.current && formData.bodyMapImage) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = formData.bodyMapImage;
    }
  }, [currentStep, formData.bodyMapImage, canvasDimensions]); 

  const handleServiceIdChange = (e) => {
      const value = e.target.value;
      setServiceId(value);
      setShowSuggestions(true);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const performServiceLookup = async (idToSearch) => {
      if (!idToSearch || !idToSearch.trim()) {
          toast({ title: "Input Required", description: "Please enter a valid Service ID.", variant: "destructive" });
          return;
      }
      setIsSearching(true);
      setGuestOptions([]);
      setFormData(prev => ({ ...prev, clientName: '' })); 

      try {
          const { data, error } = await supabase.from('orders').select('details').eq('reference_id', idToSearch.trim()).single();
          if (error) {
              const isRLS = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
              if (isRLS) toast({ title: "Permission Denied", description: "You do not have permission to look up services.", variant: "destructive" });
              else throw error;
          } else if (!data) {
              toast({ title: "Service ID Not Found", description: "The service ID doesn't exist or is not available.", variant: "destructive" });
          } else {
              const mainGuest = data.details.fullName;
              const companions = data.details.companions || [];
              const names = [mainGuest, ...companions.map(c => c.fullName)].filter(name => name && name.trim() !== '');
              if (names.length > 0) {
                  setGuestOptions(names);
                  if (names.length === 1) setFormData(prev => ({ ...prev, clientName: names[0] }));
                  toast({ title: "Booking Found", description: "Please select your name from the list." });
              } else {
                  toast({ title: "Error", description: "No guest names found in this booking.", variant: "destructive" });
              }
          }
      } catch (err) {
          console.error("Search error:", err);
          toast({ title: "Error", description: "Failed to look up service ID.", variant: "destructive" });
      } finally {
          setIsSearching(false);
      }
  };

  const handleSuggestionClick = (suggestion) => {
      setServiceId(suggestion.reference_id);
      setShowSuggestions(false);
      performServiceLookup(suggestion.reference_id);
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = drawMode === 'draw' ? 3 : 25; 
    ctx.lineCap = 'round';
    ctx.strokeStyle = drawMode === 'draw' ? '#ef4444' : 'rgba(0,0,0,0)';
    ctx.globalCompositeOperation = drawMode === 'draw' ? 'source-over' : 'destination-out';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    ctx.lineTo(x, y);
    ctx.stroke();
    if(e.type === 'touchmove') e.preventDefault();
  };

  const stopDrawing = () => {
    if (isDrawing) {
       setIsDrawing(false);
       saveDrawing();
    }
  };

  const saveDrawing = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const drawingData = canvas.toDataURL('image/png');
      setFormData(prev => ({ ...prev, bodyMapImage: drawingData }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.clientName) return toast({ title: "Missing Information", description: "Please provide or select your Name.", variant: "destructive" });
      if (!formData.guestType) return toast({ title: "Missing Information", description: "Please select a Guest Type.", variant: "destructive" });
      if (formData.guestType === 'Hotel Guest' && !formData.roomNumber) return toast({ title: "Missing Information", description: "Please provide your Room Number.", variant: "destructive" });
    }
    if (currentStep === 3) saveDrawing();
    if (currentStep === 4) {
        if (!formData.agreement) return toast({ title: "Agreement Required", description: "You must agree to the terms to proceed.", variant: "destructive" });
        onSubmit(formData);
    }
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
  const resetForm = () => {
    setFormData(initialFormData); setServiceId(''); setGuestOptions([]); setCurrentStep(1); fetchSuggestions('');
  };

  const handlePrint = () => {
      if (currentStep === 3) saveDrawing();
      window.print();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <div className="space-y-2 service-id-container relative">
                <Label htmlFor="serviceId" className="text-[#5a4a5a]">Service ID *</Label>
                <div className="relative">
                   <Input id="serviceId" value={serviceId} onChange={handleServiceIdChange} onFocus={() => setShowSuggestions(true)} onKeyDown={(e) => e.key === 'Enter' && performServiceLookup(serviceId)} className="h-12 w-full bg-white pr-10" placeholder="Search Name or Enter Service ID" autoComplete="off" />
                   {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /></div>}
                   {showSuggestions && suggestions.length > 0 && (
                       <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-[#e5ddd5] rounded-md shadow-lg max-h-60 overflow-y-auto">
                           {suggestions.map((suggestion) => (
                               <div key={suggestion.reference_id} onClick={() => handleSuggestionClick(suggestion)} className="p-3 hover:bg-[#f5f1ed] cursor-pointer transition-colors border-b border-gray-50 last:border-0">
                                   <div className="text-sm text-[#5a4a5a]">{suggestion.customer_name || 'Guest'} - {suggestion.reference_id}</div>
                               </div>
                           ))}
                       </div>
                   )}
                </div>
                <p className="text-xs text-muted-foreground">Type a name to search recent bookings.</p>
             </div>
             {guestOptions.length > 0 && (
                 <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="clientName" className="text-[#5a4a5a]">Select Guest Name *</Label>
                    <select id="clientName" name="clientName" value={formData.clientName} onChange={handleInputChange} className="flex h-12 w-full rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7355] disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="" disabled>Select Name from Booking</option>
                        {guestOptions.map((name, idx) => <option key={idx} value={name}>{name}</option>)}
                    </select>
                 </div>
             )}
             <div className="space-y-2">
                <Label htmlFor="guestType" className="text-[#5a4a5a]">Guest Type *</Label>
                <select id="guestType" name="guestType" value={formData.guestType} onChange={handleInputChange} className="flex h-12 w-full rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7355] disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="" disabled>Select Guest Type</option>
                    <option value="Hotel Guest">Hotel Guest</option>
                    <option value="Walk-In">Walk-In</option>
                    <option value="Day Use">Day Use</option>
                </select>
             </div>
             {formData.guestType === 'Hotel Guest' && (
                 <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="roomNumber" className="text-[#5a4a5a]">Room Number *</Label>
                    <Input id="roomNumber" name="roomNumber" value={formData.roomNumber} onChange={handleInputChange} className="h-12" placeholder="Room No." />
                 </div>
             )}
             <div className="space-y-2">
                <Label htmlFor="therapist" className="text-[#5a4a5a]">Preferred Therapist</Label>
                <select id="therapist" name="therapist" value={formData.therapist} onChange={handleInputChange} className="flex h-12 w-full rounded-md border border-[#d4a574]/30 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b7355] disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Any Therapist / Not Assigned</option>
                    {therapistOptions.map((t, idx) => <option key={idx} value={t.name}>{t.name}</option>)}
                </select>
             </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <p className="text-sm text-[#7a6a5a]">Do you have any of the following conditions?</p>
            <div className="grid grid-cols-1 gap-3">
              {['highBloodPressure', 'backPain', 'soreThroatCongestion', 'pregnancy'].map((key) => (
                <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e5ddd5]">
                  <Label htmlFor={key} className="flex-1 cursor-pointer capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  <input type="checkbox" id={key} name={key} checked={formData[key]} onChange={handleInputChange} className="h-5 w-5 accent-[#8b7355] cursor-pointer" />
                </div>
              ))}
              <div className="space-y-2 bg-white rounded-lg border border-[#e5ddd5] p-3">
                 <div className="flex items-center justify-between">
                    <Label htmlFor="allergies" className="flex-1 cursor-pointer">Allergies</Label>
                    <input type="checkbox" id="allergies" name="allergies" checked={formData.allergies} onChange={handleInputChange} className="h-5 w-5 accent-[#8b7355] cursor-pointer" />
                 </div>
                 {formData.allergies && (
                     <div className="pl-2 mt-2 space-y-2 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                         <div className="flex items-center gap-3 p-1">
                             <input type="checkbox" id="peanutAllergy" name="peanutAllergy" checked={formData.peanutAllergy} onChange={handleInputChange} className="h-4 w-4 accent-[#8b7355] cursor-pointer" />
                             <Label htmlFor="peanutAllergy" className="cursor-pointer font-normal">Are you allergic to peanuts?</Label>
                         </div>
                         <div className="flex items-center gap-3 p-1">
                             <input type="checkbox" id="coconutOilAllergy" name="coconutOilAllergy" checked={formData.coconutOilAllergy} onChange={handleInputChange} className="h-4 w-4 accent-[#8b7355] cursor-pointer" />
                             <Label htmlFor="coconutOilAllergy" className="cursor-pointer font-normal">Are you allergic to coconut oil?</Label>
                         </div>
                          <div className="space-y-2 p-1">
                             <div className="flex items-center gap-3">
                                 <input type="checkbox" id="otherAllergy" name="otherAllergy" checked={formData.otherAllergy} onChange={handleInputChange} className="h-4 w-4 accent-[#8b7355] cursor-pointer" />
                                 <Label htmlFor="otherAllergy" className="cursor-pointer font-normal">Others</Label>
                             </div>
                             {formData.otherAllergy && (
                                 <Input name="otherAllergyDetails" value={formData.otherAllergyDetails} onChange={handleInputChange} placeholder="Please specify allergies..." className="h-10 ml-7 w-[calc(100%-1.75rem)] border-[#d4a574]/30 focus-visible:ring-[#8b7355]" />
                             )}
                         </div>
                     </div>
                 )}
              </div>
              <div className="space-y-2">
                 <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e5ddd5]">
                    <Label htmlFor="recentSurgery" className="flex-1 cursor-pointer">Recent Surgery (within 6 months)</Label>
                    <input type="checkbox" id="recentSurgery" name="recentSurgery" checked={formData.recentSurgery} onChange={handleInputChange} className="h-5 w-5 accent-[#8b7355] cursor-pointer" />
                 </div>
                 {formData.recentSurgery && (
                   <Textarea name="recentSurgeryDetails" value={formData.recentSurgeryDetails} onChange={handleInputChange} placeholder="Please specify type and date..." className="border-[#d4a574]/30 focus-visible:ring-[#8b7355]" />
                 )}
              </div>
              <div className="space-y-2">
                 <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e5ddd5]">
                    <Label htmlFor="injuries" className="flex-1 cursor-pointer">Recent Injuries</Label>
                    <input type="checkbox" id="injuries" name="injuries" checked={formData.injuries} onChange={handleInputChange} className="h-5 w-5 accent-[#8b7355] cursor-pointer" />
                 </div>
                 {formData.injuries && (
                   <Textarea name="injuriesDetails" value={formData.injuriesDetails} onChange={handleInputChange} placeholder="Please specify..." className="border-[#d4a574]/30 focus-visible:ring-[#8b7355]" />
                 )}
              </div>
              <div className="space-y-2">
                 <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e5ddd5]">
                    <Label htmlFor="painArmLegNeck" className="flex-1 cursor-pointer">Pains in your body?</Label>
                    <input type="checkbox" id="painArmLegNeck" name="painArmLegNeck" checked={formData.painArmLegNeck} onChange={handleInputChange} className="h-5 w-5 accent-[#8b7355] cursor-pointer" />
                 </div>
                 {formData.painArmLegNeck && (
                   <Textarea name="painDetails" value={formData.painDetails} onChange={handleInputChange} placeholder="Where does it hurt?" className="border-[#d4a574]/30 focus-visible:ring-[#8b7355]" />
                 )}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="shrink-0 text-center mb-2 space-y-1">
                <p className="text-sm text-[#7a6a5a]">Mark areas to avoid <span className="text-red-500 font-bold">in red</span>.</p>
                <div className="flex gap-2 justify-center print:hidden">
                   <Button size="sm" variant={drawMode === 'draw' ? 'default' : 'outline'} className={drawMode === 'draw' ? 'bg-[#8b7355] text-white' : ''} onClick={() => setDrawMode('draw')}><PenTool className="h-4 w-4 mr-1" /> Mark</Button>
                   <Button size="sm" variant={drawMode === 'erase' ? 'default' : 'outline'} className={drawMode === 'erase' ? 'bg-[#8b7355] text-white' : ''} onClick={() => setDrawMode('erase')}><Eraser className="h-4 w-4 mr-1" /> Erase</Button>
                   <Button size="sm" variant="outline" onClick={() => { 
                       const ctx = canvasRef.current.getContext('2d'); 
                       ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); 
                       setFormData(prev => ({ ...prev, bodyMapImage: null })); 
                   }}>Clear</Button>
                </div>
            </div>
            <div ref={containerRef} className="flex-1 min-h-[400px] w-full flex items-center justify-center p-2 bg-[#f8f6f4] rounded-lg border border-[#e5ddd5] overflow-hidden print:border-none print:bg-white print:p-0">
               <div className="relative border-2 border-[#8b7355] bg-white shadow-inner touch-none select-none print:border-none print:shadow-none" style={{ width: canvasDimensions.width, height: canvasDimensions.height }}>
                   <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: `url('${BODY_DIAGRAM_URL}')`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                   <canvas ref={canvasRef} width={canvasDimensions.width} height={canvasDimensions.height} className="absolute inset-0 touch-none cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
               </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="bg-white p-4 sm:p-6 rounded-lg border border-[#e5ddd5] text-sm text-[#5a4a5a] space-y-4 h-56 sm:h-64 overflow-y-auto print:h-auto print:border-none print:p-0">
                <h3 className="font-bold text-[#8b7355]">Terms & Conditions</h3>
                <p>I understand that the massage is for relaxation. I will inform the practitioner of any pain. This is not medical treatment.</p>
                <p>I confirm all my medical information is accurate.</p>
             </div>
             <div className="flex items-start gap-3 p-4 bg-[#fdfbf7] rounded-lg border border-[#d4a574]/30 print:bg-white print:border-none print:p-0">
                <input type="checkbox" id="agreement" name="agreement" checked={formData.agreement} onChange={handleInputChange} className="mt-1 h-5 w-5 accent-[#8b7355] cursor-pointer" />
                <Label htmlFor="agreement" className="text-sm leading-relaxed cursor-pointer">I have read and agree to the terms.</Label>
             </div>
          </div>
        );
      case 5:
        return (
           <div className="space-y-6 animate-in zoom-in-95 duration-300 print:animate-none pb-20 sm:pb-0">
              <div className="text-center space-y-2 print:hidden">
                 <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8" />
                 </div>
                 <h2 className="text-2xl font-bold text-[#5a4a5a]">Submitted!</h2>
                 <p className="text-[#7a6a5a]">Thank you, {formData.clientName}.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border text-center text-sm text-gray-600 print:hidden">
                 Your health form has been successfully recorded in our system.
                 <br /> Please proceed to the reception or wait for your therapist.
              </div>
              {isPublic && (
                 <div className="flex justify-center pt-4 print:hidden">
                    <Button onClick={resetForm} className="gap-2 bg-[#8b7355] hover:bg-[#7a6345] text-white">
                       <RefreshCw className="h-4 w-4" /> Start New Form
                    </Button>
                 </div>
              )}
           </div>
        );
      default: return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 bg-[#f5f1ed] flex flex-col print:bg-white print:static print:h-auto"
    >
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

       <div className="bg-[#8b7355] text-white p-4 flex items-center justify-between shadow-md print:hidden shrink-0">
          <h2 className="text-lg font-semibold">Health Form</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePrint} className="text-white hover:bg-white/20" title="Print Form">
               <Printer className="h-5 w-5" />
            </Button>
            {!isPublic && (
               <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20"><X className="h-5 w-5" /></Button>
            )}
          </div>
       </div>

       {currentStep < 5 && (
         <div className="bg-white px-4 py-4 shadow-sm print:hidden shrink-0">
           <div className="max-w-2xl mx-auto">
             <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
               <div className="h-full bg-[#8b7355] transition-all duration-500 ease-out" style={{ width: `${(currentStep / 4) * 100}%` }} />
             </div>
             <div className="text-center mt-2 text-xs text-gray-400">Step {currentStep} of 4</div>
           </div>
         </div>
       )}

       <div className="flex-1 overflow-y-auto p-4 print:p-0 print:overflow-hidden flex flex-col">
          <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-start sm:justify-center print:max-w-none print:max-h-[5.5in] print:block print:overflow-hidden">
             
             <div className="hidden print:flex print:flex-row print:w-full print:gap-4 print:h-[5.5in] text-[#5a4a3a]">
                
                {/* Left Column Print */}
                <div className="print:w-1/2 print:flex print:flex-col print:border-r print:border-gray-200 print:pr-4">
                    <PrintHeader title="Health Form" subtitle="Client Copy" logo={LEMA_LOGO} landscape={true} />
                    
                    <div className="grid grid-cols-2 gap-2 mb-2 border-b border-gray-200 pb-2 mt-2 print:text-[11px]">
                       <div><strong>Name:</strong> {formData.clientName || '_______________'}</div>
                       <div><strong>Guest Type:</strong> {formData.guestType || '_______________'}</div>
                       <div><strong>Room:</strong> {formData.roomNumber || '_______________'}</div>
                       <div><strong>Therapist:</strong> {formData.therapist || '_______________'}</div>
                    </div>

                    <div className="mb-2">
                       <h3 className="font-bold text-[12px] mb-1 border-b border-gray-200 pb-0.5">Medical Conditions</h3>
                       <div className="grid grid-cols-2 gap-y-1 print:text-[10px]">
                           <div>• High Blood Pressure: {formData.highBloodPressure ? 'Yes' : 'No'}</div>
                           <div>• Back Pain: {formData.backPain ? 'Yes' : 'No'}</div>
                           <div>• Sore Throat: {formData.soreThroatCongestion ? 'Yes' : 'No'}</div>
                           <div>• Pregnancy: {formData.pregnancy ? 'Yes' : 'No'}</div>
                       </div>
                    </div>

                    <div className="mb-2">
                       <h3 className="font-bold text-[12px] mb-1 border-b border-gray-200 pb-0.5">Allergies & Physical History</h3>
                       <div className="print:text-[10px] space-y-0.5">
                           <div>• Has Allergies: {formData.allergies ? 'Yes' : 'No'} {formData.allergies && `(Peanuts: ${formData.peanutAllergy ? 'Yes' : 'No'}, Coconut: ${formData.coconutOilAllergy ? 'Yes' : 'No'}, Other: ${formData.otherAllergyDetails || 'None'})`}</div>
                           <div>• Recent Surgery: {formData.recentSurgery ? 'Yes' : 'No'} {formData.recentSurgery && `(${formData.recentSurgeryDetails})`}</div>
                           <div>• Recent Injuries: {formData.injuries ? 'Yes' : 'No'} {formData.injuries && `(${formData.injuriesDetails})`}</div>
                           <div>• Body Pains: {formData.painArmLegNeck ? 'Yes' : 'No'} {formData.painArmLegNeck && `(${formData.painDetails})`}</div>
                       </div>
                    </div>

                    <div className="mt-auto break-inside-avoid">
                       <h3 className="font-bold text-[12px] mb-1 border-b border-gray-200 pb-0.5">Terms & Conditions</h3>
                       <p className="text-[9px] text-justify mb-4">
                           I understand that the massage is for relaxation. I will inform the practitioner of any pain. This is not medical treatment. I confirm all my medical information is accurate.
                       </p>
                       <div className="flex justify-between pt-4">
                           <div className="w-[45%] border-t border-gray-800 pt-1 text-center">
                               <span className="font-semibold text-[10px]">Client Signature</span>
                           </div>
                           <div className="w-[45%] border-t border-gray-800 pt-1 text-center">
                               <span className="font-semibold text-[10px]">Date</span>
                           </div>
                       </div>
                    </div>
                </div>

                {/* Right Column Print - Body Map */}
                <div className="print:w-1/2 print:flex print:flex-col print:items-center print:justify-center">
                    {formData.bodyMapImage ? (
                        <div className="break-inside-avoid w-full h-full flex flex-col items-center justify-center">
                           <h3 className="font-bold text-[12px] mb-2">Areas to Avoid (Marked in Red)</h3>
                           <img src={formData.bodyMapImage} alt="Body Map" className="max-h-[4in] max-w-[90%] object-contain border border-gray-300 rounded" />
                        </div>
                    ) : (
                        <div className="break-inside-avoid w-full h-full flex flex-col items-center justify-center">
                           <h3 className="font-bold text-[12px] mb-2">Areas to Avoid</h3>
                           <div className="border border-gray-300 rounded h-[4in] w-[80%] flex items-center justify-center relative bg-white">
                               <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: `url('${BODY_DIAGRAM_URL}')`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                           </div>
                        </div>
                    )}
                </div>

             </div>

             {/* Screen Only View */}
             <div className="print:hidden">
                {renderStepContent()}
             </div>

          </div>
       </div>

       <div className="bg-white border-t border-[#e5ddd5] p-4 print:hidden shrink-0 pb-8 sm:pb-4">
          <div className="max-w-2xl mx-auto flex justify-between items-center gap-3">
             {currentStep === 5 ? (
                !isPublic && <Button onClick={onClose} className="w-full bg-[#8b7355] text-white hover:bg-[#8b7355]">Done</Button>
             ) : (
                <>
                   <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1} className="flex-1 text-[#7a6a3a]">Back</Button>
                   <Button onClick={nextStep} className="flex-1 bg-[#8b7355] text-white hover:bg-[#8b7355]">{currentStep === 4 ? 'Submit' : 'Next'}</Button>
                </>
             )}
          </div>
       </div>
    </motion.div>
  );
}

export default HealthForm;
