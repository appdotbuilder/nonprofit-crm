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
import { Plus, Edit, Trash2, Award, Search, Calendar, DollarSign, FileText, Building2 } from 'lucide-react';
import type { Grant, CreateGrantInput, UpdateGrantInput, Organization } from '../../../server/src/schema';

interface GrantManagementProps {
  tenantId: string;
}

function GrantManagement({ tenantId }: GrantManagementProps) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateGrantInput>({
    tenantId,
    organizationId: 0,
    grantName: '',
    applicationDate: null,
    awardDate: null,
    amount: 0,
    status: 'Applied',
    reportingRequirements: null,
    customFields: null,
  });

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Applied', label: 'Applied' },
    { value: 'Under Review', label: 'Under Review' },
    { value: 'Awarded', label: 'Awarded' },
    { value: 'Declined', label: 'Declined' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [grantsResponse, organizationsResponse] = await Promise.all([
        trpc.grants.list.query({
          tenantId,
          search: searchTerm || undefined,
          page: 1,
          limit: 50,
          sortBy: 'applicationDate',
          sortOrder: 'desc',
        }),
        trpc.organizations.list.query({
          tenantId,
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc',
        }),
      ]);

      let filteredGrants = grantsResponse.grants;
      if (statusFilter !== 'all') {
        filteredGrants = grantsResponse.grants.filter((g: Grant) => g.status === statusFilter);
      }

      setGrants(filteredGrants);
      setOrganizations(organizationsResponse.organizations);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, searchTerm, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({
      tenantId,
      organizationId: 0,
      grantName: '',
      applicationDate: null,
      awardDate: null,
      amount: 0,
      status: 'Applied',
      reportingRequirements: null,
      customFields: null,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.organizationId === 0) return;
    
    setIsSubmitting(true);
    try {
      const response = await trpc.grants.create.mutate(formData);
      setGrants((prev: Grant[]) => [response, ...prev]);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create grant:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (grant: Grant) => {
    setEditingGrant(grant);
    setFormData({
      tenantId,
      organizationId: grant.organizationId,
      grantName: grant.grantName,
      applicationDate: grant.applicationDate,
      awardDate: grant.awardDate,
      amount: grant.amount,
      status: grant.status,
      reportingRequirements: grant.reportingRequirements,
      customFields: grant.customFields,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrant) return;
    
    setIsSubmitting(true);
    try {
      const updateData: UpdateGrantInput = {
        id: editingGrant.id,
        organizationId: formData.organizationId,
        grantName: formData.grantName,
        applicationDate: formData.applicationDate,
        awardDate: formData.awardDate,
        amount: formData.amount,
        status: formData.status,
        reportingRequirements: formData.reportingRequirements,
        customFields: formData.customFields,
      };
      
      const response = await trpc.grants.update.mutate({ ...updateData, tenantId });
      setGrants((prev: Grant[]) => prev.map((g: Grant) => g.id === editingGrant.id ? response : g));
      setIsEditDialogOpen(false);
      resetForm();
      setEditingGrant(null);
    } catch (error) {
      console.error('Failed to update grant:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.grants.delete.mutate({ id, tenantId });
      setGrants((prev: Grant[]) => prev.filter((g: Grant) => g.id !== id));
    } catch (error) {
      console.error('Failed to delete grant:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Applied': return 'bg-blue-100 text-blue-800';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800';
      case 'Awarded': return 'bg-green-100 text-green-800';
      case 'Declined': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-purple-100 text-purple-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrganizationName = (organizationId: number) => {
    const org = organizations.find((o: Organization) => o.id === organizationId);
    return org ? org.name : `Organization #${organizationId}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString();
  };

  const GrantForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => Promise<void>; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="organizationId">Organization *</Label>
          <Select
            value={formData.organizationId.toString()}
            onValueChange={(value) =>
              setFormData((prev: CreateGrantInput) => ({ ...prev, organizationId: parseInt(value) }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org: Organization) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.name} ({org.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="grantName">Grant Name *</Label>
          <Input
            id="grantName"
            value={formData.grantName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateGrantInput) => ({ ...prev, grantName: e.target.value }))
            }
            required
            placeholder="Enter grant name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Grant Amount *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateGrantInput) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
              }
              required
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev: CreateGrantInput) => ({ ...prev, status: value as any }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Applied">Applied</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Awarded">Awarded</SelectItem>
                <SelectItem value="Declined">Declined</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="applicationDate">Application Date</Label>
            <Input
              id="applicationDate"
              type="date"
              value={formData.applicationDate ? new Date(formData.applicationDate).toISOString().split('T')[0] : ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateGrantInput) => ({
                  ...prev,
                  applicationDate: e.target.value ? new Date(e.target.value) : null
                }))
              }
            />
          </div>

          <div>
            <Label htmlFor="awardDate">Award Date</Label>
            <Input
              id="awardDate"
              type="date"
              value={formData.awardDate ? new Date(formData.awardDate).toISOString().split('T')[0] : ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateGrantInput) => ({
                  ...prev,
                  awardDate: e.target.value ? new Date(e.target.value) : null
                }))
              }
            />
          </div>
        </div>

        <div>
          <Label htmlFor="reportingRequirements">Reporting Requirements</Label>
          <Textarea
            id="reportingRequirements"
            value={formData.reportingRequirements || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateGrantInput) => ({ ...prev, reportingRequirements: e.target.value || null }))
            }
            placeholder="Enter reporting requirements"
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || formData.organizationId === 0}>
          {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Grant' : 'Create Grant')}
        </Button>
      </DialogFooter>
    </form>
  );

  const totalAmount = grants.reduce((sum: number, grant: Grant) => sum + grant.amount, 0);
  const awardedAmount = grants
    .filter((g: Grant) => g.status === 'Awarded' || g.status === 'Completed')
    .reduce((sum: number, grant: Grant) => sum + grant.amount, 0);
  const pendingAmount = grants
    .filter((g: Grant) => g.status === 'Applied' || g.status === 'Under Review')
    .reduce((sum: number, grant: Grant) => sum + grant.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Grant Management</h2>
            <p className="text-sm text-gray-500">Manage grant applications and awards</p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Grant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Grant</DialogTitle>
            </DialogHeader>
            <GrantForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applied</p>
                <p className="text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</p>
              </div>
              <Award className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Awarded</p>
                <p className="text-2xl font-bold text-green-600">${awardedAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">${pendingAmount.toLocaleString()}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search grants by name or organization..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">
              {grants.length} grant{grants.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Grants Table */}
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
          ) : grants.length === 0 ? (
            <div className="text-center py-12">
              <Award className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No grants</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first grant application.</p>
              <div className="mt-6">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Grant
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Grant</DialogTitle>
                    </DialogHeader>
                    <GrantForm onSubmit={handleCreate} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grant</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.map((grant: Grant) => (
                  <TableRow key={grant.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{grant.grantName}</div>
                        {grant.reportingRequirements && (
                          <div className="text-sm text-gray-500 mt-1 flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-[200px]">
                              {grant.reportingRequirements}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Building2 className="w-3 h-3 mr-1" />
                        <span className="truncate max-w-[150px]">
                          {getOrganizationName(grant.organizationId)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${grant.amount.toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>Applied: {formatDate(grant.applicationDate)}</span>
                        </div>
                        {grant.awardDate && (
                          <div className="flex items-center text-gray-600">
                            <Award className="w-3 h-3 mr-1" />
                            <span>Awarded: {formatDate(grant.awardDate)}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(grant.status)}>
                        {grant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(grant)}
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
                                This will permanently delete the grant "{grant.grantName}" and all associated data.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(grant.id)}
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
            <DialogTitle>Edit Grant</DialogTitle>
          </DialogHeader>
          <GrantForm onSubmit={handleUpdate} isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GrantManagement;