import { useServiceRequests, useCreateServiceRequest } from "@/hooks/use-service-requests";
import { useCurrentUser } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Calendar, User, Plane, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link } from "wouter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceRequestSchema } from "@shared/schema";
import { format } from "date-fns";

export default function ServiceRequestsPage() {
  const { data: requests, isLoading } = useServiceRequests();
  const { data: profile } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Allow admin to create requests
  const canCreate = profile?.role === 'admin';

  const filteredRequests = requests?.filter(req => 
    req.pilotName.toLowerCase().includes(search.toLowerCase()) || 
    req.droneNo.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'accepted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in_progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'billed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Service Requests</h1>
          <p className="text-muted-foreground mt-1">Track and manage drone repairs</p>
        </div>
        
        {canCreate && (
          <Button onClick={() => setIsCreateOpen(true)} className="shadow-lg shadow-primary/20">
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
          />
        </div>
        <Button variant="outline" className="sm:w-auto w-full">
          <Filter className="h-4 w-4 mr-2" />
          Filter Status
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
           Array(6).fill(0).map((_, i) => (
             <div key={i} className="h-64 bg-muted/50 rounded-2xl animate-pulse" />
           ))
        ) : filteredRequests?.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            No service requests found
          </div>
        ) : (
          filteredRequests?.map((req) => (
            <Link key={req.id} href={`/requests/${req.id}`}>
              <Card className="h-full hover:shadow-xl hover:border-primary/50 transition-all duration-300 cursor-pointer group">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="font-mono text-xs">
                      #{req.id.toString().padStart(4, '0')}
                    </Badge>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(req.status)}`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="space-y-4 flex-1">
                    <div>
                      <h3 className="font-display font-bold text-lg group-hover:text-primary transition-colors">
                        {req.droneNo} <span className="text-muted-foreground font-normal text-sm">({req.serviceType})</span>
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        {req.pilotName}
                      </div>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg text-sm line-clamp-2 text-muted-foreground italic">
                      "{req.complaint}"
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-auto">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {req.tentativeServiceDate ? format(new Date(req.tentativeServiceDate), 'MMM d, yyyy') : 'Date pending'}
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Plane className="h-3 w-3" />
                        {req.assignedTo?.name ? req.assignedTo.name : 'Unassigned'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
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
              <Input {...form.register("pilotName")} />
              {form.formState.errors.pilotName && <p className="text-xs text-destructive">{form.formState.errors.pilotName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Contact Details</Label>
              <Input {...form.register("contactDetails")} />
              {form.formState.errors.contactDetails && <p className="text-xs text-destructive">{form.formState.errors.contactDetails.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input {...form.register("pilotAddress")} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Drone No.</Label>
              <Input {...form.register("droneNo")} />
              {form.formState.errors.droneNo && <p className="text-xs text-destructive">{form.formState.errors.droneNo.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Serial No.</Label>
              <Input {...form.register("droneSerial")} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select onValueChange={(val: any) => form.setValue("serviceType", val)} defaultValue="L1">
                <SelectTrigger>
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
            <Textarea {...form.register("complaint")} rows={3} />
            {form.formState.errors.complaint && <p className="text-xs text-destructive">{form.formState.errors.complaint.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Requested Parts (Optional)</Label>
            <Input {...form.register("partsRequested")} placeholder="e.g. Propellers, Battery..." />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>Create Request</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
