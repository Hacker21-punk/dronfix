import { useState, useMemo, useRef } from "react";
import {
  useMaterials,
  useMaterialDescriptions,
  useMaterialsByDescription,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useBulkUploadMaterials,
} from "@/hooks/use-materials";

import {
  useInventory,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
} from "@/hooks/use-inventory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Search,
  DatabaseZap,
  AlertTriangle,
  Check,
  ChevronsUpDown,
  X,
  FileSpreadsheet,
} from "lucide-react";

// ─── Inventory Stock Tab ─────────────────────────────────────────────────────
function InventoryStockTab() {
  const { data: items = [], isLoading } = useInventory();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const { data: descriptions = [] } = useMaterialDescriptions();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // Add Item Form State
  const [selectedDescription, setSelectedDescription] = useState<string | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const [descSearch, setDescSearch] = useState("");
  const { data: matchingMaterials = [] } = useMaterialsByDescription(selectedDescription);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [quantity, setQuantity] = useState("0");
  const [criticalLevel, setCriticalLevel] = useState("5");
  const [priceOverride, setPriceOverride] = useState("");

  const filteredDescriptions = useMemo(() => {
    if (!descSearch) return descriptions;
    return descriptions.filter((d: string) =>
      d.toLowerCase().includes(descSearch.toLowerCase())
    );
  }, [descriptions, descSearch]);

  function resetAddForm() {
    setSelectedDescription(null);
    setSelectedMaterial(null);
    setQuantity("0");
    setCriticalLevel("5");
    setPriceOverride("");
    setDescSearch("");
  }

  // When description changes, auto-select if only one material
  function handleDescriptionSelect(desc: string) {
    setSelectedDescription(desc);
    setSelectedMaterial(null);
    setPriceOverride("");
    setDescOpen(false);
  }

  // Auto-select single material
  const autoMaterial = matchingMaterials.length === 1 ? matchingMaterials[0] : null;
  const activeMaterial = selectedMaterial || autoMaterial;

  function handleAddSubmit() {
    if (!activeMaterial) return;
    const price = priceOverride || activeMaterial.customerSalePrice;
    createItem.mutate(
      {
        itemName: activeMaterial.materialDescription,
        sku: activeMaterial.materialCode,
        quantity: parseInt(quantity) || 0,
        unitPrice: price,
        criticalLevel: parseInt(criticalLevel) || 5,
      },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          resetAddForm();
        },
      }
    );
  }

  function handleEditSubmit() {
    if (!editItem) return;
    updateItem.mutate(editItem, {
      onSuccess: () => setEditItem(null),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Current Stock</h3>
          <p className="text-sm text-muted-foreground">
            {items.length} items · {items.filter((i: any) => i.quantity <= i.criticalLevel).length} low stock
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) resetAddForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DatabaseZap className="h-5 w-5 text-primary" />
                Add Inventory Item
              </DialogTitle>
              <DialogDescription>
                Select from Materials Master. SKU, price auto-mapped.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* 1. Material Description Dropdown (searchable) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Material Description</Label>
                <Popover open={descOpen} onOpenChange={setDescOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={descOpen}
                      className="w-full justify-between text-left font-normal"
                    >
                      {selectedDescription || "Search & select material..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Type to search materials..."
                        value={descSearch}
                        onValueChange={setDescSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No materials found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {filteredDescriptions.map((desc: string) => (
                            <CommandItem
                              key={desc}
                              value={desc}
                              onSelect={() => handleDescriptionSelect(desc)}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedDescription === desc ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {desc}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 2. SKU Selector (auto or dropdown) */}
              {selectedDescription && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Part Number (SKU)</Label>
                  {matchingMaterials.length === 1 ? (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <Badge variant="secondary">{matchingMaterials[0].materialCode}</Badge>
                      <span className="text-sm text-muted-foreground">Auto-mapped</span>
                    </div>
                  ) : matchingMaterials.length > 1 ? (
                    <Select
                      onValueChange={(val) => {
                        const m = matchingMaterials.find((m: any) => String(m.id) === val);
                        setSelectedMaterial(m);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select SKU..." />
                      </SelectTrigger>
                      <SelectContent>
                        {matchingMaterials.map((m: any) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.materialCode} — ₹{m.customerSalePrice}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  )}
                </div>
              )}

              {/* 3. Price (auto-fetched with override) */}
              {activeMaterial && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Sale Price (inc. GST)
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-green-600">
                        ₹{activeMaterial.customerSalePrice}
                      </span>
                      <Badge variant="outline" className="text-xs">Auto</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Override Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Leave blank to use auto"
                      value={priceOverride}
                      onChange={(e) => setPriceOverride(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* 4. Quantity & Critical Level */}
              {activeMaterial && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Initial Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Critical Level</Label>
                    <Input
                      type="number"
                      min="0"
                      value={criticalLevel}
                      onChange={(e) => setCriticalLevel(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddOpen(false); resetAddForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleAddSubmit}
                disabled={!activeMaterial || createItem.isPending}
              >
                {createItem.isPending ? "Adding..." : "Add to Inventory"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Stock Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No items in inventory. Click "Add Item" to get started.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[200px] truncate" title={item.itemName}>
                    {item.itemName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">{item.sku}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{Number(item.unitPrice).toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    ₹{(item.quantity * Number(item.unitPrice)).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {item.quantity <= item.criticalLevel ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> Low
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        In Stock
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditItem({ ...item })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{item.itemName}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this item from inventory.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteItem.mutate(item.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={editItem.quantity}
                  onChange={(e) => setEditItem({ ...editItem, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editItem.unitPrice}
                  onChange={(e) => setEditItem({ ...editItem, unitPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Critical Level</Label>
                <Input
                  type="number"
                  value={editItem.criticalLevel}
                  onChange={(e) => setEditItem({ ...editItem, criticalLevel: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={updateItem.isPending}>
              {updateItem.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Materials Master Tab ────────────────────────────────────────────────────
function MaterialsMasterTab() {
  const { data: materials = [], isLoading } = useMaterials();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const bulkUpload = useBulkUploadMaterials();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editMaterial, setEditMaterial] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    materialCode: "",
    hsnCode: "",
    materialDescription: "",
    gstRate: "18",
    customerBasicPrice: "",
    gstAmount: "",
    customerSalePrice: "",
  });

  const filtered = useMemo(() => {
    if (!search) return materials;
    const s = search.toLowerCase();
    return materials.filter(
      (m: any) =>
        m.materialDescription.toLowerCase().includes(s) ||
        m.materialCode.toLowerCase().includes(s) ||
        (m.hsnCode && m.hsnCode.toLowerCase().includes(s))
    );
  }, [materials, search]);

  function resetForm() {
    setForm({
      materialCode: "",
      hsnCode: "",
      materialDescription: "",
      gstRate: "18",
      customerBasicPrice: "",
      gstAmount: "",
      customerSalePrice: "",
    });
  }

  // Auto-calculate GST and sale price
  function handleBasicPriceChange(val: string) {
    const bp = parseFloat(val) || 0;
    const rate = parseFloat(form.gstRate) || 18;
    const gst = parseFloat((bp * rate / 100).toFixed(2));
    const sale = parseFloat((bp + gst).toFixed(2));
    setForm({ ...form, customerBasicPrice: val, gstAmount: String(gst), customerSalePrice: String(sale) });
  }

  function handleAddSubmit() {
    createMaterial.mutate(form, {
      onSuccess: () => {
        setIsAddOpen(false);
        resetForm();
      },
    });
  }

  function handleEditSubmit() {
    if (!editMaterial) return;
    updateMaterial.mutate(editMaterial, {
      onSuccess: () => setEditMaterial(null),
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      bulkUpload.mutate(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={bulkUpload.isPending}
          >
            <Upload className="h-4 w-4" />
            {bulkUpload.isPending ? "Uploading..." : "Bulk Upload"}
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(o) => { setIsAddOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Material
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Material to Master</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Material Code</Label>
                    <Input value={form.materialCode} onChange={(e) => setForm({ ...form, materialCode: e.target.value })} placeholder="17501" />
                  </div>
                  <div className="space-y-1">
                    <Label>HSN Code</Label>
                    <Input value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} placeholder="39174000" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Material Description</Label>
                  <Input value={form.materialDescription} onChange={(e) => setForm({ ...form, materialDescription: e.target.value })} placeholder="Tank - L Connector (10Ltr)" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Basic Price (₹)</Label>
                    <Input type="number" step="0.01" value={form.customerBasicPrice} onChange={(e) => handleBasicPriceChange(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>GST ({form.gstRate}%)</Label>
                    <Input type="number" step="0.01" value={form.gstAmount} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-1">
                    <Label>Sale Price</Label>
                    <Input type="number" step="0.01" value={form.customerSalePrice} readOnly className="bg-muted" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Cancel</Button>
                <Button onClick={handleAddSubmit} disabled={createMaterial.isPending}>
                  {createMaterial.isPending ? "Adding..." : "Add Material"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{materials.length} total materials</span>
        <span>·</span>
        <span>{filtered.length} shown</span>
      </div>

      <Card>
        <div className="overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background z-10">Code</TableHead>
                <TableHead className="sticky top-0 bg-background z-10">HSN</TableHead>
                <TableHead className="sticky top-0 bg-background z-10">Description</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-right">Basic ₹</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-right">GST ₹</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-right">Sale ₹</TableHead>
                <TableHead className="sticky top-0 bg-background z-10 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">{m.materialCode}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{m.hsnCode || "—"}</TableCell>
                  <TableCell className="max-w-[250px] truncate" title={m.materialDescription}>
                    {m.materialDescription}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">₹{Number(m.customerBasicPrice).toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{Number(m.gstAmount).toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">₹{Number(m.customerSalePrice).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditMaterial({ ...m })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete material "{m.materialCode}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes {m.materialDescription} from the master list.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMaterial.mutate(m.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {search ? "No materials match your search." : "No materials in master. Upload a price list."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editMaterial} onOpenChange={(o) => { if (!o) setEditMaterial(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
          </DialogHeader>
          {editMaterial && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Material Code</Label>
                  <Input value={editMaterial.materialCode} onChange={(e) => setEditMaterial({ ...editMaterial, materialCode: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>HSN Code</Label>
                  <Input value={editMaterial.hsnCode || ""} onChange={(e) => setEditMaterial({ ...editMaterial, hsnCode: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Material Description</Label>
                <Input value={editMaterial.materialDescription} onChange={(e) => setEditMaterial({ ...editMaterial, materialDescription: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Basic Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editMaterial.customerBasicPrice}
                    onChange={(e) => {
                      const bp = parseFloat(e.target.value) || 0;
                      const rate = parseFloat(editMaterial.gstRate) || 18;
                      const gst = parseFloat((bp * rate / 100).toFixed(2));
                      setEditMaterial({
                        ...editMaterial,
                        customerBasicPrice: e.target.value,
                        gstAmount: String(gst),
                        customerSalePrice: String(parseFloat((bp + gst).toFixed(2))),
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>GST ₹</Label>
                  <Input value={editMaterial.gstAmount} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Sale ₹</Label>
                  <Input value={editMaterial.customerSalePrice} readOnly className="bg-muted" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMaterial(null)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={updateMaterial.isPending}>
              {updateMaterial.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Inventory Page ─────────────────────────────────────────────────────
export default function InventoryPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Package className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage stock and materials master
          </p>
        </div>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="stock" className="gap-2">
            <Package className="h-4 w-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Materials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <InventoryStockTab />
        </TabsContent>
        <TabsContent value="materials">
          <MaterialsMasterTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
