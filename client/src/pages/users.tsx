import { useState } from "react";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/use-users";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, UserPlus, Shield, Wrench, Receipt, Truck } from "lucide-react";

const roleIcons: Record<string, any> = {
  admin: Shield,
  engineer: Wrench,
  account: Receipt,
  logistics: Truck,
};

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  engineer: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  account: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  logistics: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit, and manage team members and their roles
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-9 shadow-lg shadow-primary/20" data-testid="button-create-user">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : (users as any[])?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              (users as any[])?.map((user: any) => {
                const RoleIcon = roleIcons[user.role] || Shield;
                return (
                  <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`${roleColors[user.role] || ""} gap-1 capitalize`}>
                        <RoleIcon className="h-3 w-3" />
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-primary"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DeleteUserButton id={user.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <EditUserDialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)} user={editingUser} />
    </div>
  );
}

function DeleteUserButton({ id }: { id: string }) {
  const { mutate, isPending } = useDeleteUser();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:text-destructive"
      disabled={isPending}
      onClick={() => {
        if (confirm("Are you sure you want to delete this user?")) {
          mutate(id);
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createMutation = useCreateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !role) return;
    
    createMutation.mutate(
      { name, email, password, role: role as any },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName("");
          setEmail("");
          setPassword("");
          setRole("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Full Name</Label>
            <Input id="create-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required data-testid="input-create-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-email">Email</Label>
            <Input id="create-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@dronefix.com" required data-testid="input-create-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">Password</Label>
            <Input id="create-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} data-testid="input-create-password" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger data-testid="select-create-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="engineer">Field Engineer</SelectItem>
                <SelectItem value="account">Accounts</SelectItem>
                <SelectItem value="logistics">Logistics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !name || !email || !password || !role} data-testid="button-submit-create-user">
              {createMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ open, onOpenChange, user }: { open: boolean; onOpenChange: (open: boolean) => void; user: any }) {
  const updateMutation = useUpdateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  // Sync state when user prop changes
  if (user && name === "" && email === "") {
    setName(user.name || "");
    setEmail(user.email || "");
    setRole(user.role || "");
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setName("");
      setEmail("");
      setRole("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    updateMutation.mutate(
      { id: user.id, name, email, role: role as any },
      { onSuccess: () => handleClose(false) }
    );
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="engineer">Field Engineer</SelectItem>
                <SelectItem value="account">Accounts</SelectItem>
                <SelectItem value="logistics">Logistics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
