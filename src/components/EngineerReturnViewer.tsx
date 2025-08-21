import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MaterialRequest } from '@/store/appStore';
import { format } from 'date-fns';
import { CheckCircle, Clock, Truck, Package, RotateCcw } from 'lucide-react';

interface EngineerReturnViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaterialRequest;
}

export default function EngineerReturnViewer({ open, onOpenChange, request }: EngineerReturnViewerProps) {
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
      case 'in-process':
        return <RotateCcw className="h-4 w-4 text-indigo-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(request.status)}
            Return Request Details - {request.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">MRC ID</label>
              <div className="text-sm">
                {request.seqId 
                  ? `MRC-${request.seqId.toString().padStart(3, '0')}`
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
              <div className="text-sm">{request.requestType || 'MRC'}</div>
            </div>
          </div>

          {/* Description */}
          {request.description && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <div className="text-sm p-3 bg-muted rounded-md">{request.description}</div>
            </div>
          )}

          {/* Transport Information (if applicable) */}
          {(request.status === 'in-transit' || request.status === 'delivered') && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Transport Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Transport Mode</label>
                  <div className="text-sm">{request.transportMode || '—'}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Tracking Number</label>
                  <div className="text-sm font-mono">{request.trackingNo || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Return Items Table */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Return Items</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Sl No</TableHead>
                    <TableHead>Item Description</TableHead>
                    <TableHead className="w-32">Return Qty</TableHead>
                    <TableHead className="w-40">Source</TableHead>
                    <TableHead className="w-40">Urgency</TableHead>
                    <TableHead className="w-40">MRC Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {request.items.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="min-w-[200px] max-w-[300px]">
                        <div className="text-sm leading-relaxed">
                          {item.description}
                        </div>
                      </TableCell>
                      <TableCell>{(item as any).returnQty || item.quantity || 0}</TableCell>
                      <TableCell>{item.source}</TableCell>
                      <TableCell>{item.urgency}</TableCell>
                      <TableCell>{(item as any).mrcNo || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
