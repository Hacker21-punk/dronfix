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
    
    // Pixel-perfect Checkbox matching PDF
    const CheckBox = ({ label, className = "" }: { label: string, className?: string }) => (
      <span className={`inline-flex items-center whitespace-nowrap ${className}`}>
        {label} <span className="inline-block w-[9px] h-[9px] border border-black bg-white ml-0.5 relative top-[-0.5px]"></span>
      </span>
    );

    return (
      <div 
        ref={ref} 
        className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto text-[8px] leading-[1.2]"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div className="px-6 py-6 w-full h-full flex flex-col">

          {/* Top Header */}
          <div className="flex justify-end mb-1">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                {/* HANRON Logo simulation */}
                <div className="flex items-center">
                   <div className="text-[#00b4d8] text-xl rotate-45 mr-0.5 font-bold">⬢</div>
                   <span className="text-[#00b4d8] font-bold text-xl tracking-tighter" style={{ fontFamily: "Arial" }}>HANRON</span>
                </div>
                <span className="text-pink-600 font-light text-2xl mx-0.5">|</span>
                {/* Dhaksha Right Logo simulation */}
                <div className="flex items-center gap-1">
                  <div className="border border-pink-600 rounded w-4 h-5 flex justify-center items-end pb-0.5">
                     <div className="w-1.5 h-1.5 bg-pink-600 rounded-full"></div>
                  </div>
                  <div className="flex flex-col items-start leading-none mt-0.5">
                    <span className="text-pink-600 font-bold tracking-tighter text-base">dhaksha</span>
                    <span className="text-[5px] text-pink-600 tracking-widest font-bold self-end pr-0.5">DRONES</span>
                  </div>
                </div>
              </div>
              <div className="text-[8px] text-[#0070c0] font-bold mt-0.5 tracking-wide">
                Authorized Service Centre for Dhaksha Drones
              </div>
            </div>
          </div>

          {/* Company Header Table */}
          <table className="w-full border-collapse border border-black mb-0 table-fixed">
            <tbody>
              <tr>
                <td className="border border-black p-0.5 w-[12%] text-center align-middle h-10">
                  <div className="flex flex-col mx-auto items-center justify-center">
                    <div className="border border-black rounded w-2.5 h-3 flex justify-center items-end pb-px mb-px">
                       <div className="w-[3px] h-[3px] bg-black rounded-full"></div>
                    </div>
                    <span className="text-[6px] font-bold flex leading-none tracking-tighter">dhaksha</span>
                  </div>
                </td>
                <td className="border border-black p-1 w-[63%] text-center align-middle">
                  <h1 className="text-[14px] font-bold font-serif tracking-wide">Dhaksha Unmanned Systems Pvt Ltd</h1>
                </td>
                <td className="p-0 w-[25%] align-top text-[8px] font-bold">
                  <div className="border-b border-black p-0.5 pl-1.5 h-[33.33%] flex items-center"><span className="w-12">Doc. No:</span></div>
                  <div className="border-b border-black p-0.5 pl-1.5 h-[33.33%] flex items-center"><span className="w-12">Rev. No:</span></div>
                  <div className="p-0.5 pl-1.5 h-[33.33%] flex items-center"><span className="w-12">Rev. Date:</span></div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Title Banner */}
          <div className="bg-[#1f4e78] text-white text-center py-0.5 border-x border-black font-bold text-[9.5px] tracking-wide">
            Service Job Card
          </div>

          {/* Main Table section */}
          <table className="w-full border-collapse border border-black text-[8px] table-fixed">
            <tbody>
              {/* Row 1 */}
              <tr className="h-[26px]">
                <td className="border border-black px-1.5 py-1 font-bold w-[25%] align-top leading-tight">
                  <div className="block">Date of initiation:</div>
                  <div className="font-normal block mt-0.5">{request.createdAt ? format(new Date(request.createdAt), 'dd-MM-yyyy') : ''}</div>
                </td>
                <td className="border border-black px-1.5 py-1 font-bold w-[20%] align-top">
                  Service Start Time:
                </td>
                <td className="border border-black px-1.5 py-1 font-bold w-[20%] align-top">
                  <div className="block">Service End Time:</div>
                  <div className="font-normal block mt-0.5">{request.completedAt ? format(new Date(request.completedAt), 'HH:mm') : ''}</div>
                </td>
                <td className="border border-black px-1.5 py-1 font-bold w-[35%] align-top">
                  <span className="mr-1">Service Location: Factory</span><CheckBox label="" className="mr-1" />
                  <span className="mr-1">/ Field</span><CheckBox label="" className="mr-1" />
                  <span className="mr-1">/Dealer/ASSDP</span><CheckBox label="" />
                </td>
              </tr>
              {/* Row 2 */}
              <tr className="h-[26px]">
                <td className="border border-black px-1.5 py-1 font-bold align-top" colSpan={2}>
                  <div className="flex items-center flex-wrap leading-tight gap-x-1 gap-y-0.5">
                    <span className="mr-1">Model Details:</span>
                    <CheckBox label="E10" className="mr-1" />
                    <CheckBox label="E10P" className="mr-1" />
                    <CheckBox label="DHQ4" className="mr-1" />
                    <CheckBox label="Others" className="mr-2" />
                    <span className="mr-1">(Specify:</span>
                    <span className="inline-block w-[120px] border-b border-black font-normal text-center h-3 leading-none truncate">
                      {jobCard?.droneModel || request.equipmentModel || ' '}
                    </span>
                    <span>)</span>
                  </div>
                </td>
                <td className="border border-black px-1.5 py-1 font-bold align-top">
                  CRM Ticket Number:<br/>
                  <span className="font-normal inline-block mt-0.5">REQ-{String(request.id).padStart(4, '0')}</span>
                </td>
                <td className="border border-black px-1.5 py-1 font-bold align-top">
                  SAP Repair Order Number:<br/>
                </td>
              </tr>
              {/* Row 3 - Customer details complex spanning */}
              <tr className="h-6">
                <td className="border border-black px-1.5 py-1 font-bold w-[25%]">Customer Name</td>
                <td className="border border-black px-1.5 py-1 font-normal w-[20%] truncate">{jobCard?.customerName || request.customerName || ''}</td>
                <td className="border border-black p-0 font-bold align-top" colSpan={2} rowSpan={5}>
                  <div className="px-1.5 py-1 leading-[1.4]">
                    <div className="flex flex-wrap items-center gap-x-1.5">
                      <span className="mr-1">Customer Details: IFFCO</span><CheckBox label="" />
                      <span>CIL</span><CheckBox label="" />
                      <span>CIL DIDI</span><CheckBox label="" />
                      <span>Dealers & Others</span><CheckBox label="" />
                      <span className="ml-1">(Specify: </span>
                      <span className="inline-block w-[80px] border-b border-black font-normal self-end"></span>
                      <span>)</span>
                    </div>
                    <div className="mt-1">Customer Address: <span className="font-normal">{request.location || ''}</span></div>
                    <div className="mt-[6px]">Customer Pin Code:</div>
                    <div className="mt-[6px]">Customer Contact Number: <span className="font-normal">{request.contactNumber || ''}</span></div>
                  </div>
                </td>
              </tr>
              <tr className="h-6">
                <td className="border border-black px-1.5 py-1 font-bold">Serial Number</td>
                <td className="border border-black px-1.5 py-1 font-normal truncate">{request.serialNumber || ''}</td>
              </tr>
              <tr className="h-6">
                <td className="border border-black px-1.5 py-1 font-bold">UIN No</td>
                <td className="border border-black px-1.5 py-1 font-normal"></td>
              </tr>
              <tr className="h-6">
                <td className="border border-black px-1.5 py-1 font-bold">Service Assigned to:</td>
                <td className="border border-black px-1.5 py-1 font-normal truncate">{request.assignedEngineerName || ''}</td>
              </tr>
              <tr className="h-6">
                <td className="border border-black px-1.5 py-1 font-bold">Model Purchase Date</td>
                <td className="border border-black px-1.5 py-1 font-normal"></td>
              </tr>

              {/* Inward Check List */}
              <tr className="h-6">
                <td className="border border-black px-1.5 py-1 font-bold">Inward Check List</td>
                <td className="border border-black px-1.5 py-1 font-bold flex items-center gap-1 border-0 h-full">Filled by: <span className="border-b border-black flex-1 mt-1"></span></td>
                <td className="border border-black px-1.5 py-1 font-bold" colSpan={2}>
                  <div className="flex items-center flex-wrap leading-tight gap-x-1 gap-y-1">
                    <CheckBox label="Drone" />
                    <CheckBox label="RC" />
                    <CheckBox label="Drone Box" />
                    <CheckBox label="Charger" />
                    <CheckBox label="Battery" /> 
                    <span className="ml-1">( Specify Qty & SN: </span>
                    <span className="w-14 border-b border-black inline-block font-normal align-bottom mb-[-1px]"></span>
                    <span className="ml-1">), Other</span><CheckBox label="(Detail:" />
                    <span className="w-[100px] border-b border-black inline-block font-normal align-bottom mb-[-1px]"></span>
                    <span>)</span>
                  </div>
                </td>
              </tr>
              
              {/* Outward Check List */}
              <tr className="h-6">
                <td className="border border-black px-1.5 py-1 font-bold">Outward Check List</td>
                <td className="border border-black px-1.5 py-1 font-bold flex items-center gap-1 border-0 h-full">Filled by: <span className="border-b border-black flex-1 mt-1"></span></td>
                <td className="border border-black px-1.5 py-1 font-bold" colSpan={2}>
                  <div className="flex items-center flex-wrap leading-tight gap-x-1 gap-y-1">
                    <CheckBox label="Drone" />
                    <CheckBox label="RC" />
                    <CheckBox label="Drone Box" />
                    <CheckBox label="Charger" />
                    <CheckBox label="Battery" /> 
                    <span className="ml-1">( Specify Qty & SN: </span>
                    <span className="w-14 border-b border-black inline-block font-normal align-bottom mb-[-1px]"></span>
                    <span className="ml-1">), Other</span><CheckBox label="(Detail:" />
                    <span className="w-[100px] border-b border-black inline-block font-normal align-bottom mb-[-1px]"></span>
                    <span>)</span>
                  </div>
                </td>
              </tr>

              {/* Service Type */}
              <tr className="h-6">
                <td className="border border-black px-1.5 py-1 font-bold leading-tight" colSpan={2}>
                   Service Type: (To be decided by Technical <br/>Team)
                </td>
                <td className="border border-black p-0 font-bold align-middle">
                   <div className="flex justify-between items-center px-4 h-full pt-1">
                     <CheckBox label="Warranty" />
                     <CheckBox label="Paid" />
                     <CheckBox label="Insurance" />
                   </div>
                </td>
                <td className="border border-black p-0 font-bold align-middle">
                   <div className="flex justify-start gap-12 items-center px-4 h-full pt-1">
                     <CheckBox label="Yes" />
                     <CheckBox label="No" />
                   </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Observation Table */}
          <table className="w-full border-collapse border-x border-b border-black text-[8px] table-fixed">
            <thead>
              <tr className="bg-[#d9e2f3] font-bold text-center h-[26px] leading-[1.1]">
                <th className="border border-black px-1 py-1 w-[8%] font-bold">Date of<br/>Issue</th>
                <th className="border border-black px-1 py-1 w-[20%] font-bold">Customer statement</th>
                <th className="border border-black px-1 py-1 w-[22%] font-bold">Observation during inspection of drone</th>
                <th className="border border-black px-1 py-1 w-[16%] font-bold">Actual diagnosis<br/>observation on flight log</th>
                <th className="border border-black px-1 py-1 w-[17%] font-bold">Root cause</th>
                <th className="border border-black px-1 py-1 w-[17%] font-bold">Corrective action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-1.5 py-1.5 h-[130px] align-top text-center font-bold">
                  {format(new Date(), 'dd/MM/yyyy')}
                  <br/><br/>
                  <span className="font-normal text-[7px] hidden">sd</span>
                </td>
                <td className="border border-black px-1.5 py-1.5 h-[130px] align-top relative">
                  {jobCard?.diagnosis || ''}
                  <div className="absolute bottom-1 left-1.5 font-bold">Filled by:</div>
                </td>
                <td className="border border-black px-1.5 py-1.5 h-[130px] align-top relative">
                  {jobCard?.observations || ''}
                  <div className="absolute bottom-1 left-1.5 font-bold">Filled by:</div>
                </td>
                <td className="border border-black px-1.5 py-1.5 h-[130px] align-top relative">
                  <div className="absolute bottom-1 left-1.5 font-bold">Filled by:</div>
                </td>
                <td className="border border-black px-1.5 py-1.5 h-[130px] align-top relative">
                  {jobCard?.rootCause || ''}
                  <div className="absolute bottom-1 left-1.5 font-bold">Filled by:</div>
                </td>
                <td className="border border-black px-1.5 py-1.5 h-[130px] align-top relative">
                  {jobCard?.actionTaken || ''}
                  <div className="absolute bottom-1 left-1.5 font-bold">Filled By:</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Parts Usage List */}
          <div className="bg-[#1f4e78] text-white text-center py-0.5 border-x border-b border-black font-bold text-[9.5px] tracking-wide">
            Parts Usage List
          </div>
          <table className="w-full border-collapse border-x border-b border-black text-[8px] table-fixed">
            <thead>
              <tr className="bg-[#d9e2f3] font-bold text-center h-[20px]">
                <th className="border border-black px-1 py-0.5 w-[6%] font-bold">Sl.No.</th>
                <th className="border border-black px-1 py-0.5 w-[14%] font-bold">Part Number</th>
                <th className="border border-black px-1 py-0.5 w-[22%] font-bold">Part Description</th>
                <th className="border border-black px-1 py-0.5 w-[8%] font-bold">Qty</th>
                <th className="border border-black px-1 py-0.5 w-[6%] font-bold">Sl.No.</th>
                <th className="border border-black px-1 py-0.5 w-[14%] font-bold">Part Number</th>
                <th className="border border-black px-1 py-0.5 w-[22%] font-bold">Part Description</th>
                <th className="border border-black px-1 py-0.5 w-[8%] font-bold">Qty</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="h-[16px]">
                  <td className="border border-black px-1 py-0 text-center font-bold">{i + 1}</td>
                  <td className="border border-black px-1 py-0"></td>
                  <td className="border border-black px-1 py-0 px-1 truncate">{i === 0 && jobCard?.partsReplaced ? jobCard.partsReplaced : ''}</td>
                  <td className="border border-black px-1 py-0 text-center"></td>
                  <td className="border border-black px-1 py-0 text-center font-bold">{i + 11}</td>
                  <td className="border border-black px-1 py-0"></td>
                  <td className="border border-black px-1 py-0 px-1"></td>
                  <td className="border border-black px-1 py-0 text-center"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures section - 4 columns */}
          <table className="w-full border-collapse border-x border-b border-black text-[8px] table-fixed">
            <thead>
              <tr className="font-bold text-center h-6">
                <th className="border border-black px-1 py-0.5 w-[25%] font-bold">Service Engineer</th>
                <th className="border border-black px-1 py-0.5 w-[25%] font-bold">Service Material Control Team (Stores)</th>
                <th className="border border-black px-1 py-0.5 w-[25%] font-bold">Service Manager Approval</th>
                <th className="border border-black px-1 py-0.5 w-[25%] font-bold">Quality</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1 h-[50px] text-center align-middle relative">
                  {engineerSignature && <img src={engineerSignature} alt="Eng Sign" className="max-h-12 mx-auto absolute bottom-1 inset-x-0" />}
                </td>
                <td className="border border-black p-1 h-[50px] text-center align-middle"></td>
                <td className="border border-black p-1 h-[50px] text-center align-middle"></td>
                <td className="border border-black p-1 h-[50px] text-center align-middle"></td>
              </tr>
            </tbody>
          </table>

          {/* Final blocks */}
          <table className="w-full flex-grow border-collapse border-x border-b border-black text-[8px] table-fixed">
             <tbody>
                <tr>
                  <td className="border-r border-black px-2 py-1.5 align-top h-[70px] w-[75%] font-bold">
                    Engineer Remarks /Pilot Remarks :
                    <div className="font-normal mt-1.5 block">{jobCard?.recommendations || ''}</div>
                  </td>
                  <td className="p-1 w-[25%] row-span-2 relative text-center align-middle">
                    {customerSignature ? (
                       <img src={customerSignature} alt="Cust Sign" className="max-h-16 mx-auto absolute bottom-6 inset-x-0 object-contain" />
                    ) : (
                       <div className="h-16"></div>
                    )}
                    <div className="absolute inset-x-0 bottom-1 font-bold text-[9px]">Customer Signature</div>
                  </td>
                </tr>
                <tr>
                  <td className="border-t border-black px-2 py-1.5 align-top h-[35px] w-[75%] font-bold leading-[1.3]">
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
