import { useServiceRequests, useCreateServiceRequest } from "@/hooks/use-service-requests";
import { useCurrentUser, useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Clock, FolderOpen, FolderClosed, Loader2, CheckCircle2, XCircle, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const OPEN_STATUSES = ["pending", "accepted", "in_progress"];
const CLOSED_STATUSES = ["completed", "billed"];

export default function ServiceRequestsPage() {
  const { data: requests, isLoading } = useServiceRequests();
  const { data: profile } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"id" | "aging" | "pilot" | "type">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const canCreate = profile?.role === 'admin';

  const searchFiltered = requests?.filter(req =>
    req.pilotName.toLowerCase().includes(search.toLowerCase()) ||
    req.droneNo.toLowerCase().includes(search.toLowerCase()) ||
    (req.state || "").toLowerCase().includes(search.toLowerCase()) ||
    (req.district || "").toLowerCase().includes(search.toLowerCase()) ||
    (req.pincode || "").includes(search)
  );

  const openRequests = searchFiltered?.filter(req => OPEN_STATUSES.includes(req.status)) || [];
  const closedRequests = searchFiltered?.filter(req => CLOSED_STATUSES.includes(req.status)) || [];

  const baseList = activeTab === "open" ? openRequests : closedRequests;

  const filteredRequests = useMemo(() => {
    let list = [...baseList];
    if (statusFilter !== "all") {
      list = list.filter(r => r.status === statusFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter(r => r.serviceType === typeFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "id": cmp = a.id - b.id; break;
        case "aging": {
          const aAge = a.createdAt ? differenceInDays(new Date(), new Date(a.createdAt)) : 0;
          const bAge = b.createdAt ? differenceInDays(new Date(), new Date(b.createdAt)) : 0;
          cmp = aAge - bAge;
          break;
        }
        case "pilot": cmp = a.pilotName.localeCompare(b.pilotName); break;
        case "type": cmp = a.serviceType.localeCompare(b.serviceType); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [baseList, statusFilter, typeFilter, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

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

  const statusOptions = activeTab === "open"
    ? [{ value: "all", label: "All Statuses" }, { value: "pending", label: "Pending" }, { value: "accepted", label: "Accepted" }, { value: "in_progress", label: "In Progress" }]
    : [{ value: "all", label: "All Statuses" }, { value: "completed", label: "Completed" }, { value: "billed", label: "Billed" }];

  const [, navigate] = useLocation();

  const handleTabChange = (tab: "open" | "closed") => {
    setActiveTab(tab);
    setStatusFilter("all");
    setTypeFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">
            {profile?.role === 'engineer' ? 'My Assigned Jobs' : 'Service Requests'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.role === 'engineer' ? 'View and manage your assigned service requests' : 'Track and manage drone repairs'}
          </p>
        </div>

        {canCreate && (
          <Button onClick={() => setIsCreateOpen(true)} className="shadow-lg shadow-primary/20" data-testid="button-new-request">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === "open" ? "default" : "outline"}
          onClick={() => handleTabChange("open")}
          data-testid="button-tab-open"
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          {profile?.role === 'engineer' ? 'Open Jobs' : 'Open Requests'}
          <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
            {isLoading ? "..." : openRequests.length}
          </Badge>
        </Button>
        <Button
          variant={activeTab === "closed" ? "default" : "outline"}
          onClick={() => handleTabChange("closed")}
          data-testid="button-tab-closed"
        >
          <FolderClosed className="h-4 w-4 mr-2" />
          {profile?.role === 'engineer' ? 'Closed Jobs' : 'Closed Requests'}
          <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
            {isLoading ? "..." : closedRequests.length}
          </Badge>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by pilot, drone, location, pincode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-requests"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-filter-type">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="L1">L1</SelectItem>
                  <SelectItem value="L2">L2</SelectItem>
                  <SelectItem value="L3">L3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] cursor-pointer select-none" onClick={() => toggleSort("id")} data-testid="sort-sr">
                    <div className="flex items-center gap-1">
                      SR#
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("pilot")} data-testid="sort-pilot">
                    <div className="flex items-center gap-1">
                      Pilot Name
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead>Drone No.</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("type")} data-testid="sort-type">
                    <div className="flex items-center gap-1">
                      Type
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("aging")} data-testid="sort-aging">
                    <div className="flex items-center gap-1">
                      Aging
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(8).fill(0).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted/50 rounded animate-pulse w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground" data-testid="text-empty-state">
                      {profile?.role === 'engineer'
                        ? (activeTab === "open" ? "No jobs assigned to you yet." : "No completed jobs yet.")
                        : (activeTab === "open" ? "No open service requests" : "No closed service requests")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((req) => {
                    const agingDays = req.createdAt ? differenceInDays(new Date(), new Date(req.createdAt)) : 0;
                    const agingLabel = agingDays === 0 ? 'Today' : agingDays === 1 ? '1 day' : `${agingDays} days`;
                    const location = [req.district, req.state].filter(Boolean).join(', ');

                    return (
                      <TableRow
                        key={req.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/requests/${req.id}`)}
                        data-testid={`row-request-${req.id}`}
                      >
                        <TableCell>
                          <span className="font-mono text-sm font-medium text-primary" data-testid={`text-sr-${req.id}`}>
                            #{req.id.toString().padStart(4, '0')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium" data-testid={`text-pilot-${req.id}`}>{req.pilotName}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono" data-testid={`text-drone-${req.id}`}>{req.droneNo}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground" data-testid={`text-location-${req.id}`}>
                            {location || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate" data-testid={`text-type-${req.id}`}>
                            {req.serviceType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(req.status)} className="text-xs uppercase tracking-wider no-default-hover-elevate no-default-active-elevate" data-testid={`text-status-${req.id}`}>
                            {req.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span data-testid={`text-aging-${req.id}`}>{agingLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm" data-testid={`text-assigned-${req.id}`}>
                            {req.assignedTo?.name || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {!isLoading && filteredRequests.length > 0 && (
            <div className="px-4 py-3 border-t text-sm text-muted-foreground">
              Showing {filteredRequests.length} of {baseList.length} {activeTab === "open" ? "open" : "closed"} requests
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRequestDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}

function CreateRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mutate, isPending } = useCreateServiceRequest();
  const { data: users } = useUsers();
  const engineers = users?.filter(u => u.role === 'engineer') || [];
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pincodeMsg, setPincodeMsg] = useState("");

  const form = useForm({
    resolver: zodResolver(insertServiceRequestSchema),
    defaultValues: {
      pilotName: "",
      droneNo: "",
      droneSerial: "",
      pilotAddress: "",
      pincode: "",
      state: "",
      district: "",
      contactDetails: "",
      complaint: "",
      partsRequested: "",
      serviceType: "L1" as const,
      assignedToId: "",
    }
  });

  const lookupPincode = useCallback(async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) {
      if (pincode.length > 0 && pincode.length < 6) {
        setPincodeStatus("idle");
        setPincodeMsg("");
      }
      return;
    }
    setPincodeStatus("loading");
    setPincodeMsg("");
    try {
      const res = await fetch(`/api/pincode/${pincode}`);
      const data = await res.json();
      if (data.success) {
        form.setValue("state", data.state, { shouldValidate: true });
        form.setValue("district", data.district, { shouldValidate: true });
        setPincodeStatus("success");
        setPincodeMsg(`${data.district}, ${data.state}`);
      } else {
        setPincodeStatus("error");
        setPincodeMsg("Pincode not found");
      }
    } catch {
      setPincodeStatus("error");
      setPincodeMsg("Lookup failed");
    }
  }, [form]);

  const pincodeValue = form.watch("pincode");
  useEffect(() => {
    if (pincodeValue && pincodeValue.length === 6) {
      lookupPincode(pincodeValue);
    } else {
      setPincodeStatus("idle");
      setPincodeMsg("");
    }
  }, [pincodeValue, lookupPincode]);

  const onSubmit = (data: any) => {
    const submitData = { ...data };
    if (!submitData.assignedToId) {
      delete submitData.assignedToId;
    }
    mutate(submitData, {
      onSuccess: () => {
        form.reset();
        setPincodeStatus("idle");
        setPincodeMsg("");
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Pincode</Label>
              <div className="relative">
                <Input
                  {...form.register("pincode")}
                  placeholder="e.g. 462001"
                  maxLength={6}
                  inputMode="numeric"
                  data-testid="input-pincode"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {pincodeStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {pincodeStatus === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {pincodeStatus === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                </div>
              </div>
              {pincodeMsg && (
                <p className={`text-xs ${pincodeStatus === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`} data-testid="text-pincode-result">
                  {pincodeMsg}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input {...form.register("state")} placeholder="Auto-filled from pincode" data-testid="input-state" />
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Input {...form.register("district")} placeholder="Auto-filled from pincode" data-testid="input-district" />
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

          <div className="space-y-2">
            <Label>Assign Engineer</Label>
            <Select onValueChange={(val) => form.setValue("assignedToId", val)} defaultValue="">
              <SelectTrigger data-testid="select-assign-engineer">
                <SelectValue placeholder="Select engineer to assign" />
              </SelectTrigger>
              <SelectContent>
                {engineers.map(eng => (
                  <SelectItem key={eng.userId} value={eng.userId!}>{eng.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
