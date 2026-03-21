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
    
    // Checkbox helper component
    const CheckBox = ({ label, checked }: { label: string, checked?: boolean }) => (
      <span className="inline-flex items-center gap-1 mr-3">
        {label} <span className="inline-block w-2.5 h-2.5 border border-black">{checked ? '✓' : ''}</span>
      </span>
    );

    return (
      <div 
        ref={ref} 
        className="bg-white text-black font-sans px-8 py-8 w-[210mm] min-h-[297mm] mx-auto text-[10px] leading-snug"
      >
        {/* Top Header */}
        <div className="flex justify-end mb-2">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-[#00b4d8] font-bold text-3xl tracking-tighter italic">HANRON</span>
              <span className="text-gray-300 mx-2 text-3xl font-light">|</span>
              <div className="flex flex-col items-center">
                <span className="text-pink-600 font-bold tracking-tight leading-none text-xl">dhaksha</span>
                <span className="text-[6px] tracking-widest text-[#1e3a5f] font-bold">DRONES</span>
              </div>
            </div>
            <div className="text-[10px] text-[#00b4d8] font-bold mt-1">
              Authorized Service Centre for Dhaksha Drones
            </div>
          </div>
        </div>

        {/* Company Header Table */}
        <table className="w-full border-collapse border-2 border-black mb-0 table-fixed">
          <tbody>
            <tr>
              <td className="border-r-2 border-black p-1 w-[15%] text-center align-middle">
                {/* Dhaksha Logo Box */}
                <div className="flex flex-col mx-auto items-center justify-center">
                   <div className="h-5 w-3 border border-slate-800 rounded-sm mb-0.5"></div>
                   <span className="text-[7px] font-bold leading-none">dhaksha <span className="text-[5px]">DRONES</span></span>
                </div>
              </td>
              <td className="border-r-2 border-black p-2 w-[55%] text-center align-middle">
                <h1 className="text-lg font-bold font-serif tracking-wide">Dhaksha Unmanned Systems Pvt Ltd</h1>
              </td>
              <td className="p-0 w-[30%] align-top text-[10px] font-bold">
                <div className="border-b-2 border-black p-1 flex"><span className="w-16">Doc. No:</span></div>
                <div className="border-b-2 border-black p-1 flex"><span className="w-16">Rev. No:</span></div>
                <div className="p-1 flex"><span className="w-16">Rev. Date:</span></div>
              </td>
            </tr>
          </tbody>
        </table>

         {/* Title */}
         <div className="bg-[#1e3a5f] text-white text-center py-1 border-x-2 border-black font-bold text-sm tracking-wide">
          Service Job Card
        </div>

        {/* Huge Main Table section */}
        <table className="w-full border-collapse border-2 border-black text-[9px] table-fixed">
          <tbody>
            {/* Row 1 */}
            <tr>
              <td className="border border-black p-1 font-bold w-[20%]">Date of initiation: <span className="font-normal block mt-1">{request.createdAt ? format(new Date(request.createdAt), 'dd-MM-yyyy') : ''}</span></td>
              <td className="border border-black p-1 font-bold w-[25%]">Service Start Time:</td>
              <td className="border border-black p-1 font-bold w-[25%]">Service End Time: <span className="font-normal block mt-1">{request.completedAt ? format(new Date(request.completedAt), 'dd-MM-yyyy') : ''}</span></td>
              <td className="border border-black p-1 font-bold w-[30%]">
                Service Location: <CheckBox label="Factory" /> <CheckBox label="Field" /> <CheckBox label="Dealer/ASSDP" />
              </td>
            </tr>
            {/* Row 2 */}
            <tr>
              <td className="border border-black p-1 font-bold" colSpan={2}>
                Model Details: <CheckBox label="E10" /> <CheckBox label="E10P" /> <CheckBox label="DHQ4" /> <CheckBox label="Others" /> (Specify: <span className="underline ml-0.5 mr-2">{jobCard?.droneModel || request.equipmentModel || '              '}</span>)
              </td>
              <td className="border border-black p-1 font-bold">
                CRM Ticket Number:<br/>REQ-{String(request.id).padStart(4, '0')}
              </td>
              <td className="border border-black p-1 font-bold">
                SAP Repair Order Number:<br/>
              </td>
            </tr>
            {/* Row 3 - Customer details complex spanning */}
            <tr>
              <td className="border border-black p-1 font-bold w-[20%]">Customer Name</td>
              <td className="border border-black p-1 w-[30%]">{jobCard?.customerName || request.customerName || ''}</td>
              <td className="border border-black p-1 font-bold align-top" colSpan={2} rowSpan={5}>
                <div>Customer Details: <CheckBox label="IFFCO" /> <CheckBox label="CIL" /> <CheckBox label="CIL DIDI" /> <CheckBox label="Dealers & Others" /> (Specify: ______________)</div>
                <div className="mt-3">Customer Address:<br/><span className="font-normal">{request.location || ''}</span></div>
                <div className="mt-6">Customer Pin Code:</div>
                <div className="mt-1">Customer Contact Number: <span className="font-normal">{request.contactNumber || ''}</span></div>
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 font-bold">Serial Number</td>
              <td className="border border-black p-1">{request.serialNumber || ''}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 font-bold">UIN No</td>
              <td className="border border-black p-1"></td>
            </tr>
            <tr>
              <td className="border border-black p-1 font-bold">Service Assigned to:</td>
              <td className="border border-black p-1">{request.assignedEngineerName || ''}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 font-bold">Model Purchase Date</td>
              <td className="border border-black p-1"></td>
            </tr>

            {/* Inward / Outward */}
            <tr>
              <td className="border border-black p-1 font-bold">Inward Check List</td>
              <td className="border border-black p-1 font-bold text-[8px] flex items-center gap-1 border-r-0 border-l-0 border-t-0 border-b-0 h-full">Filled by:<span className="border-b border-black w-16 inline-block"></span></td>
              <td className="border border-black p-1 font-bold" colSpan={2}>
                 <CheckBox label="Drone" /> <CheckBox label="RC" /> <CheckBox label="Drone Box" /> <CheckBox label="Charger" /> <CheckBox label="Battery" /> ( Specify Qty & SN: <span className="w-16 border-b border-black inline-block"></span> ), Other <CheckBox label="(Detail:" /> <span className="w-16 border-b border-black inline-block"></span> )
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 font-bold">Outward Check List</td>
              <td className="border border-black p-1 font-bold text-[8px] flex items-center gap-1 border-r-0 border-l-0 border-t-0 border-b-0 h-full">Filled by:<span className="border-b border-black w-16 inline-block"></span></td>
              <td className="border border-black p-1 font-bold" colSpan={2}>
                 <CheckBox label="Drone" /> <CheckBox label="RC" /> <CheckBox label="Drone Box" /> <CheckBox label="Charger" /> <CheckBox label="Battery" /> ( Specify Qty & SN: <span className="w-16 border-b border-black inline-block"></span> ), Other <CheckBox label="(Detail:" /> <span className="w-16 border-b border-black inline-block"></span> )
              </td>
            </tr>

            {/* Service Type */}
            <tr>
              <td className="border border-black p-1 font-bold" colSpan={2}>
                Service Type: (To be decided by Technical Team)
              </td>
              <td className="border border-black p-1 font-bold">
                 <CheckBox label="Warranty" /> &nbsp; &nbsp; <CheckBox label="Paid" /> &nbsp; &nbsp; <CheckBox label="Insurance" />
              </td>
              <td className="border border-black p-1 font-bold">
                 <CheckBox label="Yes" /> &nbsp; &nbsp; <CheckBox label="No" />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Observation Table */}
        <table className="w-full border-collapse border-x-2 border-b-2 border-black text-[9px] table-fixed">
          <thead>
            <tr className="bg-[#e0f0ff]">
              <th className="border border-black p-1 w-[8%] text-center leading-tight">Date of<br/>Issue</th>
              <th className="border border-black p-1 w-[15%] text-center leading-tight">Customer statement</th>
              <th className="border border-black p-1 w-[20%] text-center leading-tight">Observation during inspection of drone</th>
              <th className="border border-black p-1 w-[20%] text-center leading-tight">Actual diagnosis<br/>observation on flight log</th>
              <th className="border border-black p-1 w-[17%] text-center leading-tight">Root cause</th>
              <th className="border border-black p-1 w-[20%] text-center leading-tight">Corrective action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1 h-32 align-top text-center">{format(new Date(), 'dd/MM/yyyy')}</td>
              <td className="border border-black p-1 h-32 align-top">{jobCard?.diagnosis || ''}</td>
              <td className="border border-black p-1 h-32 align-top">{jobCard?.observations || ''}</td>
              <td className="border border-black p-1 h-32 align-top"></td>
              <td className="border border-black p-1 h-32 align-top">{jobCard?.rootCause || ''}</td>
              <td className="border border-black p-1 h-32 align-top">{jobCard?.actionTaken || ''}</td>
            </tr>
            {/* Filled By Row */}
            <tr>
              <td className="border border-black p-1 font-bold text-[8px] h-6 flex items-end">Filled by:</td>
              <td className="border border-black p-1 font-bold text-[8px] h-6 align-bottom border-b-0 border-t-0 border-r-0 border-l-0">Filled by:</td>
              <td className="border border-black p-1 font-bold text-[8px] h-6 align-bottom">Filled by:</td>
              <td className="border border-black p-1 font-bold text-[8px] h-6 align-bottom">Filled by:</td>
              <td className="border border-black p-1 font-bold text-[8px] h-6 align-bottom">Filled by:</td>
              <td className="border border-black p-1 font-bold text-[8px] h-6 align-bottom">Filled By:</td>
            </tr>
          </tbody>
        </table>

        {/* Parts Usage List */}
        <div className="bg-[#1e3a5f] text-white text-center py-1 border-x-2 border-b-2 border-black font-bold text-[11px] tracking-wide">
          Parts Usage List
        </div>
        <table className="w-full border-collapse border-x-2 border-b-2 border-black text-[9px] table-fixed">
          <thead>
            <tr className="bg-[#e0f0ff] font-bold text-center">
              <th className="border border-black p-1 w-[5%]">Sl.No.</th>
              <th className="border border-black p-1 w-[15%]">Part Number</th>
              <th className="border border-black p-1 w-[22%]">Part Description</th>
              <th className="border border-black p-1 w-[8%]">Qty</th>
              <th className="border border-black p-1 w-[5%]">Sl.No.</th>
              <th className="border border-black p-1 w-[15%]">Part Number</th>
              <th className="border border-black p-1 w-[22%]">Part Description</th>
              <th className="border border-black p-1 w-[8%]">Qty</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                <td className="border border-black p-1 text-center font-bold">{i + 1}</td>
                <td className="border border-black p-1 h-4"></td>
                <td className="border border-black p-1">{i === 0 && jobCard?.partsReplaced ? jobCard.partsReplaced : ''}</td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center font-bold">{i + 11}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1 text-center"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures section - 4 columns */}
        <table className="w-full border-collapse border-x-2 border-b-2 border-black text-[9px] table-fixed">
          <thead>
            <tr className="bg-white font-bold text-center">
              <th className="border border-black p-1.5 w-[25%] uppercase">Service Engineer</th>
              <th className="border border-black p-1.5 w-[25%] uppercase">Service Material Control Team (Stores)</th>
              <th className="border border-black p-1.5 w-[25%] uppercase">Service Manager Approval</th>
              <th className="border border-black p-1.5 w-[25%] uppercase">Quality</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1 h-16 text-center align-middle">
                {engineerSignature && <img src={engineerSignature} alt="Eng Sign" className="max-h-12 mx-auto" />}
              </td>
              <td className="border border-black p-1 h-16 text-center align-middle"></td>
              <td className="border border-black p-1 h-16 text-center align-middle"></td>
              <td className="border border-black p-1 h-16 text-center align-middle"></td>
            </tr>
          </tbody>
        </table>

        {/* Final blocks */}
        <table className="w-full border-collapse border-x-2 border-b-2 border-black text-[9px] table-fixed">
           <tbody>
              <tr>
                <td className="border-r-2 border-black p-2 align-top h-20 w-[75%] font-bold">
                  Engineer Remarks / Pilot Remarks :
                  <div className="font-normal mt-2">{jobCard?.recommendations || ''}</div>
                </td>
                <td className="p-2 w-[25%] row-span-2 relative text-center">
                  <div className="absolute inset-x-0 bottom-1 font-bold">Customer Signature</div>
                  {customerSignature && <img src={customerSignature} alt="Cust Sign" className="max-h-16 mx-auto absolute bottom-4 inset-x-0" />}
                </td>
              </tr>
              <tr>
                <td className="border-r-2 border-t-2 border-black p-2 align-top h-14 w-[75%] font-bold text-justify">
                  Note to customer: Please review the service job card carefully before signing to ensure all details are accurate and satisfactory. Kindly sign on the card after ensuring that all service requirements are fulfilled and validated.
                </td>
              </tr>
           </tbody>
        </table>

      </div>
    );
  }
);
JobCardPDF.displayName = 'JobCardPDF';
