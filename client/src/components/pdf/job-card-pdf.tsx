import React, { forwardRef } from 'react';
import { format } from 'date-fns';

interface JobCardPDFProps {
  request: any;
  jobCard: any;
  engineerSignature?: string;
  customerSignature?: string;
}

export const JobCardPDF = forwardRef<HTMLDivElement, JobCardPDFProps>(
  ({ request, jobCard, engineerSignature, customerSignature }, ref) => {
    return (
      <div 
        ref={ref} 
        className="bg-white text-black font-sans px-8 py-10 w-[210mm] min-h-[297mm] mx-auto text-[11px] leading-tight"
      >
        {/* Top Header */}
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
          Authorized Service Centre
        </div>

        {/* Title */}
        <div className="bg-[#1e3a5f] text-white text-center py-2 border-x-2 border-t-2 border-slate-800">
          <h2 className="text-xl font-bold font-serif tracking-wider">JOB CARD / SERVICE REPORT</h2>
        </div>

        {/* Request Info Box */}
        <table className="w-full border-collapse border-2 border-slate-800 mb-4">
          <tbody>
            <tr>
              <td className="border-r-2 border-b-2 border-slate-800 p-2 w-1/2">
                <span className="font-bold">Job Card No:</span> {jobCard?.id ? `JC-${String(jobCard.id).padStart(4, '0')}` : 'N/A'}
              </td>
              <td className="border-b-2 border-slate-800 p-2 w-1/2">
                <span className="font-bold">Service Request ID:</span> REQ-{String(request.id).padStart(4, '0')}
              </td>
            </tr>
            <tr>
              <td className="border-r-2 border-b-2 border-slate-800 p-2">
                <span className="font-bold">Date Received:</span> {request.createdAt ? format(new Date(request.createdAt), 'dd MMM yyyy') : '-'}
              </td>
              <td className="border-b-2 border-slate-800 p-2">
                <span className="font-bold">Date Completed:</span> {request.completedAt ? format(new Date(request.completedAt), 'dd MMM yyyy') : '-'}
              </td>
            </tr>
            <tr>
              <td className="border-r-2 border-b-2 border-slate-800 p-2">
                <span className="font-bold">Customer Name:</span> {jobCard?.customerName || request.customerName || '-'}
              </td>
              <td className="border-b-2 border-slate-800 p-2">
                <span className="font-bold">Contact No:</span> {request.contactNumber || '-'}
              </td>
            </tr>
            <tr>
              <td className="border-r-2 border-b-2 border-slate-800 p-2">
                <span className="font-bold">Drone Model:</span> {jobCard?.droneModel || request.equipmentModel || '-'}
              </td>
              <td className="border-b-2 border-slate-800 p-2">
                <span className="font-bold">Assigned Engineer:</span> {request.assignedEngineerName || '-'}
              </td>
            </tr>
            <tr>
               <td className="border-r-2 border-slate-800 p-2" colSpan={2}>
                 <span className="font-bold">Customer Address:</span> {request.location || '-'}
               </td>
            </tr>
          </tbody>
        </table>

        {/* Equipment Checklist */}
        <div className="bg-[#e0f0ff] border-x-2 border-t-2 border-slate-800 p-1 text-center font-bold">
          RECEIVED EQUIPMENT CONDITION DIAGNOSIS
        </div>
        <table className="w-full border-collapse border-2 border-slate-800 mb-4 text-[10px]">
          <tbody>
            <tr>
              <td className="border-r border-b border-slate-800 p-1.5 w-[25%] font-bold">Physical Condition</td>
              <td className="border-r border-b border-slate-800 p-1.5 w-[25%]">{jobCard?.physicalCondition || 'N/A'}</td>
              <td className="border-r border-b border-slate-800 p-1.5 w-[25%] font-bold">Propeller Status</td>
              <td className="border-b border-slate-800 p-1.5 w-[25%]">{jobCard?.propellerStatus || 'N/A'}</td>
            </tr>
            <tr>
              <td className="border-r border-b border-slate-800 p-1.5 font-bold">Motor Status</td>
              <td className="border-r border-b border-slate-800 p-1.5">{jobCard?.motorStatus || 'N/A'}</td>
              <td className="border-r border-b border-slate-800 p-1.5 font-bold">Battery Status</td>
              <td className="border-b border-slate-800 p-1.5">{jobCard?.batteryStatus || 'N/A'}</td>
            </tr>
            <tr>
              <td className="border-r border-b border-slate-800 p-1.5 font-bold">Camera/Gimbal Status</td>
              <td className="border-r border-b border-slate-800 p-1.5">{jobCard?.cameraGimbalStatus || 'N/A'}</td>
              <td className="border-r border-b border-slate-800 p-1.5 font-bold">GPS Module</td>
              <td className="border-b border-slate-800 p-1.5">{jobCard?.gpsModule || 'N/A'}</td>
            </tr>
            <tr>
              <td className="border-r border-slate-800 p-1.5 font-bold">Remote Controller</td>
              <td className="border-r border-slate-800 p-1.5">{jobCard?.remoteController || 'N/A'}</td>
              <td className="border-r border-slate-800 p-1.5 font-bold">Other Accessories</td>
              <td className="border-slate-800 p-1.5">Standard Toolkit</td>
            </tr>
          </tbody>
        </table>

        {/* Engineer Analysis */}
        <div className="bg-[#e0f0ff] border-x-2 border-t-2 border-slate-800 p-1 text-center font-bold">
          ENGINEER ANALYSIS & RESOLUTION
        </div>
        <table className="w-full border-collapse border-2 border-slate-800 mb-4 h-48">
          <tbody>
             <tr>
               <td className="border-b border-slate-800 p-2 align-top h-12">
                 <span className="font-bold text-xs">Reported Issue / Diagnosis:</span>
                 <p className="mt-1">{jobCard?.diagnosis || 'No diagnosis recorded'}</p>
               </td>
             </tr>
             <tr>
               <td className="border-b border-slate-800 p-2 align-top h-12">
                 <span className="font-bold text-xs">Root Cause Analysis:</span>
                 <p className="mt-1">{jobCard?.rootCause || 'N/A'}</p>
               </td>
             </tr>
             <tr>
               <td className="border-b border-slate-800 p-2 align-top h-12">
                 <span className="font-bold text-xs">Action Taken / Resolution:</span>
                 <p className="mt-1">{jobCard?.actionTaken || 'N/A'}</p>
               </td>
             </tr>
             <tr>
               <td className="border-b border-slate-800 p-2 align-top h-12">
                 <span className="font-bold text-xs">Parts Replaced / Repaired:</span>
                 <p className="mt-1">{jobCard?.partsReplaced || 'None'}</p>
               </td>
             </tr>
             <tr>
               <td className="border-slate-800 p-2 align-top h-12">
                 <span className="font-bold text-xs">Flight Test Observations & Recommendations:</span>
                 <p className="mt-1 max-w-full inline-block">Obs: {jobCard?.observations || 'Pending'}</p>
                 <p className="mt-1 max-w-full inline-block block">Rec: {jobCard?.recommendations || 'None'}</p>
               </td>
             </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <table className="w-full border-collapse border-2 border-slate-800 mt-12 h-24">
           <tbody>
              <tr>
                <td className="border-r-2 border-slate-800 p-2 w-1/2 text-center align-bottom relative">
                   <div className="absolute top-2 left-2 text-xs font-bold text-left">Service Engineer</div>
                   {engineerSignature ? (
                     <img src={engineerSignature} alt="Engineer Signature" className="max-h-16 mx-auto mb-1" />
                   ) : <div className="h-16"></div>}
                   <div className="border-t border-slate-800 pt-1 w-3/4 mx-auto text-[10px]">
                     {request.assignedEngineerName || 'Signature'}
                   </div>
                </td>
                <td className="p-2 w-1/2 text-center align-bottom relative">
                   <div className="absolute top-2 left-2 text-xs font-bold text-left">Customer / Client</div>
                   {customerSignature ? (
                     <img src={customerSignature} alt="Customer Signature" className="max-h-16 mx-auto mb-1" />
                   ) : <div className="h-16"></div>}
                   <div className="border-t border-slate-800 pt-1 w-3/4 mx-auto text-[10px]">
                     {jobCard?.customerName || request.customerName || 'Signature'}
                   </div>
                </td>
              </tr>
           </tbody>
        </table>

        {/* Disclaimer */}
         <div className="text-[9px] text-gray-500 mt-4 text-center px-4">
           This Job Card is system-generated and digital signatures represent valid authorization. Warranty terms apply as per company policy. For any queries regarding this service report, please contact the support center.
         </div>
      </div>
    );
  }
);
JobCardPDF.displayName = 'JobCardPDF';
