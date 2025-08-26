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
import { Plus, Edit, Trash2, Calendar, Search, MapPin, Users, Clock, UserPlus } from 'lucide-react';
import type { Event, CreateEventInput, UpdateEventInput, Donor, Volunteer, CreateEventAttendeeInput } from '../../../server/src/schema';

interface EventManagementProps {
  tenantId: string;
}

function EventManagement({ tenantId }: EventManagementProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAttendeeDialogOpen, setIsAttendeeDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<Event | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateEventInput>({
    tenantId,
    name: '',
    description: null,
    date: new Date(),
    location: null,
    capacity: null,
    customFields: null,
  });

  const [attendeeForm, setAttendeeForm] = useState({
    attendeeId: 0,
    attendeeType: 'Donor' as 'Donor' | 'Volunteer',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventsResponse, donorsResponse, volunteersResponse] = await Promise.all([
        trpc.events.list.query({
          tenantId,
          search: searchTerm || undefined,
          page: 1,
          limit: 50,
          sortBy: 'date',
          sortOrder: 'asc',
        }),
        trpc.donors.list.query({
          tenantId,
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc',
        }),
        trpc.volunteers.list.query({
          tenantId,
          page: 1,
          limit: 100,
          sortBy: 'name',
          sortOrder: 'asc',
        }),
      ]);

      setEvents(eventsResponse.events);
      setDonors(donorsResponse.donors);
      setVolunteers(volunteersResponse.volunteers);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({
      tenantId,
      name: '',
      description: null,
      date: new Date(),
      location: null,
      capacity: null,
      customFields: null,
    });
  };

  const resetAttendeeForm = () => {
    setAttendeeForm({
      attendeeId: 0,
      attendeeType: 'Donor',
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await trpc.events.create.mutate(formData);
      setEvents((prev: Event[]) => [...prev, response].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      tenantId,
      name: event.name,
      description: event.description,
      date: event.date,
      location: event.location,
      capacity: event.capacity,
      customFields: event.customFields,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    
    setIsSubmitting(true);
    try {
      const updateData: UpdateEventInput = {
        id: editingEvent.id,
        name: formData.name,
        description: formData.description,
        date: formData.date,
        location: formData.location,
        capacity: formData.capacity,
        customFields: formData.customFields,
      };
      
      const response = await trpc.events.update.mutate({ ...updateData, tenantId });
      setEvents((prev: Event[]) => prev.map((e: Event) => e.id === editingEvent.id ? response : e));
      setIsEditDialogOpen(false);
      resetForm();
      setEditingEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.events.delete.mutate({ id, tenantId });
      setEvents((prev: Event[]) => prev.filter((e: Event) => e.id !== id));
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForAttendees || attendeeForm.attendeeId === 0) return;
    
    setIsSubmitting(true);
    try {
      const attendeeData: CreateEventAttendeeInput = {
        tenantId,
        eventId: selectedEventForAttendees.id,
        attendeeId: attendeeForm.attendeeId,
        attendeeType: attendeeForm.attendeeType,
      };
      
      await trpc.events.addAttendee.mutate(attendeeData);
      setIsAttendeeDialogOpen(false);
      resetAttendeeForm();
      setSelectedEventForAttendees(null);
      // Could add a success message here
    } catch (error) {
      console.error('Failed to add attendee:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAttendeeDialog = (event: Event) => {
    setSelectedEventForAttendees(event);
    resetAttendeeForm();
    setIsAttendeeDialogOpen(true);
  };

  const getEventStatus = (date: Date) => {
    const now = new Date();
    const eventDate = new Date(date);
    const diffHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < -24) return { status: 'Past', color: 'bg-gray-100 text-gray-800' };
    if (diffHours < 0) return { status: 'Recently Ended', color: 'bg-orange-100 text-orange-800' };
    if (diffHours < 24) return { status: 'Today', color: 'bg-blue-100 text-blue-800' };
    if (diffHours < 168) return { status: 'This Week', color: 'bg-green-100 text-green-800' };
    return { status: 'Upcoming', color: 'bg-purple-100 text-purple-800' };
  };

  const formatDateTime = (date: Date) => {
    const eventDate = new Date(date);
    return {
      date: eventDate.toLocaleDateString(),
      time: eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const EventForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => Promise<void>; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="name">Event Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateEventInput) => ({ ...prev, name: e.target.value }))
            }
            required
            placeholder="Enter event name"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateEventInput) => ({ ...prev, description: e.target.value || null }))
            }
            placeholder="Enter event description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="datetime-local"
              value={new Date(formData.date).toISOString().slice(0, 16)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateEventInput) => ({ ...prev, date: new Date(e.target.value) }))
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              value={formData.capacity || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateEventInput) => ({
                  ...prev,
                  capacity: e.target.value ? parseInt(e.target.value) : null
                }))
              }
              placeholder="Max attendees"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateEventInput) => ({ ...prev, location: e.target.value || null }))
            }
            placeholder="Enter event location"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Event' : 'Create Event')}
        </Button>
      </DialogFooter>
    </form>
  );

  const AttendeeForm = ({ onSubmit }: { onSubmit: (e: React.FormEvent) => Promise<void> }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="attendeeType">Attendee Type *</Label>
          <Select
            value={attendeeForm.attendeeType}
            onValueChange={(value: 'Donor' | 'Volunteer') =>
              setAttendeeForm((prev) => ({ ...prev, attendeeType: value, attendeeId: 0 }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Donor">Donor</SelectItem>
              <SelectItem value="Volunteer">Volunteer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="attendeeId">{attendeeForm.attendeeType} *</Label>
          <Select
            value={attendeeForm.attendeeId.toString()}
            onValueChange={(value) =>
              setAttendeeForm((prev) => ({ ...prev, attendeeId: parseInt(value) }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select a ${attendeeForm.attendeeType.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {attendeeForm.attendeeType === 'Donor'
                ? donors.map((donor: Donor) => (
                    <SelectItem key={donor.id} value={donor.id.toString()}>
                      {donor.name}
                    </SelectItem>
                  ))
                : volunteers.map((volunteer: Volunteer) => (
                    <SelectItem key={volunteer.id} value={volunteer.id.toString()}>
                      {volunteer.name}
                    </SelectItem>
                  ))
              }
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || attendeeForm.attendeeId === 0}>
          {isSubmitting ? 'Adding...' : 'Add Attendee'}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Event Management</h2>
            <p className="text-sm text-gray-500">Organize and manage events</p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <EventForm onSubmit={handleCreate} />
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
                placeholder="Search events by name, location, or description..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
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
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first event.</p>
              <div className="mt-6">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Event</DialogTitle>
                    </DialogHeader>
                    <EventForm onSubmit={handleCreate} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event: Event) => {
                  const dateTime = formatDateTime(event.date);
                  const status = getEventStatus(event.date);
                  
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{event.name}</div>
                          {event.description && (
                            <div className="text-sm text-gray-500 mt-1 truncate max-w-[250px]">
                              {event.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm font-medium">
                            <Calendar className="w-3 h-3 mr-1" />
                            {dateTime.date}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {dateTime.time}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.location ? (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-[150px]">{event.location}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.capacity ? (
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="w-3 h-3 mr-1" />
                            {event.capacity} people
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Unlimited</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          {status.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAttendeeDialog(event)}
                            title="Add Attendee"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(event)}
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
                                  This will permanently delete the event "{event.name}" and all associated data.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(event.id)}
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <EventForm onSubmit={handleUpdate} isEdit />
        </DialogContent>
      </Dialog>

      {/* Add Attendee Dialog */}
      <Dialog open={isAttendeeDialogOpen} onOpenChange={setIsAttendeeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add Attendee to {selectedEventForAttendees?.name}
            </DialogTitle>
          </DialogHeader>
          <AttendeeForm onSubmit={handleAddAttendee} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EventManagement;