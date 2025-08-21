import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MaterialRequest } from '@/store/appStore';
import { format } from 'date-fns';

interface ApprovedTicketViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaterialRequest;
}

export default function ApprovedTicketViewer({ open, onOpenChange, request }: ApprovedTicketViewerProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Material Request Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <div><strong>Request ID:</strong> {request.seqId ? `MR-${request.seqId.toString().padStart(3, '0')}` : request.id.slice(-8)}</div>
            <div><strong>Title:</strong> {request.title}</div>
            <div><strong>Status:</strong> {request.status}</div>
            <div><strong>Requested By:</strong> {request.requestedBy}</div>
            <div><strong>Date:</strong> {format(new Date(request.createdAt), 'MMM dd, yyyy')}</div>
            {request.ticketNumber && <div><strong>Ticket Number:</strong> {request.ticketNumber}</div>}
            <div><strong>Zone:</strong> {request.zone || '—'}</div>
            {request.description && <div><strong>Description:</strong> {request.description}</div>}
          </div>

          {/* Items Table */}
          <div>
            <h3 className="font-medium mb-2">Items ({request.items.length})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sl No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Required Qty</TableHead>
                  <TableHead>Approved Qty</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Urgency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {request.items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity || 0}</TableCell>
                    <TableCell>{item.approvedQty || item.quantity || 0}</TableCell>
                    <TableCell>{item.source || '—'}</TableCell>
                    <TableCell>{item.urgency || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
