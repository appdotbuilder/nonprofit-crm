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
import { Plus, Edit, Trash2, Gift, Search, DollarSign, Calendar, CreditCard } from 'lucide-react';
import type { Donation, CreateDonationInput, UpdateDonationInput, Donor, Campaign } from '../../../server/src/schema';

interface DonationManagementProps {
  tenantId: string;
}

function DonationManagement({ tenantId }: DonationManagementProps) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateDonationInput>({
    tenantId,
    donorId: 0,
    campaignId: null,
    amount: 0,
    date: new Date(),
    status: 'Pledged',
    paymentMethod: null,
    notes: null,
    customFields: null,
  });

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Pledged', label: 'Pledged' },
    { value: 'Received', label: 'Received' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'Refunded', label: 'Refunded' },
  ];

  const paymentMethodOptions = [
    { value: '', label: 'Select payment method' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Check', label: 'Check' },
    { value: 'Credit Card', label: 'Credit Card' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Online', label: 'Online' },
    { value: 'Other', label: 'Other' },
  ];

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [donationsResponse, donorsResponse, campaignsResponse] = await Promise.all([
        trpc.donations.list.query({
          tenantId,
          search: searchTerm || undefined,
          page: 1,
          limit: 50,
          sortBy: 'date',
          sortOrder: 'desc',
        }),
        trpc.donors.list.query({
          tenantId,
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc',
        }),
        trpc.campaigns.list.query({
          tenantId,
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc',
        }),
      ]);

      let filteredDonations = donationsResponse.donations;
      if (statusFilter !== 'all') {
        filteredDonations = donationsResponse.donations.filter((d: Donation) => d.status === statusFilter);
      }

      setDonations(filteredDonations);
      setDonors(donorsResponse.donors);
      setCampaigns(campaignsResponse.campaigns);
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
      donorId: 0,
      campaignId: null,
      amount: 0,
      date: new Date(),
      status: 'Pledged',
      paymentMethod: null,
      notes: null,
      customFields: null,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.donorId === 0) return;
    
    setIsSubmitting(true);
    try {
      const response = await trpc.donations.create.mutate(formData);
      setDonations((prev: Donation[]) => [response, ...prev]);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create donation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (donation: Donation) => {
    setEditingDonation(donation);
    setFormData({
      tenantId,
      donorId: donation.donorId,
      campaignId: donation.campaignId,
      amount: donation.amount,
      date: donation.date,
      status: donation.status,
      paymentMethod: donation.paymentMethod,
      notes: donation.notes,
      customFields: donation.customFields,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDonation) return;
    
    setIsSubmitting(true);
    try {
      const updateData: UpdateDonationInput = {
        id: editingDonation.id,
        donorId: formData.donorId,
        campaignId: formData.campaignId,
        amount: formData.amount,
        date: formData.date,
        status: formData.status,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        customFields: formData.customFields,
      };
      
      const response = await trpc.donations.update.mutate({ ...updateData, tenantId });
      setDonations((prev: Donation[]) => prev.map((d: Donation) => d.id === editingDonation.id ? response : d));
      setIsEditDialogOpen(false);
      resetForm();
      setEditingDonation(null);
    } catch (error) {
      console.error('Failed to update donation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.donations.delete.mutate({ id, tenantId });
      setDonations((prev: Donation[]) => prev.filter((d: Donation) => d.id !== id));
    } catch (error) {
      console.error('Failed to delete donation:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received': return 'bg-green-100 text-green-800';
      case 'Pledged': return 'bg-blue-100 text-blue-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Refunded': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDonorName = (donorId: number) => {
    const donor = donors.find((d: Donor) => d.id === donorId);
    return donor ? donor.name : `Donor #${donorId}`;
  };

  const getCampaignName = (campaignId: number | null) => {
    if (!campaignId) return 'General Fund';
    const campaign = campaigns.find((c: Campaign) => c.id === campaignId);
    return campaign ? campaign.name : `Campaign #${campaignId}`;
  };

  const DonationForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => Promise<void>; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="donorId">Donor *</Label>
          <Select
            value={formData.donorId.toString()}
            onValueChange={(value) =>
              setFormData((prev: CreateDonationInput) => ({ ...prev, donorId: parseInt(value) }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a donor" />
            </SelectTrigger>
            <SelectContent>
              {donors.map((donor: Donor) => (
                <SelectItem key={donor.id} value={donor.id.toString()}>
                  {donor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="campaignId">Campaign (Optional)</Label>
          <Select
            value={formData.campaignId?.toString() || ''}
            onValueChange={(value) =>
              setFormData((prev: CreateDonationInput) => ({
                ...prev,
                campaignId: value ? parseInt(value) : null
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a campaign or leave empty for general fund" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">General Fund</SelectItem>
              {campaigns.map((campaign: Campaign) => (
                <SelectItem key={campaign.id} value={campaign.id.toString()}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateDonationInput) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
              }
              required
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={new Date(formData.date).toISOString().split('T')[0]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateDonationInput) => ({ ...prev, date: new Date(e.target.value) }))
              }
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev: CreateDonationInput) => ({ ...prev, status: value as any }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pledged">Pledged</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={formData.paymentMethod || ''}
              onValueChange={(value) =>
                setFormData((prev: CreateDonationInput) => ({ 
                  ...prev, 
                  paymentMethod: value ? value as any : null 
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodOptions.slice(1).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateDonationInput) => ({ ...prev, notes: e.target.value || null }))
            }
            placeholder="Enter notes"
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || formData.donorId === 0}>
          {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Donation' : 'Create Donation')}
        </Button>
      </DialogFooter>
    </form>
  );

  const totalAmount = donations.reduce((sum: number, donation: Donation) => sum + donation.amount, 0);
  const receivedAmount = donations
    .filter((d: Donation) => d.status === 'Received')
    .reduce((sum: number, donation: Donation) => sum + donation.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Donation Management</h2>
            <p className="text-sm text-gray-500">Track donations and pledges</p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Donation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Donation</DialogTitle>
            </DialogHeader>
            <DonationForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pledged</p>
                <p className="text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Received</p>
                <p className="text-2xl font-bold text-green-600">${receivedAmount.toLocaleString()}</p>
              </div>
              <Gift className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-orange-600">${(totalAmount - receivedAmount).toLocaleString()}</p>
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
                placeholder="Search donations..."
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
              {donations.length} donation{donations.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Donations Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No donations</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by recording your first donation.</p>
              <div className="mt-6">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Donation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Donation</DialogTitle>
                    </DialogHeader>
                    <DonationForm onSubmit={handleCreate} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((donation: Donation) => (
                  <TableRow key={donation.id}>
                    <TableCell>
                      <div className="font-medium">{getDonorName(donation.donorId)}</div>
                      {donation.notes && (
                        <div className="text-sm text-gray-500 mt-1 truncate max-w-[150px]">
                          {donation.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{getCampaignName(donation.campaignId)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${donation.amount.toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(donation.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {donation.paymentMethod && (
                        <div className="flex items-center text-sm text-gray-600">
                          <CreditCard className="w-3 h-3 mr-1" />
                          {donation.paymentMethod}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(donation.status)}>
                        {donation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(donation)}
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
                                This will permanently delete this donation record.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(donation.id)}
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
            <DialogTitle>Edit Donation</DialogTitle>
          </DialogHeader>
          <DonationForm onSubmit={handleUpdate} isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DonationManagement;