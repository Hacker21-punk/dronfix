import { useUsers, useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { useCurrentUser } from "@/hooks/use-users";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Shield, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type UserData = { id: number; name: string; email: string; role: string };

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const { data: currentUser } = useCurrentUser();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  if (currentUser?.role !== 'admin') {
    return <div className="p-8 text-center text-destructive">Access Denied</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage team access and roles</p>
        </div>
        
        <Button onClick={() => setIsCreateOpen(true)} className="shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell></TableRow>
            ) : (
              users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{user.name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-primary" />
                      <span className="capitalize">{user.role}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`button-edit-user-${user.id}`}
                      onClick={() => setEditingUser({ id: user.id, name: user.name, email: user.email, role: user.role })}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <EditUserDialog user={editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }} />
    </div>
  );
}

function CreateUserDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const createUser = useCreateUser();
  const [formData, setFormData] = useState({ name: "", email: "", role: "engineer" as const });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(formData, {
      onSuccess: () => {
        setFormData({ name: "", email: "", role: "engineer" });
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} data-testid="input-create-name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} data-testid="input-create-email" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={formData.role} onValueChange={(val: any) => setFormData({...formData, role: val})}>
              <SelectTrigger data-testid="select-create-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="engineer">Field Engineer</SelectItem>
                <SelectItem value="account">Accounts</SelectItem>
                <SelectItem value="logistics">Logistics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={createUser.isPending} data-testid="button-create-submit">Create User</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, onOpenChange }: { user: UserData | null, onOpenChange: (o: boolean) => void }) {
  const updateUser = useUpdateUser();
  const [formData, setFormData] = useState({ name: "", email: "", role: "engineer" });

  const isOpen = user !== null;

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name, email: user.email, role: user.role });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    updateUser.mutate({ id: user.id, name: formData.name, email: formData.email, role: formData.role as any }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} data-testid="input-edit-name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} data-testid="input-edit-email" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
              <SelectTrigger data-testid="select-edit-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="engineer">Field Engineer</SelectItem>
                <SelectItem value="account">Accounts</SelectItem>
                <SelectItem value="logistics">Logistics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={updateUser.isPending} data-testid="button-edit-submit">Save Changes</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
