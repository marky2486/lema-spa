import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const LoginPage = () => {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Reset error state on input
    if (needsConfirmation) setNeedsConfirmation(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setNeedsConfirmation(false);
    
    const email = formData.email.trim();

    try {
      const { error } = await signIn(email, formData.password);
      
      if (error) {
          if (error.message.includes("Email not confirmed")) {
              setNeedsConfirmation(true);
              toast({
                  title: "Email Not Confirmed",
                  description: "Please verify your email address before logging in.",
                  variant: "destructive"
              });
          } else {
             toast({
                 title: "Login Failed",
                 description: "Invalid email or password.",
                 variant: "destructive"
             });
          }
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f1ed] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#e5ddd5]">
          {/* Header */}
          <div className="bg-[#8b7355] p-8 text-center">
            <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Lema Spa Portal</h1>
            <p className="text-[#d4a574] text-sm mt-1">Secure Access Required</p>
          </div>

          {/* Form */}
          <div className="p-8 space-y-6">
            
            {needsConfirmation && (
                <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">Verification Required</AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                        Your account requires email verification.
                        <br/><br/>
                        <strong>Note:</strong> Please check your email inbox (and spam folder) for the confirmation link.
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input 
                    id="email" 
                    name="email" 
                    type="email"
                    className="pl-10 border-[#d4a574]/30 focus-visible:ring-[#8b7355]" 
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    className="pl-10 border-[#d4a574]/30 focus-visible:ring-[#8b7355]" 
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-[#8b7355] hover:bg-[#7a6345] text-white h-11 text-base"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <span className="flex items-center gap-2">
                    Sign In <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">System Access</span>
              </div>
            </div>
            
            <div className="text-center space-y-2">
               <p className="text-xs text-gray-400">
                  Restricted to authorized Lema Spa personnel only.
               </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;