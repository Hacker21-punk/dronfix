import { useState, useRef } from "react";
import { useInventory, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem } from "@/hooks/use-inventory";
import { useCurrentUser } from "@/hooks/use-users";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2, Edit, AlertCircle, FileUp, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertInventorySchema, type Inventory } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function InventoryPage() {
  const { data: inventory, isLoading } = useInventory();
  const { data: profile } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/inventory/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        toast({ title: "Upload Failed", description: result.message, variant: "destructive" });
        return;
      }

      toast({
        title: "Import Complete",
        description: `${result.success} items added successfully.${result.failed > 0 ? ` ${result.failed} failed.` : ""}`,
        variant: result.failed > 0 ? "destructive" : "default",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
    } catch (err) {
      toast({ title: "Upload Failed", description: "Could not upload file.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredInventory = inventory?.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const role = profile?.role;
  const canEdit = role === 'admin' || role === 'engineer';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage spare parts and critical stock levels</p>
        </div>
        
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <a href="/api/inventory/template" download data-testid="link-download-template">
              <Button variant="outline" size="sm" className="h-9">
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </a>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={handleExcelUpload}
              data-testid="input-excel-upload"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()} 
              className="h-9"
              disabled={isUploading}
              data-testid="button-upload-excel"
            >
              <FileUp className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Excel"}
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-9 shadow-lg shadow-primary/20" data-testid="button-add-item">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Search by name or SKU..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 focus-visible:ring-0 bg-transparent px-0 text-base"
        />
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Status</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Loading inventory...
                </TableCell>
              </TableRow>
            ) : filteredInventory?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No items found
                </TableCell>
              </TableRow>
            ) : (
              filteredInventory?.map((item) => (
                <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.price))}</TableCell>
                  <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {item.quantity <= item.criticalLevel ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        In Stock
                      </span>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:text-primary"
                          onClick={() => setEditingItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DeleteInventoryButton id={item.id} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InventoryFormDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
        mode="create"
      />
      
      <InventoryFormDialog 
        open={!!editingItem} 
        onOpenChange={(open) => !open && setEditingItem(null)} 
        mode="edit"
        defaultValues={editingItem}
      />
    </div>
  );
}

function DeleteInventoryButton({ id }: { id: number }) {
  const { mutate, isPending } = useDeleteInventoryItem();
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-8 w-8 hover:text-destructive"
      disabled={isPending}
      onClick={() => {
        if (confirm("Are you sure you want to delete this item?")) {
          mutate(id);
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

const formSchema = insertInventorySchema.extend({
  price: z.coerce.number(), // Coerce string to number
  quantity: z.coerce.number(),
  criticalLevel: z.coerce.number(),
});

function InventoryFormDialog({ 
  open, 
  onOpenChange, 
  mode, 
  defaultValues 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues?: Inventory | null;
}) {
  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ? {
      ...defaultValues,
      price: Number(defaultValues.price), // Convert decimal string to number
    } : {
      name: "",
      sku: "",
      price: 0,
      quantity: 0,
      criticalLevel: 5,
      description: "",
    },
  });

  // Reset form when opening for create
  if (open && mode === 'create' && form.formState.isSubmitSuccessful) {
    form.reset();
  }
  
  // Update form when editing item changes
  if (open && mode === 'edit' && defaultValues && form.getValues().sku !== defaultValues.sku) {
    form.reset({
      ...defaultValues,
      price: Number(defaultValues.price),
    });
  }

  const onSubmit = (data: any) => {
    if (mode === "create") {
      createMutation.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    } else if (defaultValues) {
      updateMutation.mutate({ id: defaultValues.id, ...data }, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Item" : "Edit Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...form.register("sku")} />
              {form.formState.errors.sku && <p className="text-xs text-destructive">{form.formState.errors.sku.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="0.01" {...form.register("price")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" {...form.register("quantity")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="criticalLevel">Critical Level</Label>
              <Input id="criticalLevel" type="number" {...form.register("criticalLevel")} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...form.register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Add Item" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
