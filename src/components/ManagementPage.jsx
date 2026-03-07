
import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  Loader2, 
  Briefcase, 
  Trash2,
  Printer,
  ClipboardList,
  RefreshCw,
  Star,
  ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import PrintHeader from './PrintHeader';

const LEMA_LOGO = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/d1952d3bda1cba2e721a0a8c399d7c46.png";

const ManagementPage = ({ feedbacks = [], onRefreshFeedbacks, isLoadingFeedbacks }) => {
  const { user: currentUser, signUp } = useAuth();
  const { toast } = useToast();
  
  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '' });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [orders, setOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchOrders();
  }, []);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        const isRLS = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
        if (isRLS) {
            toast({ title: "Permission Denied", description: "You do not have permission to view management personnel.", variant: "destructive" });
        } else {
            throw error;
        }
      } else {
          setUsersList(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: "Error", description: "Failed to load users list", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*, therapists(name), therapist:therapists(name)')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        setOrders(data || []);
    } catch (error) {
        console.error('Error fetching orders:', error);
        toast({ title: "Error", description: "Failed to load bookings", variant: "destructive" });
    } finally {
        setIsLoadingOrders(false);
    }
  };

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

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newUser.email || !newUser.password) {
        toast({ title: "Error", description: "Email and Password are required.", variant: "destructive" });
        return;
    }

    setIsCreatingUser(true);
    try {
        const { error } = await signUp(newUser.email, newUser.password);
        
        if (error) throw error;
        
        toast({ 
            title: "User Created", 
            description: `Account for ${newUser.email} has been created. They will need to verify their email.`,
        });
        setNewUser({ email: '', password: '' });
        fetchUsers();

    } catch (error) {
        console.error(error);
        toast({ title: "Creation Failed", description: error.message || "Could not create user.", variant: "destructive" });
    } finally {
        setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (targetUserId, targetEmail) => {
    if (targetUserId === currentUser?.id) {
        toast({ title: "Action Denied", description: "You cannot delete your own account.", variant: "destructive" });
        return;
    }
    
    if (targetEmail === 'markymaligmat@fastmail.com') {
        toast({ title: "Action Denied", description: "Cannot delete the super admin account.", variant: "destructive" });
        return;
    }

    if (!window.confirm(`Are you sure you want to remove access for ${targetEmail}? This action cannot be undone.`)) {
        return;
    }

    try {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', targetUserId);

        if (error) {
             const isRLS = error.code === '42501' || error.message?.toLowerCase().includes('row-level security');
             if (isRLS) {
                 toast({ title: "Permission Denied", description: "You do not have permission to delete personnel.", variant: "destructive" });
                 return;
             }
             throw error;
        }

        toast({ title: "User Removed", description: "User access has been revoked successfully." });
        setUsersList(prev => prev.filter(u => u.id !== targetUserId));
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Failed to remove user.", variant: "destructive" });
    }
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="w-full space-y-6">
      <PrintHeader title="Management Authorized Personnel" logo={LEMA_LOGO} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Add User Form */}
        <div className="lg:col-span-1 print:hidden">
           <div className="bg-white rounded-xl border shadow-sm p-6">
             <div className="text-center mb-6">
                 <div className="h-12 w-12 bg-[#8b7355]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <UserPlus className="h-6 w-6 text-[#8b7355]" />
                 </div>
                 <h2 className="text-lg font-bold text-[#5a4a3a]">Add Management User</h2>
                 <p className="text-xs text-gray-500 mt-1">Grant access to dashboard features</p>
             </div>
             
             <form onSubmit={handleCreateUser} className="space-y-4">
                 <div className="space-y-2">
                      <Label htmlFor="new-email">Email Address</Label>
                      <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input 
                              id="new-email" 
                              type="email" 
                              placeholder="staff@lemaspa.com" 
                              className="pl-9"
                              value={newUser.email}
                              onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                          />
                      </div>
                 </div>
                 <div className="space-y-2">
                      <Label htmlFor="new-password">Password</Label>
                      <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input 
                              id="new-password" 
                              type="password" 
                              placeholder="Create a secure password" 
                              className="pl-9"
                              value={newUser.password}
                              onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                          />
                      </div>
                 </div>
                 
                 <Button 
                   type="submit" 
                   disabled={isCreatingUser}
                   className="w-full bg-[#8b7355] hover:bg-[#7a6345] text-white"
                 >
                     {isCreatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
                 </Button>
                 
                 <p className="text-[10px] text-center text-gray-400 mt-4 leading-tight">
                     New users will receive a confirmation email and must verify their account before logging in.
                 </p>
             </form>
           </div>
        </div>

        {/* Right Column: User List */}
        <div className="lg:col-span-2 print:col-span-3">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
               <div className="p-4 border-b bg-gray-50 flex justify-between items-center print:bg-white print:border-none">
                   <h3 className="font-semibold text-[#5a4a3a] flex items-center gap-2">
                       <Briefcase className="h-4 w-4 text-[#8b7355] print:hidden" /> Authorized Personnel
                   </h3>
                   <div className="flex items-center gap-2">
                       <Badge variant="outline" className="print:hidden">{usersList.length} Users</Badge>
                       <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden h-8 gap-2">
                           <Printer className="h-3 w-3" />
                           Print List
                       </Button>
                   </div>
               </div>
               
               <div className="flex-grow overflow-auto p-0 print:overflow-visible max-h-[400px]">
                  {isLoadingUsers ? (
                      <div className="flex flex-col items-center justify-center h-40 text-gray-400 print:hidden">
                          <Loader2 className="h-8 w-8 animate-spin mb-2" />
                          <span className="text-xs">Loading users...</span>
                      </div>
                  ) : usersList.length === 0 ? (
                       <div className="text-center p-8 text-gray-400 text-sm">
                           No users found.
                       </div>
                  ) : (
                      <table className="w-full text-sm text-left border-collapse">
                          <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 print:bg-transparent print:border-b print:border-gray-200 sticky top-0 bg-gray-50">
                              <tr>
                                  <th className="px-4 py-3 font-medium">Email</th>
                                  <th className="px-4 py-3 font-medium">Role</th>
                                  <th className="px-4 py-3 font-medium">Added</th>
                                  <th className="px-4 py-3 font-medium text-right print:hidden">Action</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y print:divide-gray-200">
                              {usersList.map(user => (
                                  <tr key={user.id} className="hover:bg-gray-50 transition-colors break-inside-avoid">
                                      <td className="px-4 py-3 text-[#5a4a3a] font-medium">{user.email}</td>
                                      <td className="px-4 py-3">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium print:border print:border-gray-300 print:bg-transparent print:text-[#5a4a3a] ${
                                              user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                          }`}>
                                              {user.role}
                                          </span>
                                      </td>
                                      <td className="px-4 py-3 text-gray-500 text-xs">
                                          {formatDate(user.created_at)}
                                      </td>
                                      <td className="px-4 py-3 text-right print:hidden">
                                          <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                              onClick={() => handleDeleteUser(user.id, user.email)}
                                              disabled={user.id === currentUser?.id || user.email === 'markymaligmat@fastmail.com'}
                                              title="Remove User Access"
                                          >
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  )}
               </div>
            </div>
        </div>
      </div>

      {/* Booking Information Section */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col print:hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-[#5a4a3a] flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-[#8b7355]" /> Booking Information
              </h3>
              <div className="flex items-center gap-2">
                  <Badge variant="outline">{orders.length} Bookings</Badge>
                  <Button variant="outline" size="sm" onClick={fetchOrders} disabled={isLoadingOrders} className="h-8 gap-2">
                      <RefreshCw className={`h-3 w-3 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                      Refresh
                  </Button>
              </div>
          </div>
          <div className="flex-grow overflow-auto p-0 max-h-[400px]">
              {isLoadingOrders ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      <span className="text-xs">Loading bookings...</span>
                  </div>
              ) : orders.length === 0 ? (
                  <div className="text-center p-8 text-gray-400 text-sm">
                      No bookings found.
                  </div>
              ) : (
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 sticky top-0 bg-gray-50">
                          <tr>
                              <th className="px-4 py-3 font-medium">Reference ID</th>
                              <th className="px-4 py-3 font-medium">Customer Name</th>
                              <th className="px-4 py-3 font-medium">Therapist</th>
                              <th className="px-4 py-3 font-medium">Payment</th>
                              <th className="px-4 py-3 font-medium">Total Price</th>
                              <th className="px-4 py-3 font-medium">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {orders.map(order => {
                              const therapistName = order.therapists?.name || order.therapist?.name || order.details?.therapistName || 'Not assigned';
                              const pmArray = order.payment_methods || order.details?.payment_methods || order.details?.customerDetails?.payment_methods || [];
                              const pmNote = order.payment_method_note || order.details?.payment_method_note || order.details?.customerDetails?.payment_method_note || '';

                              return (
                              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 font-mono text-gray-500">{order.reference_id}</td>
                                  <td className="px-4 py-3 text-[#5a4a3a] font-medium">{order.customer_name}</td>
                                  <td className="px-4 py-3 text-gray-600 font-medium">
                                      {therapistName !== 'Not assigned' ? (
                                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#8b7355]/10 text-[#8b7355] text-xs font-semibold">
                                              {therapistName}
                                          </span>
                                      ) : (
                                          <span className="text-gray-400 text-xs italic">Not assigned</span>
                                      )}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                                      <div className="flex flex-col gap-0.5">
                                          <span className="font-medium text-xs text-[#5a4a3a]">
                                              {pmArray.length > 0 ? pmArray.join(', ') : 'Not specified'}
                                          </span>
                                          {pmNote && (
                                              <span className="text-[10px] text-gray-500 italic truncate" title={pmNote}>
                                                  {pmNote}
                                              </span>
                                          )}
                                      </div>
                                  </td>
                                  <td className="px-4 py-3 text-[#8b7355] font-medium">
                                      ₱{Number(order.total_price).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3">
                                      <Badge className="bg-blue-100 text-blue-800 border-0 font-medium hover:bg-blue-100">
                                          {order.status || 'Completed'}
                                      </Badge>
                                  </td>
                              </tr>
                          )})}
                      </tbody>
                  </table>
              )}
          </div>
      </div>

      {/* Feedbacks Section */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col print:hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-[#5a4a3a] flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#8b7355]" /> Customer Feedbacks
              </h3>
              <div className="flex items-center gap-2">
                  <Badge variant="outline">{feedbacks.length} Records</Badge>
                  <Button variant="outline" size="sm" onClick={onRefreshFeedbacks} disabled={isLoadingFeedbacks} className="h-8 gap-2">
                      <RefreshCw className={`h-3 w-3 ${isLoadingFeedbacks ? 'animate-spin' : ''}`} />
                      Refresh
                  </Button>
              </div>
          </div>
          <div className="flex-grow overflow-auto p-0 max-h-[400px]">
              {isLoadingFeedbacks ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      <span className="text-xs">Loading feedbacks...</span>
                  </div>
              ) : feedbacks.length === 0 ? (
                  <div className="text-center p-8 text-gray-400 text-sm">
                      No feedbacks found.
                  </div>
              ) : (
                  <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 sticky top-0 bg-gray-50">
                          <tr>
                              <th className="px-4 py-3 font-medium">Reference ID</th>
                              <th className="px-4 py-3 font-medium">Customer</th>
                              <th className="px-4 py-3 font-medium">Date</th>
                              <th className="px-4 py-3 font-medium">Details (Rating)</th>
                              <th className="px-4 py-3 font-medium">Tip Amount</th>
                              <th className="px-4 py-3 font-medium">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {feedbacks.map(f => {
                              // Safely parse details
                              let detailsObj = f.details;
                              if (typeof detailsObj === 'string') {
                                  try { detailsObj = JSON.parse(detailsObj); } catch (e) { detailsObj = {}; }
                              }
                              
                              return (
                              <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 font-mono text-gray-500">{f.booking_id || f.reference_id || f.id}</td>
                                  <td className="px-4 py-3 text-[#5a4a3a] font-medium">{f.customer_name || detailsObj?.guestName || 'Anonymous'}</td>
                                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(f.created_at)}</td>
                                  <td className="px-4 py-3 text-gray-600">
                                      {detailsObj?.overallRating ? (
                                          <div className="flex items-center gap-1 font-medium">
                                             <Star className="h-3 w-3 text-[#d4a574] fill-[#d4a574]" />
                                             <span>{detailsObj.overallRating} / 5</span>
                                          </div>
                                      ) : 'No rating'}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600 font-medium">₱{f.tip_amount?.toLocaleString() || '0'}</td>
                                  <td className="px-4 py-3">
                                      <Badge className="bg-green-100 text-green-800 border-0 hover:bg-green-100 font-medium">
                                          {f.status || 'Completed'}
                                      </Badge>
                                  </td>
                              </tr>
                          )})}
                      </tbody>
                  </table>
              )}
          </div>
      </div>

    </div>
  );
};

export default ManagementPage;
