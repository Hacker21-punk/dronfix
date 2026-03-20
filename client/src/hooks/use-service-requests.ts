import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useServiceRequests() {
  return useQuery({
    queryKey: [api.serviceRequests.list.path],
    queryFn: async () => {
      const res = await fetch(api.serviceRequests.list.path, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch service requests");
      return res.json();
    },
  });
}

export function useServiceRequest(id: number) {
  return useQuery({
    queryKey: [api.serviceRequests.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.serviceRequests.get.path, { id });
      const res = await fetch(url, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch service request details");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.serviceRequests.create.path, data);
      return res.json();
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

export function useDeleteServiceRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/service-requests/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete service request");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.reports.dashboard.path] });
      toast({ title: "Success", description: "Service request deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete request", variant: "destructive" });
    },
  });
}

export function useUpdateServiceRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const url = buildUrl(api.serviceRequests.update.path, { id });
      const res = await apiRequest("PUT", url, data);
      return res.json();
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
      const res = await apiRequest("PATCH", url, { engineerId });
      return res.json();
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
    mutationFn: async ({ id, fileUrl, type }: { id: number; fileUrl: string; type: 'before' | 'after' }) => {
      const url = buildUrl(api.images.upload.path, { id });
      const res = await apiRequest("POST", url, { fileUrl, type });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.get.path, variables.id] });
      toast({ title: "Success", description: "Image uploaded" });
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, type, fileUrl }: { id: number; type: string; fileUrl: string }) => {
      const url = buildUrl(api.documents.upload.path, { id });
      const res = await apiRequest("POST", url, { type, fileUrl });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.get.path, variables.id] });
      toast({ title: "Success", description: "Document uploaded" });
    },
  });
}

export function useConsumePart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, inventoryId, quantity }: { id: number; inventoryId: number; quantity: number }) => {
      const url = buildUrl(api.partsConsumed.add.path, { id });
      const res = await apiRequest("POST", url, { inventoryId, quantity });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.inventory.list.path] });
      toast({ title: "Success", description: "Part consumed" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useSubmitInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; invoiceNumber: string; challanNumber?: string; invoiceValue: string; reimbursementAmount?: string; invoiceType?: string; invoiceDate?: string }) => {
      const res = await apiRequest("POST", `/api/service-requests/${id}/invoice`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.serviceRequests.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/billed-requests"] });
      queryClient.invalidateQueries({ queryKey: [api.reports.dashboard.path] });
      toast({ title: "Success", description: "Invoice generated" });
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
    mutationFn: async ({ id, ...data }: { id: number; shippingPartner: string; docketNumber?: string; shippingDate?: string; shippingStatus?: string }) => {
      const res = await apiRequest("PATCH", `/api/service-requests/${id}/logistics`, data);
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

export function useExpenses(serviceRequestId: number) {
  return useQuery({
    queryKey: ['/api/service-requests', serviceRequestId, 'expenses'],
    queryFn: async () => {
      const res = await fetch(`/api/service-requests/${serviceRequestId}/expenses`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
    enabled: !!serviceRequestId,
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const res = await apiRequest("POST", `/api/service-requests/${id}/expenses`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests', variables.id, 'expenses'] });
      toast({ title: "Success", description: "Expense added" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, expenseId, ...data }: { requestId: number; expenseId: number; [key: string]: any }) => {
      const res = await apiRequest("PUT", `/api/service-requests/${requestId}/expenses/${expenseId}`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests', variables.requestId, 'expenses'] });
      toast({ title: "Success", description: "Expense updated" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, expenseId }: { requestId: number; expenseId: number }) => {
      const res = await fetch(`/api/service-requests/${requestId}/expenses/${expenseId}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete expense");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-requests', variables.requestId, 'expenses'] });
      toast({ title: "Success", description: "Expense removed" });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: [api.reports.dashboard.path],
    queryFn: async () => {
      const res = await fetch(api.reports.dashboard.path, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
  });
}
