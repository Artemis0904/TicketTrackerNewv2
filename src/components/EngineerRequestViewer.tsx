import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaterialRequest, MaterialItemRow, UrgencyOption, SourceOption } from '@/store/appStore';
import { format } from 'date-fns';
import { CheckCircle, Clock, Truck, Package, Save, X, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMaterialRequests } from '@/hooks/useMaterialRequests';
import { toast } from 'sonner';

interface EngineerRequestViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaterialRequest;
}

export default function EngineerRequestViewer({ open, onOpenChange, request }: EngineerRequestViewerProps) {
  const { updateRequest } = useMaterialRequests();
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<MaterialItemRow[]>(request.items);
  const [isSaving, setIsSaving] = useState(false);

  // Reset edited items when request changes
  useEffect(() => {
    if (request.items) {
      setEditedItems(request.items);
    }
  }, [request.items]);

  const isEditable = request.status === 'pending';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateRequest(request.id, { items: editedItems });
      toast.success('Request updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update request');
      console.error('Error updating request:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedItems(request.items);
    setIsEditing(false);
  };

  const updateItem = (itemId: string, field: keyof MaterialItemRow, value: any) => {
    setEditedItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  // Function to create default rows (same as MR form)
  const defaultRows = (count = 1): MaterialItemRow[] =>
    Array.from({ length: count }).map((_, idx) => ({
      id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      description: '',
      quantity: 0,
      source: 'Store' as SourceOption,
      urgency: 'Low' as UrgencyOption,
    }));

  const onAddRow = () => setEditedItems(prev => [...prev, ...defaultRows(1)]);
  const onDeleteRow = (id: string) => setEditedItems(prev => prev.filter(r => r.id !== id));
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      'in-transit': 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      shipped: 'bg-blue-100 text-blue-800',
      'in-process': 'bg-indigo-100 text-indigo-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status.replace('-', ' ')}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'in-transit':
        return <Truck className="h-4 w-4 text-blue-600" />;
      case 'delivered':
        return <Package className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(request.status)}
              Request Details - {request.title}
            </div>
            {isEditable && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Edit
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Request ID</label>
              <div className="text-sm">
                {request.seqId 
                  ? (request.requestType === 'MRC' ? `MRC-${request.seqId.toString().padStart(3, '0')}` : `MR-${request.seqId.toString().padStart(3, '0')}`)
                  : request.id.slice(-8)
                }
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Ticket Number</label>
              <div className="text-sm">{request.ticketNumber || '—'}</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Zone</label>
              <div className="text-sm">{request.zone || '—'}</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="flex items-center gap-2">
                {getStatusIcon(request.status)}
                {getStatusBadge(request.status)}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Date Created</label>
              <div className="text-sm">{format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Request Type</label>
              <div className="text-sm">{request.requestType || 'MR'}</div>
            </div>
          </div>

          {/* Description */}
          {request.description && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <div className="text-sm p-3 bg-muted rounded-md">{request.description}</div>
            </div>
          )}

          {/* Shipment Information (if applicable) */}
          {(request.status === 'in-transit' || request.status === 'delivered') && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Shipment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Transport Mode</label>
                  <div className="text-sm">{request.transportMode || '—'}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Sent Date</label>
                  <div className="text-sm">{request.sentAt ? format(new Date(request.sentAt), 'MMM dd, yyyy') : '—'}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Expected Delivery</label>
                  <div className="text-sm">{request.edt ? format(new Date(request.edt), 'MMM dd, yyyy') : '—'}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Tracking Number</label>
                  <div className="text-sm font-mono">{request.trackingNo || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Requested Items</h3>
            <div className="rounded-md border">
              <Table>
                                                   <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Sl No</TableHead>
                      <TableHead>Item Description</TableHead>
                      <TableHead className="w-32">Required Qty</TableHead>
                      <TableHead className="w-32">Approved Qty</TableHead>
                      <TableHead className="w-40">Source</TableHead>
                      <TableHead className="w-40">Urgency</TableHead>
                      {isEditing && <TableHead className="w-10"></TableHead>}
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {(isEditing ? editedItems : request.items).map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="min-w-[200px] max-w-[300px]">
                        {isEditing ? (
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="text-sm"
                          />
                        ) : (
                          <div className="text-sm leading-relaxed">
                            {item.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity || 0}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        ) : (
                          item.quantity || 0
                        )}
                      </TableCell>
                      <TableCell>{item.approvedQty || '—'}</TableCell>
                      <TableCell>
                                                 {isEditing ? (
                           <Select
                             value={item.source}
                             onValueChange={(value) => updateItem(item.id, 'source', value as SourceOption)}
                           >
                             <SelectTrigger className="w-32">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Store">Store</SelectItem>
                               <SelectItem value="CSD">CSD</SelectItem>
                               <SelectItem value="Site Purchase">Site Purchase</SelectItem>
                             </SelectContent>
                           </Select>
                         ) : (
                           item.source
                         )}
                      </TableCell>
                      <TableCell>
                                                 {isEditing ? (
                           <Select
                             value={item.urgency}
                             onValueChange={(value) => updateItem(item.id, 'urgency', value as UrgencyOption)}
                           >
                             <SelectTrigger className="w-24">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Low">Low</SelectItem>
                               <SelectItem value="Medium">Medium</SelectItem>
                               <SelectItem value="High">High</SelectItem>
                             </SelectContent>
                           </Select>
                         ) : (
                           item.urgency
                                                    )}
                       </TableCell>
                       {isEditing && (
                         <TableCell>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => onDeleteRow(item.id)} 
                             aria-label="Delete row"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </TableCell>
                       )}
                     </TableRow>
                   ))}
                 </TableBody>
              </Table>
            </div>
            {isEditing && (
              <div className="flex justify-between">
                <Button variant="secondary" onClick={onAddRow} className="gap-2">
                  <Plus className="h-4 w-4" /> Add row
                </Button>
              </div>
            )}
          </div>
        </div>
        {isEditing && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
