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
        initReceived[it.id] = false;
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

  const handleToggle = (id: string, value: boolean) => {
    setReceivedMap((prev) => ({ ...prev, [id]: value }));
  };

  const handleSentQtyChange = (id: string, value: number) => {
    setSentQtyMap((prev) => ({ ...prev, [id]: value }));
  };

  const onConfirmReceived = async () => {
    // Update items with sent quantities
    const updatedItems = request.items.map((item) => ({
      ...item,
      sentQty: sentQtyMap[item.id] || 0,
    }));

    // Update the request with new sent quantities
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
      toast.error(`${missingItems.length} item(s) missing. Notification sent to Store Manager.`);
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
          <DialogTitle>Shipment Details (Mark Received)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Sl No</TableHead>
                  <TableHead>Item Desc</TableHead>
                  <TableHead className="w-32">Required Qty</TableHead>
                  <TableHead className="w-40">Approved Qty</TableHead>
                  <TableHead className="w-40">Sent Qty</TableHead>
                  <TableHead className="w-40">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {request.items.map((row, idx) => (
                  <TableRow key={row.id}>
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
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`chk-${row.id}`}
                          checked={!!receivedMap[row.id]}
                          onCheckedChange={(v) => handleToggle(row.id, Boolean(v))}
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
          <Button onClick={onConfirmReceived} disabled={request.items.length === 0}>Received</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
