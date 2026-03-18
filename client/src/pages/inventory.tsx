import { useState } from "react";
import { useLocation } from "wouter";
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
import { Search, Plus, Trash2, Edit, AlertCircle, PackageOpen } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertInventorySchema, type Inventory } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function InventoryPage() {
  const { data: inventory, isLoading } = useInventory();
  const { data: profile } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [, navigate] = useLocation();

  const role = profile?.role;
  const isAdmin = role === 'admin';

  if (profile && !isAdmin) {
    navigate("/");
    return null;
  }

  const filteredInventory = inventory?.filter((item: any) => 
    item.itemName.toLowerCase().includes(search.toLowerCase()) || 
    item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const canManage = isAdmin;
  const canUpdateStock = isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "Manage spare parts and critical stock levels" : "View spare parts and update stock levels"}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {canUpdateStock && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsBulkEditOpen(true)} 
              className="h-9"
              data-testid="button-bulk-edit-stock"
            >
              <PackageOpen className="h-4 w-4 mr-2" />
              Bulk Edit Stock
            </Button>
          )}
          {canManage && (
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-9 shadow-lg shadow-primary/20" data-testid="button-add-item">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
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
              {canManage && <TableHead className="text-right">Actions</TableHead>}
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
              filteredInventory?.map((item: any) => (
                <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.unitPrice))}</TableCell>
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
                  {canManage && (
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

      {inventory && (
        <BulkEditStockDialog
          open={isBulkEditOpen}
          onOpenChange={setIsBulkEditOpen}
          items={inventory}
        />
      )}
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
      unitPrice: Number(defaultValues.unitPrice),
    } : {
      itemName: "",
      sku: "",
      unitPrice: 0,
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
      unitPrice: Number(defaultValues.unitPrice),
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
              <Label htmlFor="itemName">Item Name</Label>
              <Input id="itemName" {...form.register("itemName")} />
              {(form.formState.errors as any).itemName && <p className="text-xs text-destructive">{(form.formState.errors as any).itemName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...form.register("sku")} />
              {form.formState.errors.sku && <p className="text-xs text-destructive">{form.formState.errors.sku.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Price</Label>
              <Input id="unitPrice" type="number" step="0.01" {...form.register("unitPrice")} />
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

function BulkEditStockDialog({ 
  open, 
  onOpenChange, 
  items 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  items: Inventory[];
}) {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [bulkSearch, setBulkSearch] = useState("");
  const { toast } = useToast();

  const initQuantities = () => {
    const q: Record<number, number> = {};
    items.forEach(item => { q[item.id] = item.quantity; });
    setQuantities(q);
    setBulkSearch("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) initQuantities();
    onOpenChange(isOpen);
  };

  const changedItems = items.filter(item => quantities[item.id] !== undefined && quantities[item.id] !== item.quantity);

  const handleSave = async () => {
    if (changedItems.length === 0) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      const updates = changedItems.map(item => ({
        id: item.id,
        quantity: quantities[item.id],
      }));

      await apiRequest("PATCH", "/api/inventory/bulk-update", { updates });

      toast({
        title: "Stock Updated",
        description: `${updates.length} item${updates.length > 1 ? "s" : ""} updated successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Update Failed", description: "Could not save stock changes.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.itemName.toLowerCase().includes(bulkSearch.toLowerCase()) ||
    item.sku.toLowerCase().includes(bulkSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Edit Stock Quantities</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Update stock quantities for multiple items at once. Changed items are highlighted.
          </p>
        </DialogHeader>
        
        <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter items..."
            value={bulkSearch}
            onChange={(e) => setBulkSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 bg-transparent px-0"
            data-testid="input-bulk-search"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[100px]">SKU</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right w-[100px]">Current</TableHead>
                <TableHead className="text-right w-[130px]">New Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const isChanged = quantities[item.id] !== undefined && quantities[item.id] !== item.quantity;
                const isLow = (quantities[item.id] ?? item.quantity) <= item.criticalLevel;
                return (
                  <TableRow 
                    key={item.id} 
                    className={isChanged ? "bg-primary/5" : ""}
                    data-testid={`row-bulk-item-${item.id}`}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.itemName}
                        {isLow && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        value={quantities[item.id] ?? item.quantity}
                        onChange={(e) => setQuantities(prev => ({
                          ...prev,
                          [item.id]: parseInt(e.target.value) || 0,
                        }))}
                        className={`w-24 ml-auto text-right ${isChanged ? "border-primary" : ""}`}
                        data-testid={`input-bulk-qty-${item.id}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    No items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {changedItems.length > 0
              ? `${changedItems.length} item${changedItems.length > 1 ? "s" : ""} changed`
              : "No changes"}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-bulk-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || changedItems.length === 0}
              data-testid="button-bulk-save"
            >
              {isSaving ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
