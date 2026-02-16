import { useParams, useLocation } from "wouter";
import { 
  useServiceRequest, 
  useUpdateServiceRequest, 
  useConsumePart, 
  useUploadServiceImage,
  useAssignEngineer
} from "@/hooks/use-service-requests";
import { useInventory } from "@/hooks/use-inventory";
import { useCurrentUser, useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, CheckCircle, Upload, Wrench, Download, Camera, User, FileText, ArrowLeft, FolderOpen, Loader2, ZoomIn, X
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
          {role === 'admin' && request.status === 'completed' && (
             <Button className="bg-green-600 hover:bg-green-700">
               Generate Invoice
             </Button>
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
                   <p className="text-sm text-muted-foreground">{request.pilotAddress}</p>
                   {(request.state || request.district) && (
                     <p className="text-sm text-muted-foreground">
                       {[request.district, request.state].filter(Boolean).join(', ')}
                     </p>
                   )}
                </div>
                <div>
                   <h4 className="text-sm font-medium text-muted-foreground mb-1">Drone Details</h4>
                   <p className="font-medium text-lg">{request.droneNo} <span className="text-sm font-normal text-muted-foreground">({request.serviceType})</span></p>
                   <p className="text-sm font-mono">SN: {request.droneSerial}</p>
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

          {/* Service Images */}
          <ServiceImagesSection requestId={requestId} canUpload={role === 'engineer'} images={request.images} />

        </div>

        {/* Sidebar Actions Column */}
        <div className="space-y-6">
          
          {/* Assignment Card */}
          <Card>
            <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {request.assignedToId ? (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Assigned Engineer</p>
                    <p className="text-sm text-muted-foreground">ID: {request.assignedToId}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm mb-4">
                  No engineer assigned
                </div>
              )}

              {role === 'admin' && (
                <AssignEngineerDialog requestId={requestId} currentEngineerId={request.assignedToId} />
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

           {/* PDF Report Download */}
           {request.status === 'completed' && (
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

  const engineers = users?.filter(u => u.role === 'engineer') || [];

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
              {engineers.map(eng => (
                <SelectItem key={eng.userId} value={eng.userId!}>{eng.name}</SelectItem>
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
          tentativeServiceDate: date ? new Date(date).toISOString() : undefined
        }, { onSuccess: () => setOpen(false) })}>
          Confirm Acceptance
        </Button>
      </DialogContent>
    </Dialog>
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
                  {inventory?.map(item => (
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
                  {showPrice && <td className="p-3 text-right font-medium">{formatCurrency(Number(part.item?.price || 0) * part.quantity)}</td>}
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
      uploadImageMutation.mutate({ id: requestId, imageUrl: result.uploadURL, type });
    }
    setCameraOpen(false);
  }, [uploadFile, uploadImageMutation, requestId, type]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const result = await uploadFile(files[i]);
      if (result) {
        uploadImageMutation.mutate({ id: requestId, imageUrl: result.uploadURL, type });
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
            src={img.imageUrl}
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
          <a href={img.imageUrl} target="_blank" rel="noopener noreferrer" download={`${label}-${img.id}.jpg`}>
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
              src={img.imageUrl}
              className="w-full max-h-[70vh] object-contain rounded-md"
              alt={label}
              data-testid={`img-fullsize-${img.id}`}
            />
          </div>
          <div className="flex justify-end gap-2 p-4 pt-0">
            <Button variant="outline" size="sm" asChild data-testid={`button-download-fullsize-${img.id}`}>
              <a href={img.imageUrl} target="_blank" rel="noopener noreferrer" download={`${label}-${img.id}.jpg`}>
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

function DocumentUpload({ label, url, canUpload, onUpload }: { label: string, url: string | null, canUpload: boolean, onUpload: (url: string) => void }) {
  const { uploadFile, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      onUpload(result.uploadURL);
    }
    e.target.value = '';
  };

  const handleCameraCapture = useCallback(async (file: File) => {
    const result = await uploadFile(file);
    if (result) {
      onUpload(result.uploadURL);
    }
    setCameraOpen(false);
  }, [uploadFile, onUpload]);

  return (
    <div className="flex flex-wrap items-center justify-between p-3 border rounded-lg bg-card/50 gap-2">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <div>
          <span className="font-medium text-sm">{label}</span>
          {url && <p className="text-xs text-green-600 dark:text-green-400">Uploaded</p>}
        </div>
      </div>
      
      <div className="flex items-center gap-1.5">
        {url && (
          <Button variant="outline" size="sm" asChild data-testid={`button-download-${label.toLowerCase().replace(/\s+/g, '-')}`}>
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
              data-testid={`button-camera-doc-${label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
              Camera
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              data-testid={`button-upload-doc-${label.toLowerCase().replace(/\s+/g, '-')}`}
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
  );
}
