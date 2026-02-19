import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertServiceRequest, type ServiceRequest, type UpdateServiceRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useServiceRequests() {
  return useQuery({
    queryKey: [api.serviceRequests.list.path],
    queryFn: async () => {
      const res = await fetch(api.serviceRequests.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch service requests");
      return api.serviceRequests.list.responses[200].parse(await res.json());
    },
  });
}

export function useServiceRequest(id: number) {
  return useQuery({
    queryKey: [api.serviceRequests.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.serviceRequests.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch service request details");
      return api.serviceRequests.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertServiceRequest) => {
      const res = await fetch(api.serviceRequests.create.path, {
        method: api.serviceRequests.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create request");
      return api.serviceRequests.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.list.path] });
      toast({ title: "Success", description: "Service request created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create request", variant: "destructive" });
    },
  });
}

export function useUpdateServiceRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateServiceRequest) => {
      const url = buildUrl(api.serviceRequests.update.path, { id });
      const res = await fetch(url, {
        method: api.serviceRequests.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update request");
      return api.serviceRequests.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.get.path, variables.id] });
      toast({ title: "Success", description: "Request updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update request", variant: "destructive" });
    },
  });
}

export function useAssignEngineer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, engineerId }: { id: number; engineerId: string }) => {
      const url = buildUrl(api.serviceRequests.assign.path, { id });
      const res = await fetch(url, {
        method: api.serviceRequests.assign.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engineerId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to assign engineer");
      return api.serviceRequests.assign.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.list.path] });
      toast({ title: "Success", description: "Engineer assigned" });
    },
  });
}

export function useUploadServiceImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, imageUrl, type }: { id: number; imageUrl: string; type: 'before' | 'after' }) => {
      const url = buildUrl(api.serviceImages.upload.path, { id });
      const res = await fetch(url, {
        method: api.serviceImages.upload.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, type }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upload image info");
      return api.serviceImages.upload.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.get.path, variables.id] });
      toast({ title: "Success", description: "Image uploaded" });
    },
  });
}

export function useConsumePart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, inventoryId, quantity }: { id: number; inventoryId: number; quantity: number }) => {
      const url = buildUrl(api.partsConsumed.add.path, { id });
      const res = await fetch(url, {
        method: api.partsConsumed.add.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryId, quantity }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add part");
      }
      return api.partsConsumed.add.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.inventory.list.path] }); // Inventory changed
      toast({ title: "Success", description: "Part consumed" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useSubmitInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; invoiceNumber: string; challanNumber?: string; invoiceValue: string; reimbursementAmount?: string; invoiceType: string; invoiceDate: string }) => {
      const res = await fetch(`/api/service-requests/${id}/invoice`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit invoice");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.list.path] });
      toast({ title: "Success", description: "Invoice generated successfully" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useSubmitLogistics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; shippingPartnerName: string; docketDetails?: string; shippingDate: string; shippingStatus: string }) => {
      const res = await fetch(`/api/service-requests/${id}/logistics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update logistics");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.list.path] });
      toast({ title: "Success", description: "Shipping details updated" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: [api.reports.dashboard.path],
    queryFn: async () => {
      const res = await fetch(api.reports.dashboard.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return api.reports.dashboard.responses[200].parse(await res.json());
    },
  });
}
