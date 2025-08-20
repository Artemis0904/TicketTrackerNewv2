import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore, MaterialItemRow, UrgencyOption, SourceOption } from '@/store/appStore';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface MRFormDialogProps {
  trigger?: React.ReactNode;
}

type ZoneOption = 'North' | 'South' | 'North East' | 'Army' | 'General';

const defaultRows = (count = 5): MaterialItemRow[] =>
  Array.from({ length: count }).map((_, idx) => ({
    id: `row_${idx + 1}_${Math.random().toString(36).slice(2, 7)}`,
    description: '',
    quantity: 0,
    source: 'Store',
    urgency: 'Low',
  }));

export default function MRFormDialog({ trigger }: MRFormDialogProps) {
  const { addMaterialRequest, state } = useAppStore();
  const { user, zone: userZone } = useAuth();
  const [open, setOpen] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [zone, setZone] = useState<ZoneOption>((userZone as ZoneOption) || 'North');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<MaterialItemRow[]>(defaultRows());

  useEffect(() => {
    if (!open) {
      setTicketNumber('');
      setZone((userZone as ZoneOption) || 'North');
      setDescription('');
      setRows(defaultRows());
    }
  }, [open, userZone]);

  // Set zone when form opens or when userZone becomes available
  useEffect(() => {
    if (open) {
      setZone((userZone as ZoneOption) || 'North');
    }
  }, [open, userZone]);

  const canSubmit = useMemo(() => {
    const hasAny = rows.some(r => r.description.trim() && r.quantity > 0);
    return hasAny;
  }, [rows]);

  const onAddRow = () => setRows(prev => [...prev, ...defaultRows(1)]);
  const onDeleteRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));
  const onChangeRow = (id: string, patch: Partial<MaterialItemRow>) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));

  const onSubmit = async () => {
    const filtered = rows.filter(r => r.description.trim() && r.quantity > 0);
    if (filtered.length === 0) return;
    const reqTitle = ticketNumber.trim() ? `Ticket ${ticketNumber.trim()}` : `Material Request (${filtered.length} item${filtered.length > 1 ? 's' : ''})`;
    addMaterialRequest(reqTitle, filtered, { ticketNumber: ticketNumber.trim(), zone, description: description.trim(), requesterEmail: user?.email ?? undefined, requesterId: user?.id ?? undefined });
    toast.success('Material request submitted for review.');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : <Button className="gap-2">MR Form</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>New Material Request</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="ticket-number">Ticket Number</Label>
              <Input id="ticket-number" value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} placeholder="e.g., TKT-00123" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              <Select value={zone} onValueChange={(v) => setZone(v as ZoneOption)} disabled>
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
                    <TableHead className="w-10"></TableHead>
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
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={row.quantity || ''}
                          onChange={(e) => onChangeRow(row.id, { quantity: Number(e.target.value) })}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={row.source} onValueChange={(v) => onChangeRow(row.id, { source: v as SourceOption })}>
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
                        <Select value={row.urgency} onValueChange={(v) => onChangeRow(row.id, { urgency: v as UrgencyOption })}>
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
                        <Button variant="ghost" size="icon" onClick={() => onDeleteRow(row.id)} aria-label="Delete row">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mr-description">Description</Label>
                <Textarea
                  id="mr-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any additional details for this request"
                />
              </div>
              <div className="flex justify-between">
                <Button variant="secondary" onClick={onAddRow} className="gap-2">
                  <Plus className="h-4 w-4" /> Add row
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
