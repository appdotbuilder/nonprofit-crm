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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { trpc } from '@/utils/trpc';
import { Plus, Edit, Trash2, Database, Search, ChevronDown, ChevronRight, FileJson, Calendar, Tag } from 'lucide-react';
import type { CustomData, CreateCustomDataInput, UpdateCustomDataInput } from '../../../server/src/schema';

interface CustomDataManagementProps {
  tenantId: string;
}

function CustomDataManagement({ tenantId }: CustomDataManagementProps) {
  const [customData, setCustomData] = useState<CustomData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingData, setEditingData] = useState<CustomData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const [formData, setFormData] = useState<CreateCustomDataInput>({
    tenantId,
    dataType: '',
    name: '',
    description: null,
    data: {},
  });

  const [jsonInput, setJsonInput] = useState('{}');

  const loadCustomData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await trpc.customData.list.query({
        tenantId,
        search: searchTerm || undefined,
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      
      let filteredData = response.customData;
      if (typeFilter !== 'all') {
        filteredData = response.customData.filter((item: CustomData) => item.dataType === typeFilter);
      }
      
      setCustomData(filteredData);
    } catch (error) {
      console.error('Failed to load custom data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, searchTerm, typeFilter]);

  useEffect(() => {
    loadCustomData();
  }, [loadCustomData]);

  const resetForm = () => {
    setFormData({
      tenantId,
      dataType: '',
      name: '',
      description: null,
      data: {},
    });
    setJsonInput('{}');
  };

  const validateAndParseJson = (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const parsedData = validateAndParseJson(jsonInput);
      const dataToSubmit = { ...formData, data: parsedData };
      
      const response = await trpc.customData.create.mutate(dataToSubmit);
      setCustomData((prev: CustomData[]) => [response, ...prev]);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create custom data:', error);
      alert(error instanceof Error ? error.message : 'Failed to create custom data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (data: CustomData) => {
    setEditingData(data);
    setFormData({
      tenantId,
      dataType: data.dataType,
      name: data.name,
      description: data.description,
      data: data.data,
    });
    setJsonInput(JSON.stringify(data.data, null, 2));
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingData) return;
    
    setIsSubmitting(true);
    try {
      const parsedData = validateAndParseJson(jsonInput);
      const updateData: UpdateCustomDataInput = {
        id: editingData.id,
        dataType: formData.dataType,
        name: formData.name,
        description: formData.description,
        data: parsedData,
      };
      
      const response = await trpc.customData.update.mutate({ ...updateData, tenantId });
      setCustomData((prev: CustomData[]) => prev.map((item: CustomData) => item.id === editingData.id ? response : item));
      setIsEditDialogOpen(false);
      resetForm();
      setEditingData(null);
    } catch (error) {
      console.error('Failed to update custom data:', error);
      alert(error instanceof Error ? error.message : 'Failed to update custom data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trpc.customData.delete.mutate({ id, tenantId });
      setCustomData((prev: CustomData[]) => prev.filter((item: CustomData) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete custom data:', error);
    }
  };

  const toggleRowExpansion = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getUniqueDataTypes = () => {
    const types = new Set(customData.map((item: CustomData) => item.dataType));
    return Array.from(types).sort();
  };

  const renderJsonData = (data: any, depth = 0): React.ReactNode => {
    if (depth > 3) return '...'; // Prevent infinite recursion
    
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return (
          <div className="ml-2">
            [{data.map((item, index) => (
              <div key={index} className="ml-2">
                {index}: {renderJsonData(item, depth + 1)}
                {index < data.length - 1 && ','}
              </div>
            ))}]
          </div>
        );
      } else {
        return (
          <div className="ml-2">
            {'{'}
            {Object.entries(data).map(([key, value], index, array) => (
              <div key={key} className="ml-2">
                <span className="font-medium text-blue-600">"{key}"</span>: {renderJsonData(value, depth + 1)}
                {index < array.length - 1 && ','}
              </div>
            ))}
            {'}'}
          </div>
        );
      }
    }
    
    if (typeof data === 'string') {
      return <span className="text-green-600">"{data}"</span>;
    }
    
    if (typeof data === 'number' || typeof data === 'boolean') {
      return <span className="text-purple-600">{String(data)}</span>;
    }
    
    if (data === null) {
      return <span className="text-gray-500">null</span>;
    }
    
    return String(data);
  };

  const CustomDataForm = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => Promise<void>; isEdit?: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="dataType">Data Type *</Label>
          <Input
            id="dataType"
            value={formData.dataType}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateCustomDataInput) => ({ ...prev, dataType: e.target.value }))
            }
            required
            placeholder="e.g., Volunteer Hours, Project Milestones, Survey Results"
          />
        </div>

        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateCustomDataInput) => ({ ...prev, name: e.target.value }))
            }
            required
            placeholder="Enter a descriptive name"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateCustomDataInput) => ({ ...prev, description: e.target.value || null }))
            }
            placeholder="Enter description"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="jsonData">JSON Data *</Label>
          <Textarea
            id="jsonData"
            value={jsonInput}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJsonInput(e.target.value)}
            placeholder='{"key": "value", "number": 123, "array": [1, 2, 3]}'
            rows={8}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter valid JSON data. Example: {"{"}"hours": 40, "projects": ["A", "B"], "rating": 4.5{"}"}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Custom Data' : 'Create Custom Data')}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Custom Data Management</h2>
            <p className="text-sm text-gray-500">Manage flexible, structured data for your organization</p>
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Data
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Custom Data</DialogTitle>
            </DialogHeader>
            <CustomDataForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <FileJson className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">About Custom Data</h3>
              <p className="text-sm text-blue-700 mt-1">
                Store any structured data your organization needs. Examples: volunteer hours, project milestones, 
                survey results, equipment inventory, or any JSON-formatted information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search custom data by type, name, or description..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="typeFilter" className="text-sm">Filter by type:</Label>
              <select
                id="typeFilter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Types</option>
                {getUniqueDataTypes().map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <Badge variant="outline">
              {customData.length} record{customData.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Custom Data Table */}
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
          ) : customData.length === 0 ? (
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No custom data</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first custom data record.</p>
              <div className="mt-6">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Data
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Custom Data</DialogTitle>
                    </DialogHeader>
                    <CustomDataForm onSubmit={handleCreate} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name & Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Data Preview</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customData.map((data: CustomData) => (
                  <TableRow key={data.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{data.name}</div>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Tag className="w-3 h-3 mr-1" />
                          {data.dataType}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {data.description ? (
                        <div className="text-sm text-gray-600 max-w-[200px] truncate">
                          {data.description}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No description</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto font-mono text-xs"
                            onClick={() => toggleRowExpansion(data.id)}
                          >
                            {expandedRows.has(data.id) ? (
                              <ChevronDown className="w-3 h-3 mr-1" />
                            ) : (
                              <ChevronRight className="w-3 h-3 mr-1" />
                            )}
                            {Object.keys(data.data).slice(0, 3).join(', ')}
                            {Object.keys(data.data).length > 3 && '...'}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="font-mono text-xs bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                            {renderJsonData(data.data)}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        {data.createdAt.toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(data)}
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
                                This will permanently delete the custom data record "{data.name}" and all its data.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(data.id)}
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
            <DialogTitle>Edit Custom Data</DialogTitle>
          </DialogHeader>
          <CustomDataForm onSubmit={handleUpdate} isEdit />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomDataManagement;