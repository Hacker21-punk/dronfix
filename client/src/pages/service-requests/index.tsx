import { useServiceRequests, useCreateServiceRequest, useDeleteServiceRequest } from "@/hooks/use-service-requests";
import { useCurrentUser, useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Clock, FolderOpen, FolderClosed, Loader2, CheckCircle2, XCircle, Filter, ArrowUpDown, Trash2 } from "lucide-react";
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
  const [shippingFilter, setShippingFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"id" | "aging" | "pilot" | "type">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const canCreate = profile?.role === 'admin';
  const isLogistics = profile?.role === 'logistics';

  const searchFiltered = requests?.filter((req: any) =>
    req.pilotName.toLowerCase().includes(search.toLowerCase()) ||
    req.droneNumber.toLowerCase().includes(search.toLowerCase()) ||
    (req.state || "").toLowerCase().includes(search.toLowerCase()) ||
    (req.district || "").toLowerCase().includes(search.toLowerCase()) ||
    (req.pincode || "").includes(search) ||
    (req.logistics?.shippingPartner || "").toLowerCase().includes(search.toLowerCase()) ||
    (req.logistics?.docketNumber || "").toLowerCase().includes(search.toLowerCase())
  );

  const openRequests = searchFiltered?.filter((req: any) => OPEN_STATUSES.includes(req.status)) || [];
  const closedRequests = searchFiltered?.filter((req: any) => CLOSED_STATUSES.includes(req.status)) || [];

  const baseList = activeTab === "open" ? openRequests : closedRequests;

  const filteredRequests = useMemo(() => {
    let list = [...baseList];
    if (statusFilter !== "all") {
      list = list.filter(r => r.status === statusFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter(r => r.serviceType === typeFilter);
    }
    if (shippingFilter !== "all") {
      if (shippingFilter === "not_shipped") {
        list = list.filter(r => !r.shippingStatus);
      } else {
        list = list.filter(r => r.shippingStatus === shippingFilter);
      }
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
  }, [baseList, statusFilter, typeFilter, shippingFilter, sortBy, sortDir]);

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
    setShippingFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-page-title">
            {profile?.role === 'engineer' ? 'My Assigned Jobs' : isLogistics ? 'Shipping & Logistics' : 'Service Requests'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.role === 'engineer' ? 'View and manage your assigned service requests' 
             : isLogistics ? 'Manage shipping and delivery tracking for service requests'
             : 'Track and manage drone repairs'}
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
          {profile?.role === 'engineer' ? 'Open Jobs' : isLogistics ? 'Pending Shipments' : 'Open Requests'}
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
          {profile?.role === 'engineer' ? 'Closed Jobs' : isLogistics ? 'Shipped / Delivered' : 'Closed Requests'}
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
              {isLogistics && (
                <Select value={shippingFilter} onValueChange={setShippingFilter}>
                  <SelectTrigger className="w-[160px]" data-testid="select-filter-shipping">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shipping</SelectItem>
                    <SelectItem value="not_shipped">Not Shipped</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              )}
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
                  {isLogistics && <TableHead>Shipping Status</TableHead>}
                  {isLogistics && <TableHead>Courier / Docket</TableHead>}
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("aging")} data-testid="sort-aging">
                    <div className="flex items-center gap-1">
                      Aging
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TableHead>
                  {!isLogistics && <TableHead>Assigned To</TableHead>}
                  {canCreate && <TableHead className="w-[60px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(isLogistics ? 9 : 8).fill(0).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted/50 rounded animate-pulse w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isLogistics ? 9 : 8} className="text-center py-12 text-muted-foreground" data-testid="text-empty-state">
                      {profile?.role === 'engineer'
                        ? (activeTab === "open" ? "No jobs assigned to you yet." : "No completed jobs yet.")
                        : isLogistics
                        ? (activeTab === "open" ? "No pending shipments" : "No shipped/delivered requests")
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
                          <span className="text-sm font-mono" data-testid={`text-drone-${req.id}`}>{req.droneNumber}</span>
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
                        {isLogistics && (
                          <TableCell>
                            {req.logistics?.shippingStatus ? (
                              <Badge 
                                variant={req.logistics.shippingStatus === 'delivered' ? 'default' : 'secondary'} 
                                className={`text-xs uppercase tracking-wider no-default-hover-elevate no-default-active-elevate ${
                                  req.logistics.shippingStatus === 'delivered' ? 'bg-green-600 hover:bg-green-700' : 
                                  req.logistics.shippingStatus === 'in_transit' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                                }`}
                                data-testid={`text-shipping-status-${req.id}`}
                              >
                                {req.logistics.shippingStatus.replace('_', ' ')}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not shipped</span>
                            )}
                          </TableCell>
                        )}
                        {isLogistics && (
                          <TableCell>
                            <div className="text-sm" data-testid={`text-courier-${req.id}`}>
                              {req.logistics?.shippingPartner ? (
                                <div>
                                  <span className="font-medium">{req.logistics.shippingPartner}</span>
                                  {req.logistics.docketNumber && (
                                    <span className="block text-xs text-muted-foreground">{req.logistics.docketNumber}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span data-testid={`text-aging-${req.id}`}>{agingLabel}</span>
                          </div>
                        </TableCell>
                        {!isLogistics && (
                          <TableCell>
                            <span className="text-sm" data-testid={`text-assigned-${req.id}`}>
                              {req.assignedTo?.name || '-'}
                            </span>
                          </TableCell>
                        )}
                        {canCreate && (
                          <TableCell>
                            <DeleteRequestButton id={req.id} />
                          </TableCell>
                        )}
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

function DeleteRequestButton({ id }: { id: number }) {
  const deleteMutation = useDeleteServiceRequest();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      data-testid={`button-delete-${id}`}
      onClick={(e) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete SR #${id.toString().padStart(4, '0')}? This action cannot be undone.`)) {
          deleteMutation.mutate(id);
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function CreateRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { mutate, isPending } = useCreateServiceRequest();
  const { data: usersData } = useUsers();
  const engineers = usersData?.filter((u: any) => u.role === 'engineer') || [];
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pincodeMsg, setPincodeMsg] = useState("");

  // New fields state
  const [complaintType, setComplaintType] = useState<string>("general_service");
  const [customerStatement, setCustomerStatement] = useState("");
  const [modelDetails, setModelDetails] = useState("");
  const [serviceTypeDetails, setServiceTypeDetails] = useState<string[]>([]);
  const [insuranceApplicable, setInsuranceApplicable] = useState<string>("");
  const [insuranceCompany, setInsuranceCompany] = useState("");
  const [uinNumber, setUinNumber] = useState("");

  // Materials multi-select
  const [materialsData, setMaterialsData] = useState<any[]>([]);
  const [selectedParts, setSelectedParts] = useState<{ materialDescription: string; partNumber: string; quantity: number }[]>([]);
  const [searchMaterial, setSearchMaterial] = useState("");

  // Fetch materials on mount
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/materials", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setMaterialsData(await res.json());
      } catch {}
    };
    if (open) fetchMaterials();
  }, [open]);

  const form = useForm({
    resolver: zodResolver(insertServiceRequestSchema),
    defaultValues: {
      pilotName: "",
      droneNumber: "",
      serialNumber: "",
      address: "",
      pincode: "",
      state: "",
      district: "",
      contactDetails: "",
      complaint: "",
      complaintType: "general_service" as const,
      serviceType: "L1" as const,
      assignedEngineerId: "",
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

  const addPart = (material: any) => {
    if (selectedParts.find(p => p.partNumber === material.materialCode)) return;
    setSelectedParts(prev => [...prev, {
      materialDescription: material.materialDescription,
      partNumber: material.materialCode,
      quantity: 1,
    }]);
    setSearchMaterial("");
  };

  const updatePartQty = (idx: number, qty: number) => {
    setSelectedParts(prev => prev.map((p, i) => i === idx ? { ...p, quantity: Math.max(1, qty) } : p));
  };

  const removePart = (idx: number) => {
    setSelectedParts(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleServiceType = (type: string) => {
    setServiceTypeDetails(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    if (type === "Insurance" && serviceTypeDetails.includes("Insurance")) {
      setInsuranceApplicable("");
      setInsuranceCompany("");
    }
  };

  const filteredMaterials = materialsData.filter(m =>
    m.materialDescription?.toLowerCase().includes(searchMaterial.toLowerCase()) ||
    m.materialCode?.toLowerCase().includes(searchMaterial.toLowerCase())
  ).slice(0, 10);

  const onSubmit = (data: any) => {
    const submitData = {
      ...data,
      complaintType,
      complaint: complaintType === "customer_statement" ? customerStatement : complaintType.replace("_", " "),
      customerStatement: complaintType === "customer_statement" ? customerStatement : undefined,
      modelDetails: modelDetails || undefined,
      serviceTypeDetail: serviceTypeDetails.join(",") || undefined,
      insuranceApplicable: serviceTypeDetails.includes("Insurance") ? insuranceApplicable === "yes" : false,
      insuranceCompany: insuranceApplicable === "yes" ? insuranceCompany : undefined,
      uinNumber: uinNumber || undefined,
      partsRequested: selectedParts.length > 0 ? selectedParts : undefined,
    };
    if (!submitData.assignedEngineerId) {
      delete submitData.assignedEngineerId;
    }
    mutate(submitData, {
      onSuccess: () => {
        form.reset();
        setPincodeStatus("idle"); setPincodeMsg("");
        setComplaintType("general_service"); setCustomerStatement("");
        setModelDetails(""); setServiceTypeDetails([]);
        setInsuranceApplicable(""); setInsuranceCompany("");
        setUinNumber(""); setSelectedParts([]);
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Service Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          {/* Customer & Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer / Pilot Name *</Label>
              <Input {...form.register("pilotName")} data-testid="input-pilot-name" />
              {form.formState.errors.pilotName && <p className="text-xs text-destructive">{form.formState.errors.pilotName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Contact Details *</Label>
              <Input {...form.register("contactDetails")} data-testid="input-contact" />
              {form.formState.errors.contactDetails && <p className="text-xs text-destructive">{form.formState.errors.contactDetails.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address *</Label>
            <Input {...form.register("address")} data-testid="input-address" />
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
                <p className={`text-xs ${pincodeStatus === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                  {pincodeMsg}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input {...form.register("state")} placeholder="Auto-filled" data-testid="input-state" />
            </div>
            <div className="space-y-2">
              <Label>District</Label>
              <Input {...form.register("district")} placeholder="Auto-filled" data-testid="input-district" />
            </div>
          </div>

          {/* Drone Details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Drone No. *</Label>
              <Input {...form.register("droneNumber")} data-testid="input-drone-no" />
            </div>
            <div className="space-y-2">
              <Label>Serial No. *</Label>
              <Input {...form.register("serialNumber")} data-testid="input-drone-serial" />
            </div>
            <div className="space-y-2">
              <Label>Service Level</Label>
              <Select onValueChange={(val: any) => form.setValue("serviceType", val)} defaultValue="L1">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L1">L1 Service</SelectItem>
                  <SelectItem value="L2">L2 Service</SelectItem>
                  <SelectItem value="L3">L3 Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Model Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Model Details</Label>
              <Select value={modelDetails} onValueChange={setModelDetails}>
                <SelectTrigger data-testid="select-model-details"><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="E10">E10</SelectItem>
                  <SelectItem value="E10P">E10P</SelectItem>
                  <SelectItem value="DHQ4">DHQ4</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>UIN Number</Label>
              <Input value={uinNumber} onChange={(e) => setUinNumber(e.target.value)} placeholder="Enter UIN" data-testid="input-uin" />
            </div>
          </div>

          {/* Service Type Checkboxes */}
          <div className="space-y-2">
            <Label>Service Type</Label>
            <div className="flex gap-6 py-1">
              {["Warranty", "Paid", "Insurance"].map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceTypeDetails.includes(type)}
                    onChange={() => toggleServiceType(type)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Insurance conditional fields */}
          {serviceTypeDetails.includes("Insurance") && (
            <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-blue-200">
              <div className="space-y-2">
                <Label>Insurance Applicable</Label>
                <Select value={insuranceApplicable} onValueChange={setInsuranceApplicable}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {insuranceApplicable === "yes" && (
                <div className="space-y-2">
                  <Label>Insurance Company</Label>
                  <Select value={insuranceCompany} onValueChange={setInsuranceCompany}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HDFC ERGO">HDFC ERGO</SelectItem>
                      <SelectItem value="ICICI Lombard">ICICI Lombard</SelectItem>
                      <SelectItem value="Bajaj Allianz">Bajaj Allianz</SelectItem>
                      <SelectItem value="Tata AIG">Tata AIG</SelectItem>
                      <SelectItem value="New India Assurance">New India Assurance</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Complaint Dropdown */}
          <div className="space-y-2">
            <Label>Complaint Type *</Label>
            <Select value={complaintType} onValueChange={(v) => { setComplaintType(v); if (v !== "customer_statement") setCustomerStatement(""); }}>
              <SelectTrigger data-testid="select-complaint-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general_service">General Service</SelectItem>
                <SelectItem value="preventive_maintenance">Preventive Maintenance</SelectItem>
                <SelectItem value="customer_statement">Customer Statement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {complaintType === "customer_statement" && (
            <div className="space-y-2">
              <Label>Customer Statement *</Label>
              <Textarea
                value={customerStatement}
                onChange={(e) => setCustomerStatement(e.target.value)}
                rows={3}
                placeholder="Enter customer statement..."
                data-testid="input-customer-statement"
              />
            </div>
          )}

          {/* Requested Parts - Multi Select from Materials Master */}
          <div className="space-y-2">
            <Label>Requested Parts (from Materials Master)</Label>
            <div className="relative">
              <Input
                value={searchMaterial}
                onChange={(e) => setSearchMaterial(e.target.value)}
                placeholder="Search materials by description or code..."
                data-testid="input-search-materials"
              />
              {searchMaterial.length > 1 && filteredMaterials.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredMaterials.map((m: any) => (
                    <div
                      key={m.id}
                      className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex justify-between"
                      onClick={() => addPart(m)}
                    >
                      <span>{m.materialDescription}</span>
                      <span className="text-muted-foreground font-mono text-xs">{m.materialCode}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedParts.length > 0 && (
              <div className="border rounded-md mt-2">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Part Description</th>
                      <th className="text-left p-2 w-28">Part No.</th>
                      <th className="text-center p-2 w-20">Qty</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedParts.map((part, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-xs">{part.materialDescription}</td>
                        <td className="p-2 font-mono text-xs">{part.partNumber}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={1}
                            value={part.quantity}
                            onChange={(e) => updatePartQty(idx, parseInt(e.target.value) || 1)}
                            className="h-7 w-16 text-center mx-auto"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePart(idx)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assign Engineer */}
          <div className="space-y-2">
            <Label>Service Assigned To (Engineer)</Label>
            <Select onValueChange={(val) => form.setValue("assignedEngineerId", val)} defaultValue="">
              <SelectTrigger data-testid="select-assign-engineer"><SelectValue placeholder="Select engineer to assign" /></SelectTrigger>
              <SelectContent>
                {engineers.map((eng: any) => (
                  <SelectItem key={eng.id} value={String(eng.id)}>{eng.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-create">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
