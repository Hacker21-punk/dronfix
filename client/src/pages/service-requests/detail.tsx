import { useParams, useLocation } from "wouter";
import { 
  useServiceRequest, 
  useUpdateServiceRequest, 
  useConsumePart, 
  useUploadServiceImage,
  useAssignEngineer,
  useSubmitInvoice,
  useSubmitLogistics,
  useExpenses,
  useAddExpense,
  useUpdateExpense,
  useDeleteExpense
} from "@/hooks/use-service-requests";
import { useInventory } from "@/hooks/use-inventory";
import { useCurrentUser, useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, CheckCircle, Upload, Wrench, Download, Camera, User, FileText, ArrowLeft, FolderOpen, Loader2, ZoomIn, X, Truck, Receipt, Plus, Trash2, IndianRupee, Pencil
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef, useCallback } from "react";
import { useUpload } from "@/hooks/use-upload";
import { CameraCapture } from "@/components/camera-capture";
import { formatCurrency } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { Expense } from "@shared/schema";

export default function ServiceRequestDetail() {
  const { id } = useParams();
  const requestId = Number(id);
  const [, setLocation] = useLocation();
  
  const { data: request, isLoading } = useServiceRequest(requestId);
  const { data: profile } = useCurrentUser();
  const updateMutation = useUpdateServiceRequest();
  
  if (isLoading || !request) {
    return <div className="p-10 text-center animate-pulse">Loading request details...</div>;
  }

  const role = profile?.role || 'engineer';

  const steps = ['pending', 'accepted', 'in_progress', 'completed', 'billed'];
  const currentStep = steps.indexOf(request.status);

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <Button variant="ghost" size="sm" className="mb-2 pl-0 hover:pl-2 transition-all" onClick={() => setLocation('/requests')}>
             <ArrowLeft className="h-4 w-4 mr-1" /> Back to List
           </Button>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-display font-bold">Request #{requestId}</h1>
             <Badge className="text-base uppercase tracking-wide">{request.status.replace('_', ' ')}</Badge>
          </div>
        </div>

        <div className="flex gap-2">
          {role === 'account' && request.status === 'completed' && (
            <GenerateInvoiceDialog requestId={requestId} />
          )}
          
          {role === 'engineer' && request.status === 'accepted' && (
            <Button onClick={() => updateMutation.mutate({ id: requestId, status: 'in_progress' })}>
              Start Service
            </Button>
          )}

          {role === 'engineer' && request.status === 'in_progress' && (
            <Button onClick={() => updateMutation.mutate({ id: requestId, status: 'completed' })}>
              Complete Service
            </Button>
          )}
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="relative">
         <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full -z-10" />
         <div className="flex justify-between">
           {steps.map((step, idx) => (
             <div key={step} className="flex flex-col items-center gap-2 bg-background px-2">
               <div className={`
                 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500
                 ${idx <= currentStep ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted text-muted-foreground'}
               `}>
                 {idx + 1}
               </div>
               <span className="text-xs font-medium uppercase text-muted-foreground hidden sm:block">{step.replace('_', ' ')}</span>
             </div>
           ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Pilot & Drone Info */}
          <Card>
            <CardHeader><CardTitle>Request Information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <h4 className="text-sm font-medium text-muted-foreground mb-1">Pilot Details</h4>
                   <p className="font-medium text-lg">{request.pilotName}</p>
                   <p className="text-sm">{request.contactDetails}</p>
                   <p className="text-sm text-muted-foreground">{request.address}</p>
                   {(request.state || request.district || request.pincode) && (
                     <p className="text-sm text-muted-foreground">
                       {[request.district, request.state, request.pincode ? `- ${request.pincode}` : ''].filter(Boolean).join(', ')}
                     </p>
                   )}
                </div>
                <div>
                   <h4 className="text-sm font-medium text-muted-foreground mb-1">Drone Details</h4>
                   <p className="font-medium text-lg">{request.droneNumber} <span className="text-sm font-normal text-muted-foreground">({request.serviceType})</span></p>
                   <p className="text-sm font-mono">SN: {request.serialNumber}</p>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Complaint</h4>
                <div className="p-4 bg-muted/40 rounded-lg italic text-muted-foreground">
                  "{request.complaint}"
                </div>
              </div>
              {request.partsRequested && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2" data-testid="text-parts-requested-label">Parts Requested</h4>
                    <div className="p-4 bg-muted/40 rounded-lg" data-testid="text-parts-requested">
                      {request.partsRequested}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Parts Consumed (Only visible if service started) */}
          {['in_progress', 'completed', 'billed'].includes(request.status) && (
            <PartsConsumptionSection requestId={requestId} canEdit={role === 'engineer' && request.status === 'in_progress'} parts={request.parts} role={role} />
          )}

          {/* Engineer Expenses (Only visible for engineers) */}
          {role === 'engineer' && (
            <ExpensesSection 
              requestId={requestId} 
              droneNumber={request.droneNumber} 
              baseLocation={request.state || ''} 
            />
          )}

          {/* Service Images */}
          <ServiceImagesSection requestId={requestId} canUpload={role === 'engineer'} images={request.images} />

        </div>

        {/* Sidebar Actions Column */}
        <div className="space-y-6">
          
          {/* Assignment Card */}
          <Card>
            <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {request.assignedEngineerId ? (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Assigned Engineer</p>
                    <p className="text-sm text-muted-foreground">ID: {request.assignedEngineerId}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm mb-4">
                  No engineer assigned
                </div>
              )}

              {role === 'admin' && (
                <AssignEngineerDialog requestId={requestId} currentEngineerId={request.assignedEngineerId} />
              )}
              
              {role === 'engineer' && request.status === 'pending' && !request.tentativeServiceDate && (
                <AcceptRequestDialog requestId={requestId} />
              )}
              
              {request.tentativeServiceDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Calendar className="h-4 w-4" />
                  Tentative Date: <span className="font-medium text-foreground">{format(new Date(request.tentativeServiceDate), 'MMM d, yyyy')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Upload */}
          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <DocumentUpload 
                label="Job Sheet" 
                url={request.jobSheetUrl} 
                canUpload={role === 'engineer'}
                onUpload={(url) => updateMutation.mutate({ id: requestId, jobSheetUrl: url })} 
              />
              <DocumentUpload 
                label="Feedback Form" 
                url={request.feedbackFormUrl} 
                canUpload={role === 'engineer'}
                onUpload={(url) => updateMutation.mutate({ id: requestId, feedbackFormUrl: url })} 
              />
              <DocumentUpload 
                label="Crash Report" 
                url={request.crashReportUrl} 
                canUpload={role === 'engineer'}
                onUpload={(url) => updateMutation.mutate({ id: requestId, crashReportUrl: url })} 
              />
              <DocumentUpload 
                label="Audit Report" 
                url={request.auditReportUrl} 
                canUpload={role === 'engineer'}
                onUpload={(url) => updateMutation.mutate({ id: requestId, auditReportUrl: url })} 
              />
              <DocumentUpload 
                label="Log Report" 
                url={request.logReportUrl} 
                canUpload={role === 'engineer'}
                onUpload={(url) => updateMutation.mutate({ id: requestId, logReportUrl: url })} 
              />
              {role === 'account' && (
                <>
                  <Separator className="my-2" />
                  <DocumentUpload 
                    label="Invoice" 
                    url={request.invoiceUrl} 
                    canUpload={true}
                    onUpload={(url) => updateMutation.mutate({ id: requestId, invoiceUrl: url })} 
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details (if filled) */}
          {request.invoiceNumber && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Invoice Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Invoice No.</span><span className="font-medium" data-testid="text-invoice-number">{request.invoiceNumber}</span></div>
                {request.challanNumber && <div className="flex justify-between"><span className="text-muted-foreground">Challan No.</span><span className="font-medium" data-testid="text-challan-number">{request.challanNumber}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Invoice Value</span><span className="font-medium" data-testid="text-invoice-value">{formatCurrency(Number(request.invoiceValue))}</span></div>
                {request.reimbursementAmount && <div className="flex justify-between"><span className="text-muted-foreground">Reimbursement</span><span className="font-medium" data-testid="text-reimbursement">{formatCurrency(Number(request.reimbursementAmount))}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Invoice Type</span><Badge data-testid="text-invoice-type">{request.invoiceType}</Badge></div>
                {request.invoiceDate && <div className="flex justify-between"><span className="text-muted-foreground">Invoice Date</span><span className="font-medium" data-testid="text-invoice-date">{format(new Date(request.invoiceDate), 'MMM d, yyyy')}</span></div>}
              </CardContent>
            </Card>
          )}

          {/* Logistics / Shipping Details */}
          {(role === 'logistics' || role === 'admin' || request.shippingPartner) && (
            <LogisticsSection requestId={requestId} request={request} role={role} />
          )}

           {/* PDF Report Download */}
           {(request.status === 'completed' || request.status === 'billed') && (
             <Button variant="outline" className="w-full" onClick={() => window.open(`/api/service-requests/${requestId}/report`, '_blank')}>
               <Download className="h-4 w-4 mr-2" /> Download Full Report
             </Button>
           )}

        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function AssignEngineerDialog({ requestId, currentEngineerId }: { requestId: number, currentEngineerId: string | null }) {
  const { data: users } = useUsers();
  const assignMutation = useAssignEngineer();
  const [open, setOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState(currentEngineerId || "");

  const engineers = users?.filter((u: any) => u.role === 'engineer') || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          {currentEngineerId ? "Reassign Engineer" : "Assign Engineer"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Select Field Engineer</DialogTitle></DialogHeader>
        <div className="py-4">
          <Label>Engineer</Label>
          <Select value={selectedEngineer} onValueChange={setSelectedEngineer}>
            <SelectTrigger><SelectValue placeholder="Select engineer" /></SelectTrigger>
            <SelectContent>
              {engineers.map((eng: any) => (
                <SelectItem key={eng.id} value={String(eng.id)}>{eng.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => assignMutation.mutate({ id: requestId, engineerId: selectedEngineer }, { onSuccess: () => setOpen(false) })}>
          Assign
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function AcceptRequestDialog({ requestId }: { requestId: number }) {
  const updateMutation = useUpdateServiceRequest();
  const [date, setDate] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Accept Request</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Set Tentative Service Date</DialogTitle></DialogHeader>
        <div className="py-4">
           <Label>Date</Label>
           <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button onClick={() => updateMutation.mutate({ 
          id: requestId, 
          status: 'accepted', 
          tentativeServiceDate: date ? new Date(date) : undefined
        } as any, { onSuccess: () => setOpen(false) })}>
          Confirm Acceptance
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function GenerateInvoiceDialog({ requestId }: { requestId: number }) {
  const invoiceMutation = useSubmitInvoice();
  const [open, setOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [challanNumber, setChallanNumber] = useState("");
  const [invoiceValue, setInvoiceValue] = useState("");
  const [reimbursementAmount, setReimbursementAmount] = useState("");
  const [invoiceType, setInvoiceType] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  const handleSubmit = () => {
    if (!invoiceNumber || !invoiceValue || !invoiceType || !invoiceDate) return;
    invoiceMutation.mutate({
      id: requestId,
      invoiceNumber,
      challanNumber: challanNumber || undefined,
      invoiceValue,
      reimbursementAmount: reimbursementAmount || undefined,
      invoiceType,
      invoiceDate,
    }, {
      onSuccess: () => {
        setOpen(false);
        setInvoiceNumber("");
        setChallanNumber("");
        setInvoiceValue("");
        setReimbursementAmount("");
        setInvoiceType("");
        setInvoiceDate("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-generate-invoice">
          <Receipt className="h-4 w-4 mr-2" /> Generate Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Generate Invoice</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Invoice Number *</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001" data-testid="input-invoice-number" />
          </div>
          <div>
            <Label>Challan Number (if any)</Label>
            <Input value={challanNumber} onChange={(e) => setChallanNumber(e.target.value)} placeholder="CH-001" data-testid="input-challan-number" />
          </div>
          <div>
            <Label>Invoice Value *</Label>
            <Input type="number" step="0.01" value={invoiceValue} onChange={(e) => setInvoiceValue(e.target.value)} placeholder="0.00" data-testid="input-invoice-value" />
          </div>
          <div>
            <Label>Reimbursement Amount</Label>
            <Input type="number" step="0.01" value={reimbursementAmount} onChange={(e) => setReimbursementAmount(e.target.value)} placeholder="0.00" data-testid="input-reimbursement-amount" />
          </div>
          <div>
            <Label>Invoice Type *</Label>
            <Select value={invoiceType} onValueChange={setInvoiceType}>
              <SelectTrigger data-testid="select-invoice-type"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="L1">L1</SelectItem>
                <SelectItem value="L2">L2</SelectItem>
                <SelectItem value="L3">L3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date of Invoice *</Label>
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} data-testid="input-invoice-date" />
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!invoiceNumber || !invoiceValue || !invoiceType || !invoiceDate || invoiceMutation.isPending}
          className="w-full"
          data-testid="button-submit-invoice"
        >
          {invoiceMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Receipt className="h-4 w-4 mr-2" />}
          Submit Invoice
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function LogisticsSection({ requestId, request, role }: { requestId: number, request: any, role: string }) {
  const logisticsMutation = useSubmitLogistics();
  const [open, setOpen] = useState(false);
  const [shippingPartnerName, setShippingPartnerName] = useState(request.shippingPartner || "");
  const [docketDetails, setDocketDetails] = useState(request.docketNumber || "");
  const [shippingDate, setShippingDate] = useState(request.shippingDate ? format(new Date(request.shippingDate), 'yyyy-MM-dd') : "");
  const [shippingStatus, setShippingStatus] = useState(request.shippingStatus || "");

  const handleSubmit = () => {
    if (!shippingPartnerName || !shippingDate || !shippingStatus) return;
    logisticsMutation.mutate({
      id: requestId,
      shippingPartner: shippingPartnerName,
      docketNumber: docketDetails || undefined,
      shippingDate,
      shippingStatus,
    }, {
      onSuccess: () => setOpen(false),
    });
  };

  const statusColors: Record<string, string> = {
    shipped: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    in_transit: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Truck className="h-4 w-4" /> Shipping / Logistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {request.shippingPartner ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Partner</span><span className="font-medium" data-testid="text-shipping-partner">{request.shippingPartner}</span></div>
            {request.docketNumber && <div className="flex justify-between"><span className="text-muted-foreground">Docket</span><span className="font-medium" data-testid="text-docket-details">{request.docketNumber}</span></div>}
            {request.shippingDate && <div className="flex justify-between"><span className="text-muted-foreground">Ship Date</span><span className="font-medium" data-testid="text-shipping-date">{format(new Date(request.shippingDate), 'MMM d, yyyy')}</span></div>}
            {request.shippingStatus && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusColors[request.shippingStatus] || ""} data-testid="text-shipping-status">
                  {request.shippingStatus.replace('_', ' ')}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No shipping details yet.</p>
        )}

        {(role === 'logistics' || role === 'admin') && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full" data-testid="button-update-logistics">
                <Truck className="h-4 w-4 mr-2" /> {request.shippingPartner ? "Update Shipping" : "Add Shipping Details"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Shipping Details</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Shipping Partner Name *</Label>
                  <Input value={shippingPartnerName} onChange={(e) => setShippingPartnerName(e.target.value)} placeholder="e.g. BlueDart, DTDC" data-testid="input-shipping-partner" />
                </div>
                <div>
                  <Label>Docket Details</Label>
                  <Input value={docketDetails} onChange={(e) => setDocketDetails(e.target.value)} placeholder="Docket / AWB number" data-testid="input-docket-details" />
                </div>
                <div>
                  <Label>Shipping Date *</Label>
                  <Input type="date" value={shippingDate} onChange={(e) => setShippingDate(e.target.value)} data-testid="input-shipping-date" />
                </div>
                <div>
                  <Label>Shipping Status *</Label>
                  <Select value={shippingStatus} onValueChange={setShippingStatus}>
                    <SelectTrigger data-testid="select-shipping-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!shippingPartnerName || !shippingDate || !shippingStatus || logisticsMutation.isPending}
                className="w-full"
                data-testid="button-submit-logistics"
              >
                {logisticsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Truck className="h-4 w-4 mr-2" />}
                Save Shipping Details
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

function PartsConsumptionSection({ requestId, canEdit, parts, role }: { requestId: number, canEdit: boolean, parts: any[], role?: string }) {
  const { data: inventory } = useInventory();
  const consumeMutation = useConsumePart();
  const [selectedPart, setSelectedPart] = useState("");
  const [quantity, setQuantity] = useState(1);
  const showPrice = role !== 'engineer';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Parts Consumed</CardTitle>
        {canEdit && <Badge>Editable</Badge>}
      </CardHeader>
      <CardContent>
        {canEdit && (
          <div className="flex gap-2 mb-6 items-end">
            <div className="flex-1">
              <Label>Select Part</Label>
              <Select value={selectedPart} onValueChange={setSelectedPart}>
                <SelectTrigger data-testid="select-part"><SelectValue placeholder="Search inventory..." /></SelectTrigger>
                <SelectContent>
                  {inventory?.map((item: any) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name} (Stock: {item.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label>Qty</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} data-testid="input-part-qty" />
            </div>
            <Button data-testid="button-add-part" onClick={() => {
              if (selectedPart) {
                consumeMutation.mutate({ id: requestId, inventoryId: parseInt(selectedPart), quantity });
                setSelectedPart("");
                setQuantity(1);
              }
            }}>Add</Button>
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground font-medium">
              <tr>
                <th className="p-3">Part Name</th>
                <th className="p-3 text-right">Qty</th>
                {showPrice && <th className="p-3 text-right">Unit Price</th>}
                {showPrice && <th className="p-3 text-right">Total</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {parts && parts.length > 0 ? parts.map((part: any) => (
                <tr key={part.id} data-testid={`row-part-${part.id}`}>
                  <td className="p-3">{part.item?.name || 'Unknown Item'}</td>
                  <td className="p-3 text-right">{part.quantity}</td>
                  {showPrice && <td className="p-3 text-right">{formatCurrency(Number(part.item?.price || 0))}</td>}
                  {showPrice && <td className="p-3 text-right font-medium">{formatCurrency(Number(part.item?.price || 0) * part.quantityUsed)}</td>}
                </tr>
              )) : (
                <tr><td colSpan={showPrice ? 4 : 2} className="p-4 text-center text-muted-foreground">No parts consumed yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ImageUploadButtons({ type, requestId }: { type: 'before' | 'after', requestId: number }) {
  const uploadImageMutation = useUploadServiceImage();
  const { uploadFile, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleCameraCapture = useCallback(async (file: File) => {
    const result = await uploadFile(file);
    if (result) {
      uploadImageMutation.mutate({ id: requestId, fileUrl: result.objectPath, type });
    }
    setCameraOpen(false);
  }, [uploadFile, uploadImageMutation, requestId, type]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const result = await uploadFile(files[i]);
      if (result) {
        uploadImageMutation.mutate({ id: requestId, fileUrl: result.objectPath, type });
      }
    }
    e.target.value = '';
  };

  return (
    <div className="flex gap-1.5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCameraOpen(true)}
        disabled={isUploading}
        data-testid={`button-camera-${type}`}
      >
        {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
        Camera
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        data-testid={`button-upload-file-${type}`}
      >
        <FolderOpen className="h-3.5 w-3.5 mr-1" />
        Upload File
      </Button>
      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
        isUploading={isUploading}
      />
    </div>
  );
}

function ImagePreviewCard({ img, label }: { img: any, label: string }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div className="space-y-1.5">
        <div
          className="relative group cursor-pointer rounded-md border overflow-visible"
          onClick={() => setPreviewOpen(true)}
          data-testid={`img-preview-${img.id}`}
        >
          <img
            src={img.fileUrl}
            className="h-40 w-full object-cover rounded-md"
            alt={label}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-md flex items-center justify-center">
            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          asChild
          data-testid={`button-download-image-${img.id}`}
        >
          <a href={img.fileUrl} target="_blank" rel="noopener noreferrer" download={`${label}-${img.id}.jpg`}>
            <Download className="h-3.5 w-3.5 mr-1" /> Download
          </a>
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-2">
            <img
              src={img.fileUrl}
              className="w-full max-h-[70vh] object-contain rounded-md"
              alt={label}
              data-testid={`img-fullsize-${img.id}`}
            />
          </div>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="outline" size="sm" asChild data-testid={`button-download-fullsize-${img.id}`}>
              <a href={img.fileUrl} target="_blank" rel="noopener noreferrer" download={`${label}-${img.id}.jpg`}>
                <Download className="h-4 w-4 mr-1" /> Download
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)} data-testid={`button-close-preview-${img.id}`}>
              <X className="h-4 w-4 mr-1" /> Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ServiceImagesSection({ requestId, canUpload, images }: { requestId: number, canUpload: boolean, images: any[] }) {
  const beforeImages = images?.filter(img => img.type === 'before') || [];
  const afterImages = images?.filter(img => img.type === 'after') || [];

  return (
    <Card>
      <CardHeader><CardTitle>Service Images</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
            <h4 className="font-medium text-sm text-muted-foreground">Before Service ({beforeImages.length})</h4>
            {canUpload && <ImageUploadButtons type="before" requestId={requestId} />}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {beforeImages.map(img => (
              <ImagePreviewCard key={img.id} img={img} label="Before Service" />
            ))}
            {beforeImages.length === 0 && (
              <div className="col-span-full h-32 bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
                No images uploaded yet
              </div>
            )}
          </div>
        </div>
        
        <Separator />

        <div>
          <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
            <h4 className="font-medium text-sm text-muted-foreground">After Service ({afterImages.length})</h4>
            {canUpload && <ImageUploadButtons type="after" requestId={requestId} />}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {afterImages.map(img => (
              <ImagePreviewCard key={img.id} img={img} label="After Service" />
            ))}
            {afterImages.length === 0 && (
              <div className="col-span-full h-32 bg-muted rounded-md flex items-center justify-center text-sm text-muted-foreground">
                No images uploaded yet
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getFileTypeFromUrl(url: string): 'pdf' | 'image' {
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.pdf')) return 'pdf';
  return 'image';
}

function DocumentUpload({ label, url, canUpload, onUpload }: { label: string, url: string | null, canUpload: boolean, onUpload: (url: string) => void }) {
  const { uploadFile, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      onUpload(result.objectPath);
    }
    e.target.value = '';
  };

  const handleCameraCapture = useCallback(async (file: File) => {
    const result = await uploadFile(file);
    if (result) {
      onUpload(result.objectPath);
    }
    setCameraOpen(false);
  }, [uploadFile, onUpload]);

  const testId = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="border rounded-lg bg-card/50 overflow-visible">
      <div className="flex flex-wrap items-center justify-between p-3 gap-2">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <span className="font-medium text-sm">{label}</span>
            {url && <p className="text-xs text-green-600 dark:text-green-400">Uploaded</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          {url && (
            <Button variant="outline" size="sm" asChild data-testid={`button-download-${testId}`}>
              <a href={url} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-4 w-4 mr-1" /> Download
              </a>
            </Button>
          )}
          {!url && canUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={handleFile}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCameraOpen(true)}
                disabled={isUploading}
                data-testid={`button-camera-doc-${testId}`}
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
                Camera
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid={`button-upload-doc-${testId}`}
              >
                <FolderOpen className="h-3.5 w-3.5 mr-1" />
                Upload
              </Button>
              <CameraCapture
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={handleCameraCapture}
                isUploading={isUploading}
              />
            </>
          )}
          {!url && !canUpload && (
            <span className="text-xs text-muted-foreground">Pending</span>
          )}
        </div>
      </div>

      {url && (
        <div className="px-3 pb-3">
          {getFileTypeFromUrl(url) === 'pdf' ? (
            <div
              className="border rounded-md overflow-hidden cursor-pointer"
              onClick={() => setPreviewOpen(true)}
              data-testid={`doc-preview-${testId}`}
            >
              <iframe
                src={url}
                className="w-full h-48 pointer-events-none"
                title={`${label} preview`}
              />
              <div className="flex items-center justify-center gap-1 py-1.5 bg-muted/50 text-xs text-muted-foreground">
                <ZoomIn className="h-3.5 w-3.5" /> Click to view full document
              </div>
            </div>
          ) : (
            <div
              className="relative group cursor-pointer rounded-md border overflow-visible"
              onClick={() => setPreviewOpen(true)}
              data-testid={`doc-preview-${testId}`}
            >
              <img
                src={url}
                className="w-full max-h-48 object-contain rounded-md bg-muted/30"
                alt={`${label} preview`}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-md flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          )}

          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>{label}</DialogTitle>
              </DialogHeader>
              <div className="p-4 pt-2">
                {getFileTypeFromUrl(url) === 'pdf' ? (
                  <iframe
                    src={url}
                    className="w-full h-[70vh] rounded-md border"
                    title={`${label} full view`}
                    data-testid={`doc-fullsize-${testId}`}
                  />
                ) : (
                  <img
                    src={url}
                    className="w-full max-h-[70vh] object-contain rounded-md"
                    alt={label}
                    data-testid={`doc-fullsize-${testId}`}
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 p-4 pt-0">
                <Button variant="outline" size="sm" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
                  <X className="h-4 w-4 mr-1" /> Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

function ExpensesSection({ requestId, droneNumber, baseLocation }: { requestId: number; droneNumber: string; baseLocation: string }) {
  const { data: expenses, isLoading } = useExpenses(requestId);
  const addExpenseMutation = useAddExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [billStatus, setBillStatus] = useState(false);
  const [billfileUrl, setBillfileUrl] = useState<string | null>(null);
  const [onlineSlip, setOnlineSlip] = useState(false);
  const [onlineSlipfileUrl, setOnlineSlipfileUrl] = useState<string | null>(null);
  const [modeOfTravel, setModeOfTravel] = useState("");
  const [expBaseLocation, setExpBaseLocation] = useState(baseLocation || "");
  const [remark, setRemark] = useState("");
  const [billCameraOpen, setBillCameraOpen] = useState(false);
  const [slipCameraOpen, setSlipCameraOpen] = useState(false);

  const { uploadFile, isUploading } = useUpload();
  const billInputRef = useRef<HTMLInputElement>(null);
  const slipInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, target: 'bill' | 'slip') => {
    const result = await uploadFile(file);
    if (result) {
      const url = `/api/uploads/${result.objectPath}`;
      if (target === 'bill') setBillfileUrl(url);
      else setOnlineSlipfileUrl(url);
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setDescription("");
    setAmount("");
    setBillStatus(false);
    setBillfileUrl(null);
    setOnlineSlip(false);
    setOnlineSlipfileUrl(null);
    setModeOfTravel("");
    setExpBaseLocation(baseLocation || "");
    setRemark("");
    setEditingExpense(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (exp: Expense) => {
    setEditingExpense(exp);
    setDate(exp.date ? format(new Date(exp.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setDescription(exp.description);
    setAmount(String(exp.amount));
    setBillStatus(exp.billStatus);
    setBillfileUrl(exp.billFile || null);
    setOnlineSlip(exp.onlineSlip);
    setOnlineSlipfileUrl(exp.slipFile || null);
    setModeOfTravel(exp.travelMode);
    setExpBaseLocation(exp.baseLocation);
    setRemark(exp.remarks || "");
    setDialogOpen(true);
  };

  const canSubmit = description && amount && modeOfTravel && expBaseLocation && date
    && (!billStatus || billfileUrl)
    && (!onlineSlip || onlineSlipfileUrl);

  const isMutating = addExpenseMutation.isPending || updateExpenseMutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = {
      date,
      description,
      amount,
      billStatus,
      billfileUrl: billStatus ? billfileUrl : null,
      onlineSlip,
      onlineSlipfileUrl: onlineSlip ? onlineSlipfileUrl : null,
      modeOfTravel,
      baseLocation: expBaseLocation,
      remark: remark || null,
    };

    if (editingExpense) {
      updateExpenseMutation.mutate({
        requestId,
        expenseId: editingExpense.id,
        ...payload,
      }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); }
      });
    } else {
      addExpenseMutation.mutate({
        id: requestId,
        ...payload,
      }, {
        onSuccess: () => { setDialogOpen(false); resetForm(); }
      });
    }
  };

  const totalExpenses = (expenses || []).reduce((sum: number, e: Expense) => sum + Number(e.amount), 0);

  const expenseFormContent = (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-expense-date" />
        </div>
        <div>
          <Label>Amount (₹) *</Label>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" data-testid="input-expense-amount" />
        </div>
      </div>
      <div>
        <Label>Description *</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Travel to site, food, stay etc." data-testid="input-expense-description" />
      </div>
      <div>
        <Label>Mode of Travel *</Label>
        <Select value={modeOfTravel} onValueChange={setModeOfTravel}>
          <SelectTrigger data-testid="select-expense-travel"><SelectValue placeholder="Select mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Train">Train</SelectItem>
            <SelectItem value="Bus">Bus</SelectItem>
            <SelectItem value="Auto">Auto</SelectItem>
            <SelectItem value="Flight">Flight</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Base Location *</Label>
        <Select value={expBaseLocation} onValueChange={setExpBaseLocation}>
          <SelectTrigger data-testid="select-expense-location"><SelectValue placeholder="Select state" /></SelectTrigger>
          <SelectContent>
            {INDIAN_STATES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Remark</Label>
        <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Any additional notes..." data-testid="input-expense-remark" />
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Checkbox
            id="billStatus"
            checked={billStatus}
            onCheckedChange={(checked) => {
              setBillStatus(!!checked);
              if (!checked) setBillfileUrl(null);
            }}
            data-testid="checkbox-bill-status"
          />
          <Label htmlFor="billStatus" className="cursor-pointer">Bill Available (YES)</Label>
        </div>
        {billStatus && (
          <div className="ml-7 space-y-2">
            <p className="text-xs text-muted-foreground">Upload bill image (mandatory) *</p>
            <div className="flex gap-2">
              <input
                ref={billInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f, 'bill');
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => billInputRef.current?.click()} disabled={isUploading} data-testid="button-bill-upload">
                <Upload className="h-3.5 w-3.5 mr-1" /> {isUploading ? 'Uploading...' : 'Browse'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setBillCameraOpen(true)} disabled={isUploading} data-testid="button-bill-camera">
                <Camera className="h-3.5 w-3.5 mr-1" /> Camera
              </Button>
            </div>
            {billfileUrl && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle className="h-3.5 w-3.5" /> Bill image uploaded
                <img src={billfileUrl} alt="bill" className="h-10 w-10 object-cover rounded border ml-2" />
              </div>
            )}
            <CameraCapture
              open={billCameraOpen}
              onClose={() => setBillCameraOpen(false)}
              onCapture={(file) => { handleFileUpload(file, 'bill'); setBillCameraOpen(false); }}
              isUploading={isUploading}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Checkbox
            id="onlineSlip"
            checked={onlineSlip}
            onCheckedChange={(checked) => {
              setOnlineSlip(!!checked);
              if (!checked) setOnlineSlipfileUrl(null);
            }}
            data-testid="checkbox-online-slip"
          />
          <Label htmlFor="onlineSlip" className="cursor-pointer">Online Slip Available (YES)</Label>
        </div>
        <div className="ml-7 text-xs text-muted-foreground">
          Mode of Payment: <Badge variant="secondary" className="ml-1 no-default-hover-elevate no-default-active-elevate">{onlineSlip ? "Online" : "Cash"}</Badge>
        </div>
        {onlineSlip && (
          <div className="ml-7 space-y-2">
            <p className="text-xs text-muted-foreground">Upload online slip image (mandatory) *</p>
            <div className="flex gap-2">
              <input
                ref={slipInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f, 'slip');
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => slipInputRef.current?.click()} disabled={isUploading} data-testid="button-slip-upload">
                <Upload className="h-3.5 w-3.5 mr-1" /> {isUploading ? 'Uploading...' : 'Browse'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSlipCameraOpen(true)} disabled={isUploading} data-testid="button-slip-camera">
                <Camera className="h-3.5 w-3.5 mr-1" /> Camera
              </Button>
            </div>
            {onlineSlipfileUrl && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle className="h-3.5 w-3.5" /> Online slip uploaded
                <img src={onlineSlipfileUrl} alt="slip" className="h-10 w-10 object-cover rounded border ml-2" />
              </div>
            )}
            <CameraCapture
              open={slipCameraOpen}
              onClose={() => setSlipCameraOpen(false)}
              onCapture={(file) => { handleFileUpload(file, 'slip'); setSlipCameraOpen(false); }}
              isUploading={isUploading}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card data-testid="card-engineer-expenses">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4" /> Engineer Expenses
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Drone No: <span className="font-mono font-medium text-foreground">{droneNumber}</span></p>
          </div>
          <Button size="sm" onClick={openAddDialog} data-testid="button-add-expense">
            <Plus className="h-4 w-4 mr-1" /> Add Expense
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
              {expenseFormContent}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isMutating}
                className="w-full"
                data-testid="button-submit-expense"
              >
                {isMutating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : editingExpense ? <CheckCircle className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {editingExpense ? 'Update Expense' : 'Add Expense'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : !expenses || expenses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-no-expenses">
            <IndianRupee className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No expenses recorded yet</p>
            <p className="text-xs mt-1">Click "Add Expense" to log travel and other expenses</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">S.No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bill</TableHead>
                    <TableHead>Online Slip</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Travel</TableHead>
                    <TableHead>Base Location</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp: Expense, idx: number) => (
                    <TableRow key={exp.id} data-testid={`row-expense-${exp.id}`}>
                      <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{exp.date ? format(new Date(exp.date), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{exp.description}</TableCell>
                      <TableCell className="font-medium text-sm">{formatCurrency(Number(exp.amount))}</TableCell>
                      <TableCell>
                        {exp.billStatus ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="default" className="text-[10px] no-default-hover-elevate no-default-active-elevate bg-green-600">YES</Badge>
                            {exp.billFile && (
                              <a href={exp.billFile} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[10px]" onClick={(e) => e.stopPropagation()}>View</a>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">NO</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {exp.onlineSlip ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="default" className="text-[10px] no-default-hover-elevate no-default-active-elevate bg-blue-600">YES</Badge>
                            {exp.slipFile && (
                              <a href={exp.slipFile} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[10px]" onClick={(e) => e.stopPropagation()}>View</a>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">NO</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                          {exp.paymentMode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{exp.travelMode}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{exp.baseLocation}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{exp.remarks || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => openEditDialog(exp)}
                            data-testid={`button-edit-expense-${exp.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteExpenseMutation.mutate({ requestId, expenseId: exp.id })}
                            disabled={deleteExpenseMutation.isPending}
                            data-testid={`button-delete-expense-${exp.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-4 pt-3 border-t">
              <div className="text-sm font-medium">
                Total Expenses: <span className="text-lg font-bold text-primary">{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
