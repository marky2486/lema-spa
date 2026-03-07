import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Eraser, PenTool, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';

// This URL must match the one used in AdminDashboard for the overlay to line up
export const BODY_DIAGRAM_URL = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/98955f0a88244c3fcf168145a115e104.png";

function IntakeForm({ onClose, onSubmit, isPublic = false }) {
  const [currentStep, setCurrentStep] = useState(1);
  const initialFormData = {
    clientName: '',
    roomNumber: '',
    email: '',
    phone: '',
    // Conditions
    highBloodPressure: false,
    backPain: false,
    allergies: false,
    recentSurgery: false,
    recentSurgeryDetails: '',
    injuries: false,
    injuriesDetails: '',
    soreThroatCongestion: false,
    pregnancy: false,
    painArmLegNeck: false,
    painDetails: '',
    // Agreement & Body Map
    agreement: false,
    bodyMapImage: null,
  };
  
  const [formData, setFormData] = useState(initialFormData);
  
  const { toast } = useToast();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState('draw');

  // Restore drawing if returning to step 3
  useEffect(() => {
    if (currentStep === 3 && canvasRef.current && formData.bodyMapImage) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = formData.bodyMapImage;
    }
  }, [currentStep, formData.bodyMapImage]); 

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
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
    ctx.lineWidth = drawMode === 'draw' ? 3 : 20;
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
      
      setFormData(prev => ({
          ...prev,
          bodyMapImage: drawingData
      }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.clientName || !formData.roomNumber) {
        toast({ title: "Missing Information", description: "Please provide at least your Name and Room Number.", variant: "destructive" });
        return;
      }
    }
    
    if (currentStep === 3) {
       saveDrawing();
    }
    
    if (currentStep === 4) {
        if (!formData.agreement) {
            toast({ title: "Agreement Required", description: "You must agree to the terms to proceed.", variant: "destructive" });
            return;
        }
        onSubmit(formData);
    }

    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setCurrentStep(1);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Basic Info
        return (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <div className="space-y-2">
                <Label htmlFor="clientName" className="text-[#5a4a3a]">Client Name *</Label>
                <Input id="clientName" name="clientName" value={formData.clientName} onChange={handleInputChange} className="h-12" placeholder="Full Name" />
             </div>
             <div className="space-y-2">
                <Label htmlFor="roomNumber" className="text-[#5a4a3a]">Room Number *</Label>
                <Input id="roomNumber" name="roomNumber" value={formData.roomNumber} onChange={handleInputChange} className="h-12" placeholder="Room No." />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#5a4a3a]">Email</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="h-12" placeholder="Optional" />
               </div>
               <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[#5a4a3a]">Phone</Label>
                  <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="h-12" placeholder="Optional" />
               </div>
             </div>
          </div>
        );
      case 2: // Health Info
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <p className="text-sm text-[#7a6a5a]">Do you have any of the following conditions?</p>
            <div className="grid grid-cols-1 gap-3">
              {['highBloodPressure', 'backPain', 'allergies', 'soreThroatCongestion', 'pregnancy'].map((key) => (
                <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#e5ddd5]">
                  <Label htmlFor={key} className="flex-1 cursor-pointer capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  <input type="checkbox" id={key} name={key} checked={formData[key]} onChange={handleInputChange} className="h-5 w-5 accent-[#8b7355] cursor-pointer" />
                </div>
              ))}
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
                    <Label htmlFor="painArmLegNeck" className="flex-1 cursor-pointer">Pain in Arms, Legs, or Neck</Label>
                    <input type="checkbox" id="painArmLegNeck" name="painArmLegNeck" checked={formData.painArmLegNeck} onChange={handleInputChange} className="h-5 w-5 accent-[#8b7355] cursor-pointer" />
                 </div>
                 {formData.painArmLegNeck && (
                   <Textarea name="painDetails" value={formData.painDetails} onChange={handleInputChange} placeholder="Where does it hurt?" className="border-[#d4a574]/30 focus-visible:ring-[#8b7355]" />
                 )}
              </div>
            </div>
          </div>
        );
      case 3: // Body Map
        return (
          <div className="space-y-4 animate-in slide-in-from-right duration-300 flex flex-col items-center">
            <p className="text-sm text-[#7a6a5a] text-center">Mark areas to avoid <span className="text-red-500 font-bold">in red</span>.</p>
            <div className="flex gap-2 mb-2 flex-wrap justify-center">
               <Button size="sm" variant={drawMode === 'draw' ? 'default' : 'outline'} className={drawMode === 'draw' ? 'bg-[#8b7355] text-white' : ''} onClick={() => setDrawMode('draw')}><PenTool className="h-4 w-4 mr-1" /> Mark</Button>
               <Button size="sm" variant={drawMode === 'erase' ? 'default' : 'outline'} className={drawMode === 'erase' ? 'bg-[#8b7355] text-white' : ''} onClick={() => setDrawMode('erase')}><Eraser className="h-4 w-4 mr-1" /> Erase</Button>
               <Button size="sm" variant="outline" onClick={() => { 
                   const ctx = canvasRef.current.getContext('2d'); 
                   ctx.clearRect(0, 0, 320, 320); 
                   setFormData(prev => ({ ...prev, bodyMapImage: null })); 
               }}>Clear</Button>
            </div>
            
            <div className="relative border-2 border-[#8b7355] rounded-lg overflow-hidden bg-white shadow-inner w-[300px] h-[300px] sm:w-[320px] sm:h-[320px] touch-none select-none">
               <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: `url('${BODY_DIAGRAM_URL}')`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
               
               <canvas 
                  ref={canvasRef} 
                  width={320} 
                  height={320} 
                  className="absolute inset-0 touch-none cursor-crosshair" 
                  onMouseDown={startDrawing} 
                  onMouseMove={draw} 
                  onMouseUp={stopDrawing} 
                  onMouseLeave={stopDrawing} 
                  onTouchStart={startDrawing} 
                  onTouchMove={draw} 
                  onTouchEnd={stopDrawing} 
               />
            </div>
          </div>
        );
      case 4: // Agreement
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
             <div className="bg-white p-4 sm:p-6 rounded-lg border border-[#e5ddd5] text-sm text-[#5a4a3a] space-y-4 h-56 sm:h-64 overflow-y-auto">
                <h3 className="font-bold text-[#8b7355]">Terms & Conditions</h3>
                <p>I understand that the massage is for relaxation. I will inform the practitioner of any pain. This is not medical treatment.</p>
                <p>I confirm all my medical information is accurate.</p>
             </div>
             <div className="flex items-start gap-3 p-4 bg-[#fdfbf7] rounded-lg border border-[#d4a574]/30">
                <input type="checkbox" id="agreement" name="agreement" checked={formData.agreement} onChange={handleInputChange} className="mt-1 h-5 w-5 accent-[#8b7355] cursor-pointer" />
                <Label htmlFor="agreement" className="text-sm leading-relaxed cursor-pointer">I have read and agree to the terms.</Label>
             </div>
          </div>
        );
      case 5: // Summary
        return (
           <div className="space-y-6 animate-in zoom-in-95 duration-300 print:animate-none pb-20 sm:pb-0">
              <div className="text-center space-y-2 print:hidden">
                 <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8" />
                 </div>
                 <h2 className="text-2xl font-bold text-[#5a4a3a]">Submitted!</h2>
                 <p className="text-[#7a6a5a]">Thank you, {formData.clientName}.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border text-center text-sm text-gray-600">
                 Your intake form has been successfully recorded in our system.
                 <br /> Please proceed to the reception or wait for your therapist.
              </div>
              {isPublic && (
                 <div className="flex justify-center pt-4">
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
       <div className="bg-[#8b7355] text-white p-4 flex items-center justify-between shadow-md print:hidden shrink-0">
          <h2 className="text-lg font-semibold">Intake Form</h2>
          {!isPublic && (
             <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20"><X className="h-5 w-5" /></Button>
          )}
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

       <div className="flex-1 overflow-y-auto p-4 print:p-0 print:overflow-visible">
          <div className="max-w-2xl mx-auto h-full flex flex-col justify-start sm:justify-center print:max-w-none print:block">
             {renderStepContent()}
          </div>
       </div>

       <div className="bg-white border-t border-[#e5ddd5] p-4 print:hidden shrink-0 pb-8 sm:pb-4">
          <div className="max-w-2xl mx-auto flex justify-between items-center gap-3">
             {currentStep === 5 ? (
                !isPublic && <Button onClick={onClose} className="w-full bg-[#8b7355] text-white hover:bg-[#8b7355]">Done</Button>
             ) : (
                <>
                   <Button variant="ghost" onClick={prevStep} disabled={currentStep === 1} className="flex-1 text-[#7a6a5a]">Back</Button>
                   <Button onClick={nextStep} className="flex-1 bg-[#8b7355] text-white hover:bg-[#8b7355]">{currentStep === 4 ? 'Submit' : 'Next'}</Button>
                </>
             )}
          </div>
       </div>
    </motion.div>
  );
}

export default IntakeForm;