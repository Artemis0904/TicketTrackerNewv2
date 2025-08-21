import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaterialItemRow, MaterialRequest, useAppStore } from '@/store/appStore';
import { toast } from 'sonner';
import { notify } from '@/lib/notifications';
import { useAuth } from '@/hooks/useAuth';

interface RMRequestEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaterialRequest;
}

type ZoneOption = 'North' | 'South' | 'North East' | 'Army' | 'General';

export default function RMRequestEditor({ open, onOpenChange, request }: RMRequestEditorProps) {
  const { updateRequest, updateStatus } = useAppStore();
  const { zone: userZone } = useAuth();

  const [ticketNumber, setTicketNumber] = useState(request.ticketNumber || '');
  const [zone, setZone] = useState<ZoneOption>((request.zone as ZoneOption) || (userZone as ZoneOption) || 'North');
  const [description, setDescription] = useState(request.description || '');
  const [rows, setRows] = useState<MaterialItemRow[]>(request.items || []);

  // Check if the request is processed (read-only mode)
  // Processed requests are those that are not pending (approved, in-process, in-transit, delivered, etc.)
  const isReadOnly = request.status !== 'pending';

  useEffect(() => {
    if (open) {
      setTicketNumber(request.ticketNumber || '');
      setZone(((request.zone as ZoneOption) || (userZone as ZoneOption) || 'North'));
      setDescription(request.description || '');
      
      // Set approved quantity to match required quantity if not already set
      const itemsWithDefaultApprovedQty = (request.items || []).map(item => ({
        ...item,
        approvedQty: item.approvedQty !== undefined ? item.approvedQty : item.quantity
      }));
      setRows(itemsWithDefaultApprovedQty);
    }
  }, [open, request, userZone]);

  const canSave = useMemo(() => rows.some(r => r.description.trim() && (r.quantity ?? 0) >= 0), [rows]);

  const onChangeRow = (id: string, patch: Partial<MaterialItemRow>) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));

  const onApprove = async () => {
    // First update the request with any changes
    updateRequest(request.id, { items: rows, ticketNumber: ticketNumber.trim(), zone, description: description.trim() });
    
    // Then approve the request
    updateStatus(request.id, 'approved');
    await notify({
      eventType: 'MR_APPROVED',
      zone: request.zone,
      request: {
        id: request.id,
        title: request.title,
        ticketNumber: request.ticketNumber,
        zone: request.zone,
        description: request.description,
        status: 'approved',
        requestedBy: request.requestedBy,
        requesterEmail: request.requesterEmail ?? null,
      },
      targetDepartments: ['store_manager'],
      extraRecipients: request.requesterEmail ? [request.requesterEmail] : [],
    });
    toast.success('Request approved and sent to Store Manager.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && !isReadOnly) {
        // Save changes when closing only if not read-only
        updateRequest(request.id, { 
          items: rows, 
          ticketNumber: ticketNumber.trim(), 
          zone, 
          description: description.trim() 
        });
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {isReadOnly ? 'View Material Request' : 'Edit Material Request'}
            {isReadOnly && <span className="text-sm font-normal text-muted-foreground ml-2">(Read Only)</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-number">Ticket Number</Label>
            <Input id="ticket-number" value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} placeholder="e.g., TKT-00123" disabled={isReadOnly} />
          </div>

                      <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              <Select value={zone} onValueChange={(v) => setZone(v as ZoneOption)} disabled={true}>
                <SelectTrigger>
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="North">North</SelectItem>
                  <SelectItem value="South">South</SelectItem>
                  <SelectItem value="North East">North East</SelectItem>
                  <SelectItem value="Army">Army</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Sl No</TableHead>
                  <TableHead>Item Desc</TableHead>
                  <TableHead className="w-32">Required Qty</TableHead>
                  <TableHead className="w-40">Source</TableHead>
                  <TableHead className="w-40">Urgency</TableHead>
                  <TableHead className="w-40">Approved Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={row.description}
                        onChange={(e) => onChangeRow(row.id, { description: e.target.value })}
                        placeholder="Describe the item"
                        disabled={isReadOnly}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={row.quantity || ''}
                        onChange={(e) => onChangeRow(row.id, { quantity: Number(e.target.value) })}
                        placeholder="0"
                        disabled={isReadOnly}
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={row.source} onValueChange={(v) => onChangeRow(row.id, { source: v as MaterialItemRow['source'] })} disabled={isReadOnly}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="Store">Store</SelectItem>
                          <SelectItem value="CSD">CSD</SelectItem>
                          <SelectItem value="Site Purchase">Site Purchase</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={row.urgency} onValueChange={(v) => onChangeRow(row.id, { urgency: v as MaterialItemRow['urgency'] })} disabled={isReadOnly}>
                        <SelectTrigger>
                          <SelectValue placeholder="Urgency" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={row.approvedQty ?? ''}
                        onChange={(e) => onChangeRow(row.id, { approvedQty: Number(e.target.value) })}
                        placeholder={row.quantity?.toString() || "0"}
                        disabled={isReadOnly}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mr-description">Description</Label>
            <Textarea
              id="mr-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional details for this request"
              disabled={isReadOnly}
            />
          </div>
        </div>

        <DialogFooter>
          {isReadOnly ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>This request has been processed and cannot be modified.</span>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={onApprove} disabled={!canSave}>Approve</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
