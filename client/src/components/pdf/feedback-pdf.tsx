import React, { forwardRef } from 'react';
import { format } from 'date-fns';

interface FeedbackPDFProps {
  request: any;
  feedback: any;
  customerSignature?: string;
}

export const FeedbackPDF = forwardRef<HTMLDivElement, FeedbackPDFProps>(
  ({ request, feedback, customerSignature }, ref) => {
    
    const questions = [
      "How would you rate the smoothness of the warranty claim process you experienced?",
      "How satisfied are you with the overall performance of our service team?",
      "How would you describe the behaviour and attitude of the service engineer?",
      "How effective was the service engineer in communicating with you?",
      "How would you rate the approachability and professionalism of the service engineer?",
      "Was the service completed on time as promised?",
      "How satisfied are you with the quality of the service provided?",
      "Did the service engineer provide clear guidance on handling the product after service?",
      "How would you rate the response time when you called for service?"
    ];

    // Helper to render the rating cell. It highlights the cell if it matches the selected rating.
    const RatingCell = ({ value, selectedRate }: { value: number, selectedRate?: number }) => {
      const isSelected = selectedRate === value;
      return (
        <td className={`border border-black p-2 text-center align-middle font-serif ${isSelected ? 'bg-gray-200 font-bold' : ''}`}>
           {isSelected ? <div className="border border-black rounded-full w-5 h-5 flex items-center justify-center mx-auto">{value}</div> : value}
        </td>
      );
    };

    return (
        <div ref={ref} className="bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto text-[10px] leading-tight" style={{ fontFamily: "Arial, sans-serif" }}>
          
          <div className="px-8 py-8 w-full">
            {/* Top Header */}
            <div className="flex justify-end mb-2">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <div className="text-[#00b4d8] text-2xl rotate-45 mr-1 font-bold">⬢</div>
                    <span className="text-[#00b4d8] font-bold text-2xl tracking-tighter" style={{ fontFamily: "Arial" }}>HANRON</span>
                  </div>
                  <span className="text-pink-600 font-light text-3xl mx-1">|</span>
                  <div className="flex items-center gap-1">
                    <div className="border-2 border-pink-600 rounded-md w-5 h-6 flex justify-center items-end pb-0.5">
                      <div className="w-1.5 h-1.5 bg-pink-600 rounded-full"></div>
                    </div>
                    <div className="flex flex-col items-start leading-none mt-1">
                      <span className="text-pink-600 font-bold tracking-tighter text-lg">dhaksha</span>
                      <span className="text-[6px] text-pink-600 tracking-widest font-bold self-end pr-1">DRONES</span>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-[#0070c0] font-bold mt-1 tracking-wide">
                  Authorized Service Centre for Dhaksha Drones
                </div>
              </div>
            </div>

            {/* Company Header Table */}
            <table className="w-full border-collapse border border-black mb-0 table-fixed">
              <tbody>
                <tr>
                  <td className="border border-black p-1 w-[15%] text-center align-middle h-14">
                    {/* Left Dhaksha Logo Box */}
                    <div className="flex flex-col mx-auto items-center justify-center">
                      <div className="border border-black rounded w-4 h-5 flex justify-center items-end pb-px mb-0.5">
                        <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                      </div>
                      <span className="text-[8px] font-bold leading-none tracking-tighter">dhaksha</span>
                    </div>
                  </td>
                  <td className="border border-black p-2 w-[55%] text-center align-middle">
                    <h1 className="text-lg font-bold font-serif tracking-wide">Dhaksha Unmanned Systems Pvt Ltd</h1>
                  </td>
                  <td className="p-0 w-[30%] align-top text-[10px] font-bold font-serif">
                    <div className="border-b border-black p-1 h-[33%] flex items-center pl-2"><span className="w-16">Doc. No:</span></div>
                    <div className="border-b border-black p-1 h-[33%] flex items-center pl-2"><span className="w-16">Rev. No:</span></div>
                    <div className="p-1 h-[33%] flex items-center pl-2"><span className="w-16">Rev. Date:</span></div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Title Banner */}
            <div className="bg-[#1f4e78] text-white text-center py-1.5 border-x border-black font-bold text-sm tracking-wide">
              Service Feedback Form
            </div>

            {/* Customer Feedback Sub-banner */}
            <div className="bg-white text-black text-center py-1 border-x border-b border-black font-bold text-xs tracking-wide">
              Customer Feedback
            </div>

            <table className="w-full border-collapse border-x border-b border-black text-[10px] table-fixed">
              <tbody>
                <tr className="h-8">
                  <td className="border border-black p-1.5 font-bold w-[65%]" colSpan={2}>
                    Service Engineer Name: <span className="font-normal block text-[11px] mt-1">{request.assignedEngineerName || ''}</span>
                  </td>
                  <td className="border border-black p-1.5 font-bold w-[35%]" colSpan={5}>
                    Date: <span className="font-normal block text-[11px] mt-1">{feedback?.createdAt ? format(new Date(feedback.createdAt), 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy')}</span>
                  </td>
                </tr>
                {/* Questions Header */}
                <tr className="bg-[#d9e2f3] font-bold text-center h-8">
                  <td className="border border-black p-1 w-[8%] align-middle font-bold text-[11px]">S. No</td>
                  <td className="border border-black p-1 w-[52%] align-middle font-bold text-[11px]">Question</td>
                  <td className="border border-black p-1 w-[40%]" colSpan={5}>
                    Rating (Tick the relevant option)
                  </td>
                </tr>
                
                {questions.map((q, idx) => (
                  <tr key={idx} className="h-10">
                    <td className="border border-black p-2 text-center align-middle font-bold">{idx + 1}</td>
                    <td className="border border-black px-2 py-1 align-middle leading-snug">{q}</td>
                    <RatingCell value={5} selectedRate={feedback?.rating} />
                    <RatingCell value={4} selectedRate={feedback?.rating} />
                    <RatingCell value={3} selectedRate={feedback?.rating} />
                    <RatingCell value={2} selectedRate={feedback?.rating} />
                    <RatingCell value={1} selectedRate={feedback?.rating} />
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Remarks and Signature block */}
            <table className="w-full border-collapse border-x border-b border-black text-[10px] table-fixed">
              <tbody>
                <tr>
                  <td className="border-r border-black p-2 align-top h-28 w-[75%] font-bold">
                    Remarks:
                    <div className="font-normal mt-2 whitespace-pre-wrap">{feedback?.remarks || ''}</div>
                  </td>
                  <td className="p-2 w-[25%] relative text-center">
                    {customerSignature ? (
                       <img src={customerSignature} alt="Cust Sign" className="max-h-20 mx-auto absolute bottom-8 inset-x-0" />
                    ) : (
                       <div className="h-20"></div>
                    )}
                    <div className="absolute inset-x-0 bottom-4 font-bold">Customer Sign</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{pageBreakBefore: "always"}}></div>

          {/* PAGE 2 */}
          <div className="px-8 py-8 w-full mt-4">
            <div className="font-bold text-sm mb-1 font-serif">Document Control:</div>
            
            {/* Doc Control Banner */}
            <div className="bg-[#1f4e78] text-white text-center py-1.5 border-x border-t border-black font-bold text-xs tracking-wide">
              Dhaksha Unmanned Systems Pvt Ltd
            </div>
            
            <table className="w-full border-collapse border-x border-b border-black text-[10px] table-fixed">
              <thead>
                <tr className="bg-[#1f4e78] text-white font-bold text-center h-8">
                  <th className="border border-black p-1.5 font-bold" colSpan={5}>Revision History</th>
                </tr>
                <tr className="bg-[#1f4e78] text-white font-bold text-center h-8">
                  <th className="border border-white p-1.5 w-[15%] font-bold">Version</th>
                  <th className="border border-white p-1.5 w-[20%] font-bold">Approved by</th>
                  <th className="border border-white p-1.5 w-[18%] font-bold">Revision date</th>
                  <th className="border border-white p-1.5 w-[32%] font-bold">Description of changes</th>
                  <th className="border border-white p-1.5 w-[15%] font-bold">Author</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 9 }).map((_, i) => (
                  <tr key={i} className="h-6">
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
    );
  }
);
FeedbackPDF.displayName = 'FeedbackPDF';
