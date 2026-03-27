import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Loader2 } from "lucide-react";

export function JobSheetDialog({ 
  requestId, 
  engineerName,
  existingJobCard 
}: { 
  requestId: number, 
  engineerName: string,
  existingJobCard?: any 
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      observations: existingJobCard?.observations || "",
      diagnosis: existingJobCard?.diagnosis || "", 
      rootCause: existingJobCard?.rootCause || "", 
      correctiveAction: existingJobCard?.actionTaken || "",
      filledBy: engineerName,
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // We send it to job-cards endpoint
      const payload = {
        serviceRequestId: requestId,
        observations: data.observations,
        diagnosis: data.diagnosis,
        rootCause: data.rootCause,
        actionTaken: data.correctiveAction,
      };
      
      const res = await apiRequest(
        existingJobCard ? "PATCH" : "POST",
        existingJobCard ? `/api/job-cards/${existingJobCard.id}` : "/api/job-cards",
        payload
      );
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests", requestId] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards", requestId] });
      // Update documents as well to show "Job Sheet" is filled
      if (!existingJobCard) {
          apiRequest("POST", "/api/documents", {
             serviceRequestId: requestId,
             type: 'job_sheet',
             fileUrl: 'filled',
             fileName: 'Digital Job Sheet'
          }).then(() => {
             queryClient.invalidateQueries({ queryKey: ["/api/service-requests", requestId] });
          });
      }
      toast({ title: "Job Sheet saved successfully" });
      setOpen(false);
    },
    onError: (error) => {
      toast({ title: "Failed to save job sheet", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start mt-2">
          <FileText className="h-4 w-4 mr-2" />
          {existingJobCard ? "Update Job Sheet" : "Fill Job Sheet"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Job Sheet (Digital)</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="observations"
              rules={{ required: "Required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>1. Observation during inspection of drone <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter observations..." className="h-20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="diagnosis"
              rules={{ required: "Required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>2. Actual diagnosis observation on flight dog <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter diagnosis..." className="h-20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="rootCause"
              rules={{ required: "Required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>3. Root cause <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter root cause..." className="h-20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="correctiveAction"
              rules={{ required: "Required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>4. Corrective action <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter corrective action..." className="h-20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="filledBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>5. Filled by</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="bg-muted" />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Job Sheet
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
