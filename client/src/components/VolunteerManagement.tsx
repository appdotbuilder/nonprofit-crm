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
import { Plus, Edit, Trash2, Heart, Search, Mail, Phone, MapPin, Clock, Wrench } from 'lucide-react';
import type { Volunteer, CreateVolunteerInput, UpdateVolunteerInput } from '../../../server/src/schema';

interface VolunteerManagementProps {
  tenantId: string;
}

function VolunteerManagement({ tenantId }: VolunteerManagementProps) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateVolunteerInput>({
    tenantId,
    name: '',
    email: null,
    phone: null,
    address: null,
    skills: null,
    availability: null,
    notes: null,
    customFields: null,
  });

  const loadVolunteers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await trpc.volunteers.list.query({
        tenantId,
        search: searchTerm || undefined,
        page: 1,
        limit: 50,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      setVolunteers(response.volunteers);
    } catch (error) {
      console.error('Failed to load volunteers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, searchTerm]);

  useEffect(() => {
    loadVolunteers();
  }, [loadVolunteers]);

  const resetForm = () => {
    setFormData({
      tenantId,
      name: '',
      email: null,
      phone: null,
      address: null,
      skills: null,
      availability: null,
      notes: null,
      customFields: null,
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await trpc.volunteers.create.mutate(formData);
      setVolunteers((prev: Volunteer[]) => [...prev, response]);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create volunteer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer);
    setFormData({
      tenantId,
      name: volunteer.name,
      email: volunteer.email,
      phone: volunteer.phone,
      address: volunteer.address,
      skills: volunteer.skills,
      availability: volunteer.availability,
      notes: volunteer.notes,
      customFields: volunteer.customFields,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVolunteer) return;
    
    setIsSubmitting(true);
    try {
      const updateData: UpdateVolunteerInput = {
        id: editingVolunteer.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        skills: formData.skills,
        availability: formData.availability,
        notes: formData.notes,
        customFields: formData.customFields,
      };
      
      const response = await trpc.volunteers.update.mutate({ ...updateData, tenantId });
      setVolunteers((prev: Volunteer[]) => prev.map((v: Volunteer) => v.id === editingVolunteer.id ? response : v));
      setIsEditDialogOpen(false);
      resetForm();
      setEditingVolunteer(null);
    } catch (error) {
      console.error('Failed to update volunteer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.volunteers.delete.mutate({ id, tenantId });
      setVolunteers((prev: Volunteer[]) => prev.filter((v: Volunteer) => v.id !== id));
    } catch (error) {
      console.error('Failed to delete volunteer:', error);
    }
  };

  const VolunteerForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => Promise<void>; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateVolunteerInput) => ({ ...prev, name: e.target.value }))
            }
            required
            placeholder="Enter volunteer name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateVolunteerInput) => ({ ...prev, email: e.target.value || null }))
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
                setFormData((prev: CreateVolunteerInput) => ({ ...prev, phone: e.target.value || null }))
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
              setFormData((prev: CreateVolunteerInput) => ({ ...prev, address: e.target.value || null }))
            }
            placeholder="Enter address"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="skills">Skills & Expertise</Label>
          <Textarea
            id="skills"
            value={formData.skills || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateVolunteerInput) => ({ ...prev, skills: e.target.value || null }))
            }
            placeholder="e.g., Marketing, IT Support, Event Planning, Fundraising..."
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="availability">Availability</Label>
          <Textarea
            id="availability"
            value={formData.availability || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateVolunteerInput) => ({ ...prev, availability: e.target.value || null }))
            }
            placeholder="e.g., Weekends, Evenings, Flexible schedule..."
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateVolunteerInput) => ({ ...prev, notes: e.target.value || null }))
            }
            placeholder="Additional notes"
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Volunteer' : 'Create Volunteer')}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Volunteer Management</h2>
            <p className="text-sm text-gray-500">Manage your volunteer community</p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Volunteer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Volunteer</DialogTitle>
            </DialogHeader>
            <VolunteerForm onSubmit={handleCreate} />
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
                placeholder="Search volunteers by name, skills, or availability..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">
              {volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Volunteers Table */}
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
          ) : volunteers.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No volunteers</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first volunteer.</p>
              <div className="mt-6">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Volunteer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Volunteer</DialogTitle>
                    </DialogHeader>
                    <VolunteerForm onSubmit={handleCreate} />
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
                  <TableHead>Skills</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volunteers.map((volunteer: Volunteer) => (
                  <TableRow key={volunteer.id}>
                    <TableCell>
                      <div className="font-medium">{volunteer.name}</div>
                      {volunteer.notes && (
                        <div className="text-sm text-gray-500 mt-1 truncate max-w-[200px]">
                          {volunteer.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {volunteer.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-[150px]">{volunteer.email}</span>
                          </div>
                        )}
                        {volunteer.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-3 h-3 mr-1" />
                            {volunteer.phone}
                          </div>
                        )}
                        {volunteer.address && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-[120px]">{volunteer.address}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {volunteer.skills ? (
                        <div className="flex items-start text-sm text-gray-600">
                          <Wrench className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{volunteer.skills}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No skills listed</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {volunteer.availability ? (
                        <div className="flex items-start text-sm text-gray-600">
                          <Clock className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{volunteer.availability}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not specified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {volunteer.createdAt.toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(volunteer)}
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
                                This will permanently delete the volunteer "{volunteer.name}" and all associated data.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(volunteer.id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Volunteer</DialogTitle>
          </DialogHeader>
          <VolunteerForm onSubmit={handleUpdate} isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VolunteerManagement;