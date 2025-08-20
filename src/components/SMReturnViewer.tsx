import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { MaterialItemRow, MaterialRequest, useAppStore, SourceOption } from '@/store/appStore';
import { toast } from 'sonner';
import { notify } from '@/lib/notifications';

interface SMReturnViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaterialRequest;
}

type TransportMode = 'Train' | 'Bus' | 'Courier';

export default function SMReturnViewer({ open, onOpenChange, request }: SMReturnViewerProps) {
  const { updateRequest, updateStatus } = useAppStore();

  const [rows, setRows] = useState<MaterialItemRow[]>(request.items || []);
  const [sendOpen, setSendOpen] = useState(false);
  const [mode, setMode] = useState<TransportMode | undefined>(request.transportMode as TransportMode | undefined);
  const [edt, setEdt] = useState<Date | undefined>(request.edt ? new Date(request.edt) : undefined);
  const [tracking, setTracking] = useState<string>(request.trackingNo || '');
  const [courierName, setCourierName] = useState<string>('');

  useEffect(() => {
    if (open) {
      // Only reset rows if they don't have receivedAt timestamps (to preserve received status)
      const hasReceivedItems = request.items?.some(item => item.receivedAt);
      if (!hasReceivedItems) {
        setRows(request.items || []);
      }
      setMode(request.transportMode as TransportMode | undefined);
      setEdt(request.edt ? new Date(request.edt) : undefined);
      setTracking(request.trackingNo || '');
      setCourierName('');
    }
  }, [open, request]);

  const canSave = useMemo(() => true, []);

  const onChangeRow = (id: string, patch: Partial<MaterialItemRow>) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));

  const onConfirm = () => {
    updateRequest(request.id, { items: rows });
    toast.success('Updates saved.');
    onOpenChange(false);
  };

  const onConfirmSend = () => {
    if (!mode) {
      toast.error('Please select Mode of transport.');
      return;
    }
    if ((mode === 'Train' || mode === 'Bus') && !edt) {
      toast.error('Please select EDT.');
      return;
    }
    if (mode === 'Courier' && !courierName.trim()) {
      toast.error('Please enter Courier Name.');
      return;
    }
    if (mode === 'Courier' && !tracking.trim()) {
      toast.error('Please enter Tracking No.');
      return;
    }
    
    // First save the updated items (what the Confirm button was doing)
    updateRequest(request.id, { items: rows });
    
    // Then update transport details and mark as sent
    updateRequest(request.id, {
      transportMode: mode,
      edt: edt ? edt.toISOString() : undefined,
      trackingNo: tracking.trim() || undefined,
      sentAt: new Date().toISOString(),
    });
    updateStatus(request.id, 'in-transit');
    toast.success('Request updated and marked as sent.');
    setSendOpen(false);
    onOpenChange(false);
  };

  const onConfirmReceived = () => {
    // Use the actual received quantities from the form
    console.log('Saving items with received status:', rows);
    updateRequest(request.id, { items: rows });
    updateStatus(request.id, 'delivered');
    toast.success('Request marked as received.');
    setSendOpen(false);
    onOpenChange(false);
  };

      return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          // Save changes when closing (either via X button or Close button)
          console.log('Saving changes on dialog close:', rows);
          console.log('Items being saved to database:', JSON.stringify(rows, null, 2));
          updateRequest(request.id, { items: rows });
        }
        onOpenChange(isOpen);
      }}>
      <DialogContent className="max-w-6xl">
                 <DialogHeader>
           <DialogTitle>Return Details</DialogTitle>
         </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Sl No</TableHead>
                  <TableHead className="min-w-[200px]">Item Desc</TableHead>
                  <TableHead className="w-40">Sent Qty</TableHead>
                  <TableHead className="w-40">Received Qty</TableHead>
                  <TableHead className="w-40">MCR NO.</TableHead>
                  <TableHead className="w-40">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={row.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="min-w-[200px] max-w-[300px]">
                      <div className="text-sm leading-relaxed">
                        {row.description}
                      </div>
                    </TableCell>
                                         <TableCell>
                       <div className="px-3 py-2 text-sm">
                         {row.sentQty ?? row.quantity ?? 0}
                       </div>
                     </TableCell>
                                         <TableCell>
                       {row.receivedQty && row.receivedQty > 0 ? (
                         <Input
                           type="number"
                           min={0}
                           value={row.receivedQty ?? ''}
                           onChange={(e) => onChangeRow(row.id, { receivedQty: Number(e.target.value) })}
                           placeholder="0"
                         />
                       ) : (
                         <div className="px-3 py-2 text-sm text-muted-foreground">—</div>
                       )}
                     </TableCell>
                     <TableCell>
                       {row.receivedQty && row.receivedQty > 0 ? (
                         <div className="space-y-1">
                           <Input
                             value={row.mrcNo ?? ''}
                             onChange={(e) => onChangeRow(row.id, { mrcNo: e.target.value })}
                             placeholder="Enter MCR No."
                             className={row.receivedQty > 0 && !row.mrcNo ? 'border-orange-500' : ''}
                           />
                           {row.receivedAt && !row.mrcNo && (
                             (() => {
                               const daysSinceReceived = Math.floor((Date.now() - new Date(row.receivedAt).getTime()) / (1000 * 60 * 60 * 24));
                               if (daysSinceReceived >= 7) {
                                 return <div className="text-xs text-red-600 font-medium">⚠️ MCR NO. required (overdue)</div>;
                               } else if (daysSinceReceived >= 5) {
                                 return <div className="text-xs text-orange-600 font-medium">⚠️ MCR NO. due in {7 - daysSinceReceived} days</div>;
                               }
                               return null;
                             })()
                           )}
                         </div>
                       ) : (
                         <div className="px-3 py-2 text-sm text-muted-foreground">—</div>
                       )}
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-2">
                                                   <Checkbox
                            id={`chk-${row.id}`}
                            checked={row.receivedQty ? row.receivedQty > 0 : false}
                            disabled={row.receivedQty ? row.receivedQty > 0 : false}
                                                         onCheckedChange={async (checked) => {
                               if (row.receivedQty && row.receivedQty > 0) {
                                 // Item is already received, don't allow unchecking
                                 return;
                               }
                               
                               const receivedQty = checked ? (row.sentQty ?? row.quantity ?? 1) : 0;
                               const receivedAt = checked ? new Date().toISOString() : undefined;
                               
                               console.log(`Item ${row.id} - Received: ${checked}, receivedAt: ${receivedAt}, mrcNo: ${row.mrcNo || 'EMPTY'}`);
                               
                               // Update local state first
                               const updatedRows = rows.map(r => 
                                 r.id === row.id 
                                   ? { ...r, receivedQty, receivedAt, mrcNo: checked ? (r.mrcNo || '') : '' }
                                   : r
                               );
                               
                               setRows(updatedRows);
                               
                               // Immediately save to database and update status
                               if (checked) {
                                 try {
                                   // Save the updated items
                                   await updateRequest(request.id, { items: updatedRows });
                                   
                                   // Update status to mcr-needed
                                   await updateStatus(request.id, 'mcr-needed');
                                   
                                   console.log('Item marked as received and status updated to mcr-needed');
                                   toast.success('Item marked as received. MCR NO. is now required.');
                                 } catch (error) {
                                   console.error('Error saving received status:', error);
                                   toast.error('Failed to save received status');
                                 }
                               }
                             }}
                          />
                         <Label htmlFor={`chk-${row.id}`}>Received</Label>
                       </div>
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => setSendOpen(true)}>Received</Button>
        </DialogFooter>
      </DialogContent>

      {/* Send dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Received</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Confirm that all items have been received and processed.
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSendOpen(false)}>Cancel</Button>
            <Button onClick={onConfirmReceived}>Confirm Received</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
