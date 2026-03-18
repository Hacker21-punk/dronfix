import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { FileText, Search, IndianRupee, Filter, Download, ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import type { ServiceRequest } from "@shared/schema";

type BilledRequest = ServiceRequest & { assignedTo?: { name: string }; invoice?: any };

function getFinancialYear(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(2)}`;
  }
  return `${year - 1}-${year.toString().slice(2)}`;
}

function getFinancialYearRange(fy: string): { start: Date; end: Date } {
  const startYear = parseInt(fy.split("-")[0]);
  return {
    start: new Date(startYear, 3, 1),
    end: new Date(startYear + 1, 2, 31, 23, 59, 59),
  };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function BillingPage() {
  const { data: billedRequests, isLoading } = useQuery<BilledRequest[]>({
    queryKey: ["/api/billed-requests"],
    queryFn: async () => {
      const res = await fetch("/api/billed-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch billed data");
      return res.json();
    },
  });

  const [selectedFY, setSelectedFY] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedInvoiceType, setSelectedInvoiceType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("invoiceDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const availableFYs = useMemo(() => {
    if (!billedRequests) return [];
    const fys = new Set<string>();
    billedRequests.forEach((r) => {
      const date = r.invoice?.invoiceDate ? new Date(r.invoice?.invoiceDate) : r.createdAt ? new Date(r.createdAt) : null;
      if (date) fys.add(getFinancialYear(date));
    });
    return Array.from(fys).sort().reverse();
  }, [billedRequests]);

  const filteredRequests = useMemo(() => {
    if (!billedRequests) return [];

    let filtered = [...billedRequests];

    if (selectedFY !== "all") {
      const { start, end } = getFinancialYearRange(selectedFY);
      filtered = filtered.filter((r) => {
        const date = r.invoice?.invoiceDate ? new Date(r.invoice?.invoiceDate) : null;
        return date && date >= start && date <= end;
      });
    }

    if (selectedMonth !== "all") {
      const monthIndex = parseInt(selectedMonth);
      filtered = filtered.filter((r) => {
        const date = r.invoice?.invoiceDate ? new Date(r.invoice?.invoiceDate) : null;
        return date && date.getMonth() === monthIndex;
      });
    }

    if (selectedInvoiceType !== "all") {
      filtered = filtered.filter((r) => r.invoice?.invoiceType === selectedInvoiceType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        r.invoice?.invoiceNumber?.toLowerCase().includes(q) ||
        r.pilotName?.toLowerCase().includes(q) ||
        r.droneNumber?.toLowerCase().includes(q) ||
        r.invoice?.challanNumber?.toLowerCase().includes(q) ||
        r.id.toString().includes(q)
      );
    }

    filtered.sort((a, b) => {
      let valA: any, valB: any;
      if (sortField === "invoiceDate") {
        valA = a.invoice?.invoiceDate ? new Date(a.invoice?.invoiceDate).getTime() : 0;
        valB = b.invoice?.invoiceDate ? new Date(b.invoice?.invoiceDate).getTime() : 0;
      } else if (sortField === "invoiceValue") {
        valA = parseFloat(a.invoice?.invoiceValue || "0");
        valB = parseFloat(b.invoice?.invoiceValue || "0");
      } else if (sortField === "id") {
        valA = a.id;
        valB = b.id;
      } else {
        valA = (a as any)[sortField] || "";
        valB = (b as any)[sortField] || "";
      }
      if (sortDir === "asc") return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return filtered;
  }, [billedRequests, selectedFY, selectedMonth, selectedInvoiceType, searchQuery, sortField, sortDir]);

  const summary = useMemo(() => {
    const totalValue = filteredRequests.reduce((sum, r) => sum + parseFloat(r.invoice?.invoiceValue || "0"), 0);
    const totalReimbursement = filteredRequests.reduce((sum, r) => sum + parseFloat(r.invoice?.reimbursementAmount || "0"), 0);
    const countL1 = filteredRequests.filter(r => r.invoice?.invoiceType === "L1").length;
    const countL2 = filteredRequests.filter(r => r.invoice?.invoiceType === "L2").length;
    const countL3 = filteredRequests.filter(r => r.invoice?.invoiceType === "L3").length;
    return { totalValue, totalReimbursement, countL1, countL2, countL3, total: filteredRequests.length };
  }, [filteredRequests]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const exportCSV = () => {
    const headers = ["SR#", "Invoice No", "Challan No", "Pilot Name", "Drone No", "Invoice Type", "Invoice Value", "Reimbursement", "Invoice Date"];
    const rows = filteredRequests.map(r => [
      r.id,
      r.invoice?.invoiceNumber || "",
      r.invoice?.challanNumber || "",
      r.pilotName,
      r.droneNumber,
      r.invoice?.invoiceType || "",
      r.invoice?.invoiceValue || "0",
      r.invoice?.reimbursementAmount || "0",
      r.invoice?.invoiceDate ? new Date(r.invoice?.invoiceDate).toLocaleDateString("en-IN") : "",
    ]);
    const csv = [headers.join(","), ...rows.map(row => row.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billed_data_${selectedFY !== "all" ? selectedFY : "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground" data-testid="text-billing-title">Billing Data</h2>
          <p className="text-muted-foreground mt-1">All billed service requests with financial summaries</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filteredRequests.length === 0} data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-billed">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Invoice Value</p>
                <p className="text-xl font-bold" data-testid="text-total-invoice-value">{formatCurrency(summary.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-total-reimbursement">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Reimbursement</p>
                <p className="text-xl font-bold" data-testid="text-total-reimbursement">{formatCurrency(summary.totalReimbursement)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-total-count">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Invoices</p>
                <p className="text-xl font-bold" data-testid="text-total-invoices">{summary.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-type-breakdown">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">By Type</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" data-testid="badge-l1-count">L1: {summary.countL1}</Badge>
              <Badge variant="secondary" data-testid="badge-l2-count">L2: {summary.countL2}</Badge>
              <Badge variant="secondary" data-testid="badge-l3-count">L3: {summary.countL3}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Financial Year</label>
              <Select value={selectedFY} onValueChange={setSelectedFY}>
                <SelectTrigger data-testid="select-fy">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableFYs.map((fy) => (
                    <SelectItem key={fy} value={fy}>FY {fy}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger data-testid="select-month">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Invoice Type</label>
              <Select value={selectedInvoiceType} onValueChange={setSelectedInvoiceType}>
                <SelectTrigger data-testid="select-invoice-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="L1">L1</SelectItem>
                  <SelectItem value="L2">L2</SelectItem>
                  <SelectItem value="L3">L3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Invoice no, pilot, drone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-billing"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("id")} data-testid="sort-sr">
                      SR# <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Invoice No</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Challan No</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Pilot Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Drone No</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("invoiceValue")} data-testid="sort-value">
                      Invoice Value <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Reimbursement</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("invoiceDate")} data-testid="sort-date">
                      Invoice Date <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No billed requests found</p>
                      <p className="text-xs mt-1">Adjust filters or generate invoices from service requests</p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover-elevate" data-testid={`row-billed-${r.id}`}>
                      <td className="p-3 font-medium">#{r.id}</td>
                      <td className="p-3" data-testid={`text-invoice-no-${r.id}`}>{r.invoice?.invoiceNumber || "-"}</td>
                      <td className="p-3">{r.invoice?.challanNumber || "-"}</td>
                      <td className="p-3">{r.pilotName}</td>
                      <td className="p-3">{r.droneNumber}</td>
                      <td className="p-3">
                        <Badge variant="outline" data-testid={`badge-type-${r.id}`}>{r.invoice?.invoiceType || "-"}</Badge>
                      </td>
                      <td className="p-3 font-medium" data-testid={`text-value-${r.id}`}>
                        {r.invoice?.invoiceValue ? formatCurrency(parseFloat(r.invoice?.invoiceValue)) : "-"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {r.invoice?.reimbursementAmount ? formatCurrency(parseFloat(r.invoice?.reimbursementAmount)) : "-"}
                      </td>
                      <td className="p-3 text-muted-foreground" data-testid={`text-date-${r.id}`}>
                        {r.invoice?.invoiceDate ? new Date(r.invoice?.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                      </td>
                      <td className="p-3">
                        <Link href={`/requests/${r.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-${r.id}`}>View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
