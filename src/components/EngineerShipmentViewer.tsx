import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MaterialRequest, useAppStore } from '@/store/appStore';
import { toast } from 'sonner';

interface EngineerShipmentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaterialRequest;
}

export default function EngineerShipmentViewer({ open, onOpenChange, request }: EngineerShipmentViewerProps) {
  const { updateStatus, updateRequest } = useAppStore();
  const [receivedMap, setReceivedMap] = useState<Record<string, boolean>>({});
  const [sentQtyMap, setSentQtyMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      const initReceived: Record<string, boolean> = {};
      const initSentQty: Record<string, number> = {};
      (request.items || []).forEach((it) => {
        // Check if item was already marked as received (has receivedQty or receivedAt)
        initReceived[it.id] = !!(it.receivedQty || it.receivedAt);
        initSentQty[it.id] = it.sentQty || 0;
      });
      setReceivedMap(initReceived);
      setSentQtyMap(initSentQty);
    }
  }, [open, request]);

  const allChecked = useMemo(
    () => Object.values(receivedMap).length > 0 && Object.values(receivedMap).every(Boolean),
    [receivedMap]
  );

  const someChecked = useMemo(
    () => Object.values(receivedMap).some(Boolean) && !allChecked,
    [receivedMap, allChecked]
  );

  const handleToggle = (id: string, value: boolean) => {
    setReceivedMap((prev) => ({ ...prev, [id]: value }));
  };

  const handleSentQtyChange = (id: string, value: number) => {
    setSentQtyMap((prev) => ({ ...prev, [id]: value }));
  };

  const onConfirmReceived = async () => {
    // Update items with sent quantities and received status
    const updatedItems = request.items.map((item) => ({
      ...item,
      sentQty: sentQtyMap[item.id] || 0,
      receivedQty: receivedMap[item.id] ? (sentQtyMap[item.id] || item.sentQty || 0) : 0,
      receivedAt: receivedMap[item.id] ? new Date().toISOString() : undefined,
    }));

    // Update the request with new sent quantities and received status
    await updateRequest(request.id, { items: updatedItems });

    const missingItems = request.items.filter((it) => !receivedMap[it.id]);

    if (missingItems.length > 0) {
      // Add automatic remarks for missing items so Store Manager can see
      const patchedItems = updatedItems.map((it) =>
        missingItems.find((m) => m.id === it.id)
          ? { ...it, remarks: it.remarks ? `${it.remarks} | Missing on receipt` : 'Missing on receipt' }
          : it
      );
      await updateRequest(request.id, { items: patchedItems });
      toast.error(`${missingItems.length} item(s) missing.`);
    } else {
      toast.success('All items received.');
    }

    // Mark ticket as delivered (received)
    await updateStatus(request.id, 'delivered');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Shipment Details (Mark Received)
            {request.items.some(item => item.receivedAt) && !request.items.every(item => item.receivedAt) && (
              <span className="ml-2 text-sm font-normal text-yellow-600">
                - Partially Delivered
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {request.items.every(item => item.receivedAt) && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="text-sm text-green-800 font-medium">
                ✅ All items have been received and processed
              </div>
            </div>
          )}
          {request.items.some(item => item.receivedAt) && !request.items.every(item => item.receivedAt) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="text-sm text-yellow-800 font-medium">
                ⚠️ Partially Delivered - Some items are missing
              </div>
            </div>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Sl No</TableHead>
                  <TableHead>Item Desc</TableHead>
                  <TableHead className="w-32">Required Qty</TableHead>
                  <TableHead className="w-40">Approved Qty</TableHead>
                  <TableHead className="w-40">Sent Qty</TableHead>
                  <TableHead className="w-40">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = someChecked;
                          }
                        }}
                        onCheckedChange={(checked) => {
                          const newReceivedMap: Record<string, boolean> = {};
                          request.items.forEach((item) => {
                            newReceivedMap[item.id] = !!checked;
                          });
                          setReceivedMap(newReceivedMap);
                        }}
                        disabled={request.items.every(item => item.receivedAt)} // Disable if all items already received
                      />
                      <Label htmlFor="select-all">Received</Label>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {request.items.map((row, idx) => (
                  <TableRow key={row.id} className={receivedMap[row.id] ? 'opacity-75 bg-muted/30' : ''}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.quantity ?? 0}</TableCell>
                    <TableCell>{row.approvedQty ?? '—'}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={sentQtyMap[row.id] || ''}
                        onChange={(e) => handleSentQtyChange(row.id, Number(e.target.value) || 0)}
                        className="w-20"
                        placeholder="0"
                        disabled={receivedMap[row.id]}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`chk-${row.id}`}
                          checked={!!receivedMap[row.id]}
                          onCheckedChange={(v) => handleToggle(row.id, Boolean(v))}
                          disabled={row.receivedAt} // Disable if already received in database
                        />
                        <Label htmlFor={`chk-${row.id}`}>
                          Received
                          {row.receivedAt && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({new Date(row.receivedAt).toLocaleDateString()})
                            </span>
                          )}
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button 
            onClick={onConfirmReceived} 
            disabled={request.items.length === 0 || request.items.every(item => item.receivedAt)}
          >
            Received
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
