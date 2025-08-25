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
import { format } from 'date-fns';

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

  // Check if the request is delivered (read-only mode)
  // For return requests, only delivered status should be read-only
  // In-transit requests should be editable so store manager can mark items as received
  const isReadOnly = request.status === 'delivered';

  // Update local state when request data changes
  useEffect(() => {
    if (open && request) {
      // Initialize rows with receivedQty set to sentQty by default if not already received
      const initializedRows = (request.items || []).map(item => {
        // If item is not yet received (no receivedAt timestamp), set receivedQty to sentQty for display
        // but don't mark as received (no receivedAt timestamp)
        if (!item.receivedAt && !item.receivedQty) {
          return {
            ...item,
            receivedQty: item.sentQty ?? item.quantity ?? 0
          };
        }
        return item;
      });
      
      setRows(initializedRows);
      setMode(request.transportMode as TransportMode | undefined);
      setEdt(request.edt ? new Date(request.edt) : undefined);
      setTracking(request.trackingNo || '');
      setCourierName(request.courierName || '');
    }
  }, [open, request]);

  const canSave = useMemo(() => true, []);

  // Check if all received items have MCR numbers entered
  const canMarkAsReceived = useMemo(() => {
    const receivedItems = rows.filter(row => row.receivedQty && row.receivedQty > 0);
    if (receivedItems.length === 0) return false; // No items received yet
    
    // Check if all received items have MCR numbers
    return receivedItems.every(item => item.mrcNo && item.mrcNo.trim() !== '');
  }, [rows]);

  const onChangeRow = (id: string, patch: Partial<MaterialItemRow>) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));

  const onConfirm = async () => {
    try {
      await updateRequest(request.id, { items: rows });
      toast.success('Updates saved.');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving updates:', error);
      toast.error('Failed to save updates');
    }
  };

  const onConfirmSend = async () => {
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
    
    try {
      // First save the updated items (what the Confirm button was doing)
      await updateRequest(request.id, { items: rows });
      
      // Then update transport details and mark as sent
      await updateRequest(request.id, {
        transportMode: mode,
        courierName: mode === 'Courier' ? courierName.trim() : undefined,
        edt: edt ? edt.toISOString() : undefined,
        trackingNo: tracking.trim() || undefined,
        sentAt: new Date().toISOString(),
      });
      await updateStatus(request.id, 'in-transit');
      toast.success('Request updated and marked as sent.');
      setSendOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    }
  };

  const onConfirmReceived = async () => {
    try {
      // Use the actual received quantities from the form
      await updateRequest(request.id, { 
        items: rows,
        receivedAt: new Date().toISOString() // Set the received date
      });
      await updateStatus(request.id, 'delivered');
      toast.success('Request marked as received.');
      setSendOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking as received:', error);
      toast.error('Failed to mark as received');
    }
  };

      return (
      <Dialog open={open} onOpenChange={async (isOpen) => {
        if (!isOpen && !isReadOnly) {
          // Save changes when closing (either via X button or Close button) only if not read-only
          try {
            await updateRequest(request.id, { items: rows });
          } catch (error) {
            console.error('Error saving changes on dialog close:', error);
            toast.error('Failed to save changes');
          }
        }
        onOpenChange(isOpen);
      }}>
      <DialogContent className="max-w-6xl">
                 <DialogHeader>
           <DialogTitle>
             Return Details
             {isReadOnly && <span className="text-sm font-normal text-muted-foreground ml-2">(Read Only)</span>}
           </DialogTitle>
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
                   <TableHead className="w-40">MRC Number</TableHead>
                   <TableHead className="w-40">
                     <div className="flex items-center gap-2">
                                               <Checkbox
                          id="select-all"
                          checked={rows.length > 0 && rows.every(row => row.receivedAt)}
                          disabled={isReadOnly || rows.some(row => row.receivedAt)}
                         onCheckedChange={async (checked) => {
                           const updatedRows = rows.map(row => ({
                             ...row,
                             receivedQty: checked ? (row.sentQty ?? row.quantity ?? 1) : 0,
                             receivedAt: checked ? new Date().toISOString() : undefined,
                             mrcNo: checked ? (row.mrcNo || '') : ''
                           }));
                           
                           setRows(updatedRows);
                           
                           if (checked) {
                             try {
                               await updateRequest(request.id, { items: updatedRows });
                               await updateStatus(request.id, 'mrc-needed');
                               toast.success('All items marked as received. MRC NO. is now required.');
                             } catch (error) {
                               console.error('Error saving received status:', error);
                               toast.error('Failed to save received status');
                             }
                           }
                         }}
                       />
                       <Label htmlFor="select-all">Received</Label>
                     </div>
                   </TableHead>
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
                       <Input
                         type="number"
                         min={0}
                         value={row.receivedQty ?? ''}
                         onChange={(e) => onChangeRow(row.id, { receivedQty: Number(e.target.value) })}
                         placeholder="0"
                         disabled={isReadOnly || !!row.receivedAt}
                       />
                     </TableCell>
                     <TableCell>
                       <div className="space-y-1">
                         <Input
                           value={row.mrcNo ?? ''}
                           onChange={(e) => onChangeRow(row.id, { mrcNo: e.target.value })}
                           placeholder="Enter MRC No."
                           className={row.receivedQty > 0 && !row.mrcNo ? 'border-orange-500' : ''}
                           disabled={isReadOnly}
                         />
                         {row.receivedAt && !row.mrcNo && (
                           (() => {
                             const daysSinceReceived = Math.floor((Date.now() - new Date(row.receivedAt).getTime()) / (1000 * 60 * 60 * 24));
                             if (daysSinceReceived >= 7) {
                               return <div className="text-xs text-red-600 font-medium">⚠️ MRC NO. required (overdue)</div>;
                             } else if (daysSinceReceived >= 5) {
                               return <div className="text-xs text-orange-600 font-medium">⚠️ MRC NO. due in {7 - daysSinceReceived} days</div>;
                             }
                             return null;
                           })()
                         )}
                       </div>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <Checkbox
                           id={`chk-${row.id}`}
                           checked={!!row.receivedAt}
                           disabled={isReadOnly || !!row.receivedAt}
                           onCheckedChange={async (checked) => {
                             const receivedQty = checked ? (row.sentQty ?? row.quantity ?? 1) : 0;
                             const receivedAt = checked ? new Date().toISOString() : undefined;
                             

                             
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
                                 
                                 // Update status to mrc-needed
                                 await updateStatus(request.id, 'mrc-needed');
                                 

                                 toast.success('Item marked as received. MRC NO. is now required.');
                               } catch (error) {
                                 console.error('Error saving received status:', error);
                                 toast.error('Failed to save received status');
                               }
                             }
                           }}
                         />
                         <Label htmlFor={`chk-${row.id}`}>
                           Received{row.receivedAt && ` (${format(new Date(row.receivedAt), 'dd/MM/yyyy')})`}
                         </Label>
                       </div>
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

                 <DialogFooter>
           {isReadOnly ? (
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <span>This return request is {request.status === 'delivered' ? 'completed' : 'in transit'} and cannot be modified.</span>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
             </div>
           ) : (
             <>
               <Button 
                 onClick={() => setSendOpen(true)} 
                 disabled={!canMarkAsReceived}
                 title={!canMarkAsReceived ? "Please enter MCR numbers for all received items before marking as received" : ""}
               >
                 Received
               </Button>
               {!canMarkAsReceived && (
                 <Button 
                   className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500" 
                   onClick={onConfirm}
                 >
                   Continue
                 </Button>
               )}
             </>
           )}
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
