import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/utils/trpc';
import { Plus, Edit, Trash2, Building2, Search, Mail, Phone, MapPin, User } from 'lucide-react';
import type { Organization, CreateOrganizationInput, UpdateOrganizationInput } from '../../../server/src/schema';

interface OrganizationManagementProps {
  tenantId: string;
}

function OrganizationManagement({ tenantId }: OrganizationManagementProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateOrganizationInput>({
    tenantId,
    name: '',
    contactPerson: null,
    email: null,
    phone: null,
    address: null,
    type: 'Other',
    notes: null,
    customFields: null,
  });

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'Grant Maker', label: 'Grant Maker' },
    { value: 'Sponsor', label: 'Sponsor' },
    { value: 'Corporate Partner', label: 'Corporate Partner' },
    { value: 'Foundation', label: 'Foundation' },
    { value: 'Government', label: 'Government' },
    { value: 'Other', label: 'Other' },
  ];

  const loadOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await trpc.organizations.list.query({
        tenantId,
        search: searchTerm || undefined,
        page: 1,
        limit: 50,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      
      let filteredOrganizations = response.organizations;
      if (typeFilter !== 'all') {
        filteredOrganizations = response.organizations.filter((org: Organization) => org.type === typeFilter);
      }
      
      setOrganizations(filteredOrganizations);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, searchTerm, typeFilter]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const resetForm = () => {
    setFormData({
      tenantId,
      name: '',
      contactPerson: null,
      email: null,
      phone: null,
      address: null,
      type: 'Other',
      notes: null,
      customFields: null,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await trpc.organizations.create.mutate(formData);
      setOrganizations((prev: Organization[]) => [...prev, response].sort((a, b) => a.name.localeCompare(b.name)));
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create organization:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (organization: Organization) => {
    setEditingOrganization(organization);
    setFormData({
      tenantId,
      name: organization.name,
      contactPerson: organization.contactPerson,
      email: organization.email,
      phone: organization.phone,
      address: organization.address,
      type: organization.type,
      notes: organization.notes,
      customFields: organization.customFields,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrganization) return;
    
    setIsSubmitting(true);
    try {
      const updateData: UpdateOrganizationInput = {
        id: editingOrganization.id,
        name: formData.name,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        type: formData.type,
        notes: formData.notes,
        customFields: formData.customFields,
      };
      
      const response = await trpc.organizations.update.mutate({ ...updateData, tenantId });
      setOrganizations((prev: Organization[]) => prev.map((org: Organization) => org.id === editingOrganization.id ? response : org));
      setIsEditDialogOpen(false);
      resetForm();
      setEditingOrganization(null);
    } catch (error) {
      console.error('Failed to update organization:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.organizations.delete.mutate({ id, tenantId });
      setOrganizations((prev: Organization[]) => prev.filter((org: Organization) => org.id !== id));
    } catch (error) {
      console.error('Failed to delete organization:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Grant Maker': return 'bg-green-100 text-green-800';
      case 'Sponsor': return 'bg-blue-100 text-blue-800';
      case 'Corporate Partner': return 'bg-purple-100 text-purple-800';
      case 'Foundation': return 'bg-orange-100 text-orange-800';
      case 'Government': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const OrganizationForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => Promise<void>; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="name">Organization Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateOrganizationInput) => ({ ...prev, name: e.target.value }))
            }
            required
            placeholder="Enter organization name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateOrganizationInput) => ({ ...prev, contactPerson: e.target.value || null }))
              }
              placeholder="Enter contact person name"
            />
          </div>

          <div>
            <Label htmlFor="type">Organization Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev: CreateOrganizationInput) => ({ ...prev, type: value as any }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Grant Maker">Grant Maker</SelectItem>
                <SelectItem value="Sponsor">Sponsor</SelectItem>
                <SelectItem value="Corporate Partner">Corporate Partner</SelectItem>
                <SelectItem value="Foundation">Foundation</SelectItem>
                <SelectItem value="Government">Government</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateOrganizationInput) => ({ ...prev, email: e.target.value || null }))
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
                setFormData((prev: CreateOrganizationInput) => ({ ...prev, phone: e.target.value || null }))
              }
              placeholder="Enter phone number"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            value={formData.address || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateOrganizationInput) => ({ ...prev, address: e.target.value || null }))
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
              setFormData((prev: CreateOrganizationInput) => ({ ...prev, notes: e.target.value || null }))
            }
            placeholder="Enter notes"
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Organization' : 'Create Organization')}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Organization Management</h2>
            <p className="text-sm text-gray-500">Manage partner organizations and institutions</p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
            </DialogHeader>
            <OrganizationForm onSubmit={handleCreate} />
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
                placeholder="Search organizations by name, contact person, or type..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">
              {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
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
          ) : organizations.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first organization.</p>
              <div className="mt-6">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Organization
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Organization</DialogTitle>
                    </DialogHeader>
                    <OrganizationForm onSubmit={handleCreate} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((organization: Organization) => (
                  <TableRow key={organization.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{organization.name}</div>
                        {organization.notes && (
                          <div className="text-sm text-gray-500 mt-1 truncate max-w-[200px]">
                            {organization.notes}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {organization.contactPerson ? (
                        <div className="flex items-center text-sm">
                          <User className="w-3 h-3 mr-1" />
                          {organization.contactPerson}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not specified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {organization.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-[150px]">{organization.email}</span>
                          </div>
                        )}
                        {organization.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-3 h-3 mr-1" />
                            {organization.phone}
                          </div>
                        )}
                        {organization.address && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-[120px]">{organization.address}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(organization.type)}>
                        {organization.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {organization.createdAt.toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(organization)}
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
                                This will permanently delete the organization "{organization.name}" and all associated data.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(organization.id)}
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
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          <OrganizationForm onSubmit={handleUpdate} isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OrganizationManagement;