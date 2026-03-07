
import React from 'react';

export function PrintHeader({ title, subtitle, logo, guestType, roomNo, guest_type, room_no, therapistName, paymentMethods, paymentNote, landscape = false }) {
  const defaultLogo = "https://horizons-cdn.hostinger.com/48b83274-55e8-47c8-8de2-939b4d60caf7/d1952d3bda1cba2e721a0a8c399d7c46.png";
  const imgSrc = logo || defaultLogo;

  const finalGuestType = guestType || guest_type;
  const finalRoomNo = roomNo || room_no;

  // Clean empty values, spaces, or placeholder texts
  const validGuestType = finalGuestType && finalGuestType !== "N/A" && finalGuestType.trim() !== "" ? finalGuestType : null;
  const validRoomNo = finalRoomNo && finalRoomNo !== "N/A" && finalRoomNo.trim() !== "" ? finalRoomNo : null;
  
  // Format therapist name correctly
  const displayTherapist = therapistName && therapistName.trim() !== "" && therapistName !== "N/A" ? therapistName : "Not assigned";

  const containerClasses = landscape ? "w-full mb-2 print:mb-1" : "w-full mb-6";
  const textClasses = landscape ? "text-center mb-2 print:mb-1" : "text-center mb-6";
  const imgClasses = landscape 
    ? "h-[40px] w-auto mx-auto object-contain mb-1" 
    : "w-[150px] sm:w-[200px] mx-auto object-contain mb-4";
  
  const titleClasses = landscape ? "text-sm font-bold text-[#5a4a3a] print:text-[14px] mb-0.5" : "text-xl font-bold text-[#5a4a3a] mb-1";
  const addInfoPadding = landscape ? "p-2 print:p-2" : "p-4 print:p-3";
  const labelClasses = landscape ? "text-[10px] font-bold text-gray-500 uppercase print:text-gray-700" : "text-xs font-bold text-gray-500 uppercase print:text-gray-700";
  const valueClasses = landscape ? "text-[11px] font-medium text-[#5a4a3a] print:text-black" : "text-sm font-medium text-[#5a4a3a] print:text-black";

  // Check if paymentMethods prop was explicitly passed (even if empty array)
  const hasPaymentProp = paymentMethods !== undefined;
  
  // Format payment methods safely
  const displayPaymentMethods = Array.isArray(paymentMethods) && paymentMethods.length > 0 
    ? paymentMethods.join(', ') 
    : 'Not specified';

  console.log("PrintHeader Rendering - Payment Methods:", paymentMethods, "Display:", displayPaymentMethods, "Note:", paymentNote);

  return (
    <div className={containerClasses}>
      <div className={`hidden print:block ${textClasses}`}>
        <img 
          src={imgSrc} 
          alt="Lema Filipino Spa logo" 
          className={imgClasses}
        />
        {title && <h1 className={titleClasses}>{title}</h1>}
        {subtitle && <p className="text-[11px] text-[#7a6a5a]">{subtitle}</p>}
      </div>

      <div className="text-left mt-2 print:mt-0">
        <h3 className={`${labelClasses} mb-1 print:text-black`}>
          ADDITIONAL INFORMATION
        </h3>
        <div className={`space-y-1 bg-[#fdfbf7] rounded-lg border border-[#e5ddd5] print:bg-white print:border-black ${addInfoPadding}`}>
          {validGuestType && (
            <div className={`flex justify-between items-center border-b border-[#e5ddd5] pb-1 print:border-gray-300`}>
              <span className={labelClasses}>Guest Type</span>
              <span className={valueClasses}>{validGuestType}</span>
            </div>
          )}
          {validRoomNo && (
            <div className={`flex justify-between items-center ${validGuestType ? 'pt-0.5' : ''} border-b border-[#e5ddd5] pb-1 print:border-gray-300`}>
              <span className={labelClasses}>Room No</span>
              <span className={valueClasses}>{validRoomNo}</span>
            </div>
          )}
          
          <div className={`flex justify-between items-center ${(validGuestType || validRoomNo) ? 'pt-0.5' : ''} ${hasPaymentProp ? 'border-b border-[#e5ddd5] pb-1 print:border-gray-300' : ''}`}>
            <span className={labelClasses}>Therapist</span>
            <span className={`${valueClasses} ${displayTherapist === 'Not assigned' ? 'text-gray-400 italic' : 'text-[#5a4a3a]'}`}>
              {displayTherapist}
            </span>
          </div>

          {hasPaymentProp && (
            <div className={`flex justify-between items-start pt-0.5`}>
              <span className={labelClasses}>Payment Methods</span>
              <div className="text-right max-w-[60%]">
                  <span className={`${valueClasses} block break-words leading-tight ${displayPaymentMethods === 'Not specified' ? 'text-gray-400 italic' : ''}`}>
                      {displayPaymentMethods}
                  </span>
                  {paymentNote && (
                    <div className="text-[9px] text-gray-500 italic mt-0.5 print:text-[8px] break-words leading-tight">
                      Note: {paymentNote}
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PrintHeader;
