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
    
    // Checkbox helper component matching PDF
    const CheckBox = ({ label }: { label: string }) => (
      <span className="inline-flex items-center gap-0.5 ml-1 mr-1">
        {label} <span className="inline-block w-2.5 h-2.5 border border-black text-white text-[8px] leading-none text-center"></span>
      </span>
    );

    return (
      <div 
        ref={ref} 
        className="bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto text-[9px] leading-tight"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div className="px-8 py-8 w-full h-full">

          {/* Top Header */}
          <div className="flex justify-end mb-2">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                {/* HANRON Logo simulation */}
                <div className="flex items-center">
                   <div className="text-[#00b4d8] text-2xl rotate-45 mr-1 font-bold">⬢</div>
                   <span className="text-[#00b4d8] font-bold text-2xl tracking-tighter" style={{ fontFamily: "Arial" }}>HANRON</span>
                </div>
                <span className="text-pink-600 font-light text-3xl mx-1">|</span>
                {/* Dhaksha Right Logo simulation */}
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
                <td className="border border-black p-1 w-[15%] text-center align-middle h-12">
                  {/* Left Dhaksha Logo Box */}
                  <div className="flex flex-col mx-auto items-center justify-center">
                    <div className="border border-black rounded w-3 h-4 flex justify-center items-end pb-px mb-px">
                       <div className="w-1 h-1 bg-black rounded-full"></div>
                    </div>
                    <span className="text-[7px] font-bold leading-none tracking-tighter">dhaksha</span>
                  </div>
                </td>
                <td className="border border-black p-2 w-[55%] text-center align-middle">
                  <h1 className="text-sm font-bold font-serif tracking-wide">Dhaksha Unmanned Systems Pvt Ltd</h1>
                </td>
                <td className="p-0 w-[30%] align-top text-[9px] font-bold">
                  <div className="border-b border-black p-1 pl-2 h-[33%] flex items-center"><span className="w-16">Doc. No:</span></div>
                  <div className="border-b border-black p-1 pl-2 h-[33%] flex items-center"><span className="w-16">Rev. No:</span></div>
                  <div className="p-1 pl-2 h-[33%] flex items-center"><span className="w-16">Rev. Date:</span></div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Title Banner */}
          <div className="bg-[#1f4e78] text-white text-center py-1 border-x border-black font-bold text-xs tracking-wide">
            Service Job Card
          </div>

          {/* Main Table section */}
          <table className="w-full border-collapse border border-black text-[9px] table-fixed">
            <tbody>
              {/* Row 1 */}
              <tr className="h-6">
                <td className="border border-black p-1 font-bold w-[25%] align-top">
                  Date of initiation:
                  <span className="font-normal block mt-0.5">{request.createdAt ? format(new Date(request.createdAt), 'dd-MM-yyyy') : ''}</span>
                </td>
                <td className="border border-black p-1 font-bold w-[20%] align-top">
                  Service Start Time:
                </td>
                <td className="border border-black p-1 font-bold w-[20%] align-top">
                  Service End Time:
                  <span className="font-normal block mt-0.5">{request.completedAt ? format(new Date(request.completedAt), 'HH:mm') : ''}</span>
                </td>
                <td className="border border-black p-1 font-bold w-[35%] align-top">
                  Service Location: Factory <CheckBox label="" /> / Field <CheckBox label="" /> /Dealer/ASSDP<CheckBox label="" />
                </td>
              </tr>
              {/* Row 2 */}
              <tr className="h-6">
                <td className="border border-black p-1 font-bold align-top" colSpan={2}>
                  Model Details:
                  &nbsp; E10 <CheckBox label="" /> E10P <CheckBox label="" /> DHQ4 <CheckBox label="" /> Others <CheckBox label="" />
                  (Specify:<span className="inline-block w-24 text-center border-b border-black font-normal">{jobCard?.droneModel || request.equipmentModel || ' '}</span>)
                </td>
                <td className="border border-black p-1 font-bold align-top">
                  CRM Ticket Number:<br/>
                  <span className="font-normal">REQ-{String(request.id).padStart(4, '0')}</span>
                </td>
                <td className="border border-black p-1 font-bold align-top">
                  SAP Repair Order Number:<br/>
                </td>
              </tr>
              {/* Row 3 - Customer details complex spanning */}
              <tr className="h-6">
                <td className="border border-black p-1 font-bold w-[25%]">Customer Name</td>
                <td className="border border-black p-1 w-[20%]">{jobCard?.customerName || request.customerName || ''}</td>
                <td className="border border-black p-1 font-bold align-top" colSpan={2} rowSpan={5}>
                  <div>Customer Details: IFFCO<CheckBox label="" /> CIL<CheckBox label="" /> CIL DIDI<CheckBox label="" /> Dealers & Others<CheckBox label="" /> (Specify: <span className="inline-block w-20 text-center font-normal">{' '}</span>)</div>
                  <div className="mt-1">Customer Address: <span className="font-normal">{request.location || ''}</span></div>
                  <div className="mt-3">Customer Pin Code:</div>
                  <div className="mt-1">Customer Contact Number: <span className="font-normal">{request.contactNumber || ''}</span></div>
                </td>
              </tr>
              <tr className="h-6">
                <td className="border border-black p-1 font-bold">Serial Number</td>
                <td className="border border-black p-1">{request.serialNumber || ''}</td>
              </tr>
              <tr className="h-6">
                <td className="border border-black p-1 font-bold">UIN No</td>
                <td className="border border-black p-1"></td>
              </tr>
              <tr className="h-6">
                <td className="border border-black p-1 font-bold">Service Assigned to:</td>
                <td className="border border-black p-1">{request.assignedEngineerName || ''}</td>
              </tr>
              <tr className="h-6">
                <td className="border border-black p-1 font-bold">Model Purchase Date</td>
                <td className="border border-black p-1"></td>
              </tr>

              {/* Inward Check List */}
              <tr className="h-6">
                <td className="border border-black p-1 font-bold">Inward Check List</td>
                <td className="border border-black p-1 font-bold flex items-center gap-1 border-0 h-full">Filled by: <span className="border-b border-black flex-1"></span></td>
                <td className="border border-black p-1 font-bold" colSpan={2}>
                  Drone<CheckBox label="" /> RC<CheckBox label="" /> Drone Box<CheckBox label="" /> Charger<CheckBox label="" />Battery<CheckBox label="" /> 
                  ( Specify Qty & SN: <span className="w-16 border-b border-black inline-block font-normal"></span> ), Other <CheckBox label="(Detail:" /> <span className="w-16 border-b border-black inline-block font-normal"></span> )
                </td>
              </tr>
              
              {/* Outward Check List */}
              <tr className="h-6">
                <td className="border border-black p-1 font-bold">Outward Check List</td>
                <td className="border border-black p-1 font-bold flex items-center gap-1 border-0 h-full">Filled by: <span className="border-b border-black flex-1"></span></td>
                <td className="border border-black p-1 font-bold" colSpan={2}>
                  Drone<CheckBox label="" /> RC<CheckBox label="" /> Drone Box<CheckBox label="" /> Charger<CheckBox label="" />Battery<CheckBox label="" /> 
                  ( Specify Qty & SN: <span className="w-16 border-b border-black inline-block font-normal"></span> ), Other <CheckBox label="(Detail:" /> <span className="w-16 border-b border-black inline-block font-normal"></span> )
                </td>
              </tr>

              {/* Service Type */}
              <tr className="h-6">
                <td className="border border-black p-1 font-bold" colSpan={2}>
                  Service Type: (To be decided by Technical <br/>Team)
                </td>
                <td className="border border-black p-1 font-bold align-middle">
                   Warranty &nbsp; &nbsp; &nbsp; <CheckBox label="" /> &nbsp; &nbsp; &nbsp; 
                   Paid &nbsp; &nbsp; &nbsp; <CheckBox label="" /> &nbsp; &nbsp; &nbsp; 
                   Insurance &nbsp; &nbsp; &nbsp; <CheckBox label="" />
                </td>
                <td className="border border-black p-1 font-bold align-middle">
                   Yes &nbsp; &nbsp; &nbsp; <CheckBox label="" /> &nbsp; &nbsp; &nbsp; 
                   No &nbsp; &nbsp; &nbsp; <CheckBox label="" />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Observation Table */}
          <table className="w-full border-collapse border-x border-b border-black text-[9px] table-fixed">
            <thead>
              <tr className="bg-[#d9e2f3] font-bold text-center h-8 leading-tight">
                <th className="border border-black p-1 w-[8%] font-bold">Date of<br/>Issue</th>
                <th className="border border-black p-1 w-[20%] font-bold">Customer statement</th>
                <th className="border border-black p-1 w-[20%] font-bold">Observation during inspection of drone</th>
                <th className="border border-black p-1 w-[18%] font-bold">Actual diagnosis<br/>observation on flight log</th>
                <th className="border border-black p-1 w-[17%] font-bold">Root cause</th>
                <th className="border border-black p-1 w-[17%] font-bold">Corrective action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1 h-44 align-top text-center font-bold">
                  {format(new Date(), 'dd/MM/yyyy')}
                </td>
                <td className="border border-black p-1 h-44 align-top relative">
                  {jobCard?.diagnosis || ''}
                  <div className="absolute bottom-1 left-1 font-bold">Filled by:</div>
                </td>
                <td className="border border-black p-1 h-44 align-top relative">
                  {jobCard?.observations || ''}
                  <div className="absolute bottom-1 left-1 font-bold">Filled by:</div>
                </td>
                <td className="border border-black p-1 h-44 align-top relative">
                  
                  <div className="absolute bottom-1 left-1 font-bold">Filled by:</div>
                </td>
                <td className="border border-black p-1 h-44 align-top relative">
                  {jobCard?.rootCause || ''}
                  <div className="absolute bottom-1 left-1 font-bold">Filled by:</div>
                </td>
                <td className="border border-black p-1 h-44 align-top relative">
                  {jobCard?.actionTaken || ''}
                  <div className="absolute bottom-1 left-1 font-bold">Filled By:</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Parts Usage List */}
          <div className="bg-[#1f4e78] text-white text-center py-1 border-x border-b border-black font-bold text-xs tracking-wide">
            Parts Usage List
          </div>
          <table className="w-full border-collapse border-x border-b border-black text-[9px] table-fixed">
            <thead>
              <tr className="bg-[#d9e2f3] font-bold text-center h-6">
                <th className="border border-black p-1 w-[6%] font-bold">Sl.No.</th>
                <th className="border border-black p-1 w-[14%] font-bold">Part Number</th>
                <th className="border border-black p-1 w-[22%] font-bold">Part Description</th>
                <th className="border border-black p-1 w-[8%] font-bold">Qty</th>
                <th className="border border-black p-1 w-[6%] font-bold">Sl.No.</th>
                <th className="border border-black p-1 w-[14%] font-bold">Part Number</th>
                <th className="border border-black p-1 w-[22%] font-bold">Part Description</th>
                <th className="border border-black p-1 w-[8%] font-bold">Qty</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="h-5">
                  <td className="border border-black p-1 text-center font-bold">{i + 1}</td>
                  <td className="border border-black p-1"></td>
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
          <table className="w-full border-collapse border-x border-b border-black text-[9px] table-fixed">
            <thead>
              <tr className="font-bold text-center h-6">
                <th className="border border-black p-1 w-[25%] font-bold">Service Engineer</th>
                <th className="border border-black p-1 w-[25%] font-bold">Service Material Control Team (Stores)</th>
                <th className="border border-black p-1 w-[25%] font-bold">Service Manager Approval</th>
                <th className="border border-black p-1 w-[25%] font-bold">Quality</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1 h-14 text-center align-middle relative">
                  {engineerSignature && <img src={engineerSignature} alt="Eng Sign" className="max-h-12 mx-auto absolute bottom-1 inset-x-0" />}
                </td>
                <td className="border border-black p-1 h-14 text-center align-middle"></td>
                <td className="border border-black p-1 h-14 text-center align-middle"></td>
                <td className="border border-black p-1 h-14 text-center align-middle"></td>
              </tr>
            </tbody>
          </table>

          {/* Final blocks */}
          <table className="w-full border-collapse border-x border-b border-black text-[9px] table-fixed">
             <tbody>
                <tr>
                  <td className="border-r border-black p-2 align-top h-20 w-[75%] font-bold">
                    Engineer Remarks /Pilot Remarks :
                    <div className="font-normal mt-2">{jobCard?.recommendations || ''}</div>
                  </td>
                  <td className="p-2 w-[25%] row-span-2 relative text-center">
                    {customerSignature ? (
                       <img src={customerSignature} alt="Cust Sign" className="max-h-16 mx-auto absolute bottom-8 inset-x-0" />
                    ) : (
                       <div className="h-16"></div>
                    )}
                    <div className="absolute inset-x-0 bottom-4 font-bold text-[10px]">Customer Signature</div>
                  </td>
                </tr>
                <tr>
                  <td className="border-r border-t border-black p-2 align-top h-14 w-[75%] font-bold leading-relaxed">
                    Note to customer: Please review the service job card carefully before signing to ensure all details are accurate and satisfactory. Kindly sign on the card after ensuring that all service requirements are fulfilled and validated.
                  </td>
                </tr>
             </tbody>
          </table>

        </div>
      </div>
    );
  }
);
JobCardPDF.displayName = 'JobCardPDF';
