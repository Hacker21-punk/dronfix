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

    return (
      <div 
        ref={ref} 
        className="bg-white text-black font-sans px-8 py-10 w-[210mm] min-h-[297mm] mx-auto"
      >
        {/* Top Logos */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[#00b4d8] font-bold text-2xl tracking-tighter italic">HANRON</span>
            <span className="text-gray-300 mx-2 text-3xl font-light">|</span>
            <div className="flex flex-col">
              <span className="text-pink-600 font-bold tracking-tight leading-none">dhaksha</span>
              <span className="text-[6px] tracking-widest text-pink-600 font-bold ml-1">DRONES</span>
            </div>
          </div>
        </div>
        <div className="text-right text-[10px] text-blue-600 font-semibold mb-2">
          Authorized Service Centre for Dhaksha Drones
        </div>

        {/* Header Table */}
        <table className="w-full border-collapse border-2 border-slate-800 mb-0">
          <tbody>
            <tr>
              <td className="border-2 border-slate-800 p-2 w-[15%] text-center align-middle">
                {/* Dhaksha Logo Box */}
                <div className="flex flex-col mx-auto items-center justify-center">
                   <div className="h-6 w-4 border-2 border-slate-800 rounded-sm mb-1"></div>
                   <span className="text-[8px] font-bold">dhaksha <span className="text-[5px]">DRONES</span></span>
                </div>
              </td>
              <td className="border-2 border-slate-800 p-2 w-[60%] text-center align-middle">
                <h1 className="text-xl font-bold font-serif tracking-wide">Dhaksha Unmanned Systems Pvt Ltd</h1>
              </td>
              <td className="border-2 border-slate-800 p-0 w-[25%] align-top text-[10px]">
                <div className="border-b border-slate-800 p-1 flex font-bold"><span className="w-16">Doc. No:</span></div>
                <div className="border-b border-slate-800 p-1 flex font-bold"><span className="w-16">Rev. No:</span></div>
                <div className="p-1 flex font-bold"><span className="w-16">Rev. Date:</span></div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Titles */}
        <div className="bg-[#1e3a5f] text-white text-center py-1.5 border-x-2 border-slate-800">
          <h2 className="text-lg font-bold font-serif">Service Feedback Form</h2>
        </div>
        <div className="bg-white text-black text-center py-1 border-x-2 border-b-2 border-slate-800">
          <h3 className="text-sm font-bold">Customer Feedback</h3>
        </div>

        {/* Meta Row */}
        <table className="w-full border-collapse border-x-2 border-b-2 border-slate-800 text-xs">
          <tbody>
            <tr>
              <td className="border-r-2 border-slate-800 p-2 w-[65%] font-bold">
                Service Engineer Name: <span className="font-normal">{request.assignedEngineerName || ''}</span>
              </td>
              <td className="p-2 w-[35%] font-bold">
                Date: <span className="font-normal">{format(new Date(), 'dd/MM/yyyy')}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Questions Table */}
        <table className="w-full border-collapse border-x-2 border-b-2 border-slate-800 text-[11px]">
          <thead>
            <tr className="bg-[#e0f0ff]"> {/* Light blue header */}
              <th className="border-2 border-slate-800 p-2 w-[8%] text-center font-bold">S. No</th>
              <th className="border-2 border-slate-800 p-2 w-[57%] text-center font-bold">Question</th>
              <th className="border-2 border-slate-800 p-2 w-[35%] text-center font-bold" colSpan={5}>Rating (Tick the relevant option)</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, idx) => {
              const rating = feedback?.rating || 0;
              return (
                <tr key={idx}>
                  <td className="border-2 border-slate-800 p-2 text-center">{idx + 1}</td>
                  <td className="border-2 border-slate-800 p-2">{q}</td>
                  {[5, 4, 3, 2, 1].map((val) => (
                    <td key={val} className="border-2 border-slate-800 p-2 text-center w-[7%]">
                      {rating === val ? <span className="font-bold text-lg leading-none">✓</span> : val}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Remarks and Sign */}
        <table className="w-full border-collapse border-x-2 border-b-2 border-slate-800 text-xs h-32">
          <tbody>
            <tr>
              <td className="border-r-2 border-slate-800 p-2 w-[70%] align-top">
                <span className="font-bold">Remarks:</span>
                <p className="mt-2 text-sm">{feedback?.remarks || ''}</p>
              </td>
              <td className="p-2 w-[30%] align-bottom text-center">
                {customerSignature && (
                  <img src={customerSignature} alt="Customer Signature" className="max-h-16 mx-auto mb-1" />
                )}
                <span className="font-bold text-[10px]">Customer Sign</span>
              </td>
            </tr>
          </tbody>
        </table>
        
        {/* Page breaks can be tricky in html2pdf but it automatically breaks if height > 297mm. 
            We'll add a forced page break here. */}
        <div className="html2pdf__page-break"></div>

        {/* PAGE 2 - Document Control */}
        <div className="mt-8">
          <h4 className="font-bold text-sm mb-1">Document Control:</h4>
          <table className="w-full border-collapse border-2 border-slate-800 text-[11px]">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th colSpan={5} className="border border-slate-800 p-1 text-center font-bold">Dhaksha Unmanned Systems Pvt Ltd</th>
              </tr>
              <tr className="bg-[#1e3a5f] text-white">
                <th colSpan={5} className="border border-slate-800 p-1 text-center font-bold">Revision History</th>
              </tr>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="border border-slate-800 p-2 text-center w-[15%]">Version</th>
                <th className="border border-slate-800 p-2 text-center w-[20%]">Approved by</th>
                <th className="border border-slate-800 p-2 text-center w-[20%]">Revision date</th>
                <th className="border border-slate-800 p-2 text-center w-[30%]">Description of changes</th>
                <th className="border border-slate-800 p-2 text-center w-[15%]">Author</th>
              </tr>
            </thead>
            <tbody>
              {Array(6).fill(0).map((_, i) => (
                <tr key={i} className="h-6">
                  <td className="border border-slate-800"></td>
                  <td className="border border-slate-800"></td>
                  <td className="border border-slate-800"></td>
                  <td className="border border-slate-800"></td>
                  <td className="border border-slate-800"></td>
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
