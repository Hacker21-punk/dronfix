import { useServiceRequests, useCreateServiceRequest } from "@/hooks/use-service-requests";
import { useCurrentUser } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Clock, User, MapPin, FolderOpen, FolderClosed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link } from "wouter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceRequestSchema } from "@shared/schema";
import { format, differenceInDays } from "date-fns";

const OPEN_STATUSES = ["pending", "accepted", "in_progress"];
const CLOSED_STATUSES = ["completed", "billed"];

export default function ServiceRequestsPage() {
  const { data: requests, isLoading } = useServiceRequests();
  const { data: profile } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");

  const canCreate = profile?.role === 'admin';

  const searchFiltered = requests?.filter(req =>
    req.pilotName.toLowerCase().includes(search.toLowerCase()) ||
    req.droneNo.toLowerCase().includes(search.toLowerCase())
  );

  const openRequests = searchFiltered?.filter(req => OPEN_STATUSES.includes(req.status)) || [];
  const closedRequests = searchFiltered?.filter(req => CLOSED_STATUSES.includes(req.status)) || [];

  const displayedRequests = activeTab === "open" ? openRequests : closedRequests;

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending': return 'outline';
      case 'accepted': return 'secondary';
      case 'in_progress': return 'default';
      case 'completed': return 'default';
      case 'billed': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">Service Requests</h1>
          <p className="text-muted-foreground mt-1">Track and manage drone repairs</p>
        </div>

        {canCreate && (
          <Button onClick={() => setIsCreateOpen(true)} className="shadow-lg shadow-primary/20" data-testid="button-new-request">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Pilot or Drone No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card"
            data-testid="input-search-requests"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === "open" ? "default" : "outline"}
          onClick={() => setActiveTab("open")}
          data-testid="button-tab-open"
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          Open Requests
          <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
            {isLoading ? "..." : openRequests.length}
          </Badge>
        </Button>
        <Button
          variant={activeTab === "closed" ? "default" : "outline"}
          onClick={() => setActiveTab("closed")}
          data-testid="button-tab-closed"
        >
          <FolderClosed className="h-4 w-4 mr-2" />
          Closed Requests
          <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
            {isLoading ? "..." : closedRequests.length}
          </Badge>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
           Array(6).fill(0).map((_, i) => (
             <div key={i} className="h-64 bg-muted/50 rounded-2xl animate-pulse" />
           ))
        ) : displayedRequests.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground" data-testid="text-empty-state">
            {activeTab === "open" ? "No open service requests" : "No closed service requests"}
          </div>
        ) : (
          displayedRequests.map((req) => {
            const agingDays = req.createdAt ? differenceInDays(new Date(), new Date(req.createdAt)) : 0;
            const agingLabel = agingDays === 0 ? 'Today' : agingDays === 1 ? '1 day' : `${agingDays} days`;

            return (
              <Link key={req.id} href={`/requests/${req.id}`}>
                <Card className="h-full hover-elevate cursor-pointer" data-testid={`card-request-${req.id}`}>
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4 gap-2">
                      <Badge variant="outline" className="font-mono text-xs no-default-hover-elevate no-default-active-elevate">
                        #{req.id.toString().padStart(4, '0')}
                      </Badge>
                      <Badge variant={getStatusVariant(req.status)} className="text-xs uppercase tracking-wider no-default-hover-elevate no-default-active-elevate" data-testid={`text-status-${req.id}`}>
                        {req.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-3 flex-1">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold" data-testid={`text-pilot-${req.id}`}>{req.pilotName}</p>
                          <p className="text-sm text-muted-foreground font-mono" data-testid={`text-drone-serial-${req.id}`}>
                            {req.droneSerial || req.droneNo}
                          </p>
                        </div>
                      </div>

                      {(req.state || req.district) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span data-testid={`text-location-${req.id}`}>
                            {[req.district, req.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span data-testid={`text-aging-${req.id}`}>Aging: {agingLabel}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate">
                          {req.serviceType}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      <CreateRequestDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}

function CreateRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mutate, isPending } = useCreateServiceRequest();
  const form = useForm({
    resolver: zodResolver(insertServiceRequestSchema),
    defaultValues: {
      pilotName: "",
      droneNo: "",
      droneSerial: "",
      pilotAddress: "",
      state: "",
      district: "",
      contactDetails: "",
      complaint: "",
      partsRequested: "",
      serviceType: "L1" as const,
    }
  });

  const onSubmit = (data: any) => {
    mutate(data, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Service Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pilot Name</Label>
              <Input {...form.register("pilotName")} data-testid="input-pilot-name" />
              {form.formState.errors.pilotName && <p className="text-xs text-destructive">{form.formState.errors.pilotName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Contact Details</Label>
              <Input {...form.register("contactDetails")} data-testid="input-contact" />
              {form.formState.errors.contactDetails && <p className="text-xs text-destructive">{form.formState.errors.contactDetails.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input {...form.register("pilotAddress")} data-testid="input-address" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>State</Label>
              <Input {...form.register("state")} placeholder="e.g. Madhya Pradesh" data-testid="input-state" />
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Input {...form.register("district")} placeholder="e.g. Bhopal" data-testid="input-district" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Drone No.</Label>
              <Input {...form.register("droneNo")} data-testid="input-drone-no" />
              {form.formState.errors.droneNo && <p className="text-xs text-destructive">{form.formState.errors.droneNo.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Serial No.</Label>
              <Input {...form.register("droneSerial")} data-testid="input-drone-serial" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select onValueChange={(val: any) => form.setValue("serviceType", val)} defaultValue="L1">
                <SelectTrigger data-testid="select-service-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L1">L1 Service</SelectItem>
                  <SelectItem value="L2">L2 Service</SelectItem>
                  <SelectItem value="L3">L3 Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Complaint</Label>
            <Textarea {...form.register("complaint")} rows={3} data-testid="input-complaint" />
            {form.formState.errors.complaint && <p className="text-xs text-destructive">{form.formState.errors.complaint.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Requested Parts (Optional)</Label>
            <Input {...form.register("partsRequested")} placeholder="e.g. Propellers, Battery..." data-testid="input-parts" />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-create">Create Request</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
