import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/utils/trpc';
import { Plus, Edit, Trash2, Users, Search, Mail, Phone, MapPin } from 'lucide-react';
import type { Donor, CreateDonorInput, UpdateDonorInput } from '../../../server/src/schema';

interface DonorManagementProps {
  tenantId: string;
}

function DonorManagement({ tenantId }: DonorManagementProps) {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateDonorInput>({
    tenantId,
    name: '',
    email: null,
    phone: null,
    address: null,
    notes: null,
    customFields: null,
  });

  const loadDonors = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await trpc.donors.list.query({
        tenantId,
        search: searchTerm || undefined,
        page: 1,
        limit: 50,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      setDonors(response.donors);
    } catch (error) {
      console.error('Failed to load donors:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, searchTerm]);

  useEffect(() => {
    loadDonors();
  }, [loadDonors]);

  const resetForm = () => {
    setFormData({
      tenantId,
      name: '',
      email: null,
      phone: null,
      address: null,
      notes: null,
      customFields: null,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await trpc.donors.create.mutate(formData);
      setDonors((prev: Donor[]) => [...prev, response]);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create donor:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (donor: Donor) => {
    setEditingDonor(donor);
    setFormData({
      tenantId,
      name: donor.name,
      email: donor.email,
      phone: donor.phone,
      address: donor.address,
      notes: donor.notes,
      customFields: donor.customFields,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDonor) return;
    
    setIsSubmitting(true);
    try {
      const updateData: UpdateDonorInput = {
        id: editingDonor.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        notes: formData.notes,
        customFields: formData.customFields,
      };
      
      const response = await trpc.donors.update.mutate({ ...updateData, tenantId });
      setDonors((prev: Donor[]) => prev.map((d: Donor) => d.id === editingDonor.id ? response : d));
      setIsEditDialogOpen(false);
      resetForm();
      setEditingDonor(null);
    } catch (error) {
      console.error('Failed to update donor:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.donors.delete.mutate({ id, tenantId });
      setDonors((prev: Donor[]) => prev.filter((d: Donor) => d.id !== id));
    } catch (error) {
      console.error('Failed to delete donor:', error);
    }
  };

  const DonorForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => Promise<void>; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateDonorInput) => ({ ...prev, name: e.target.value }))
            }
            required
            placeholder="Enter donor name"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateDonorInput) => ({ ...prev, email: e.target.value || null }))
            }
            placeholder="Enter email address"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateDonorInput) => ({ ...prev, phone: e.target.value || null }))
            }
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={formData.address || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateDonorInput) => ({ ...prev, address: e.target.value || null }))
            }
            placeholder="Enter address"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateDonorInput) => ({ ...prev, notes: e.target.value || null }))
            }
            placeholder="Enter notes"
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Donor' : 'Create Donor')}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Donor Management</h2>
            <p className="text-sm text-gray-500">Manage your donor relationships</p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Donor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Donor</DialogTitle>
            </DialogHeader>
            <DonorForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search donors by name, email, or phone..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">
              {donors.length} donor{donors.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Donors Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ))}
            </div>
          ) : donors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No donors</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first donor.</p>
              <div className="mt-6">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Donor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Donor</DialogTitle>
                    </DialogHeader>
                    <DonorForm onSubmit={handleCreate} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donors.map((donor: Donor) => (
                  <TableRow key={donor.id}>
                    <TableCell>
                      <div className="font-medium">{donor.name}</div>
                      {donor.notes && (
                        <div className="text-sm text-gray-500 mt-1 truncate max-w-[200px]">
                          {donor.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {donor.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-3 h-3 mr-1" />
                            {donor.email}
                          </div>
                        )}
                        {donor.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-3 h-3 mr-1" />
                            {donor.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {donor.address && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span className="truncate max-w-[150px]">{donor.address}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {donor.createdAt.toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(donor)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the donor "{donor.name}" and all associated data.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(donor.id)}
                                className="bg-red-600 hover:bg-red-700"
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
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Donor</DialogTitle>
          </DialogHeader>
          <DonorForm onSubmit={handleUpdate} isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DonorManagement;