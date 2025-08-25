import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import EngineerLayout from '@/components/EngineerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, FileText, Clock, CheckCircle, Truck, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useAppStore } from '@/store/appStore';
import { useMaterialRequests } from '@/hooks/useMaterialRequests';
import { useAuth } from '@/hooks/useAuth';
import MRFormDialog from '@/components/MRFormDialog';
import MRCFormDialog from '@/components/MRCFormDialog';
import EngineerShipmentViewer from '@/components/EngineerShipmentViewer';
import EngineerRequestViewer from '@/components/EngineerRequestViewer';

const EngineerDashboard = () => {
  const navigate = useNavigate();
  const { state } = useAppStore();
  const { requests, isLoading } = useMaterialRequests();
  const { user } = useAuth();
  const [shipOpen, setShipOpen] = useState(false);
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Pagination state for each tab
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
  const [shipmentPage, setShipmentPage] = useState(1);

  // Filter requests for current user - ONLY MR requests (exclude MRC)
  const myRequests = requests.filter(r => r.requesterId === user?.id && r.requestType === 'MR');
  const myShipments = myRequests.filter((r) => (r.status === 'in-transit' || r.status === 'delivered'));
  
  // Filter requests for tabs
  const pendingRequests = myRequests.filter(r => r.status === 'pending');
  const approvedRequests = myRequests.filter(r => r.status === 'approved');

  // Pagination constants
  const ITEMS_PER_PAGE = 10;

  // Pagination functions
  const getPaginatedData = (data: any[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data: any[]) => {
    return Math.ceil(data.length / ITEMS_PER_PAGE);
  };

  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  // Paginated data
  const paginatedPendingRequests = getPaginatedData(pendingRequests, pendingPage);
  const paginatedApprovedRequests = getPaginatedData(approvedRequests, approvedPage);
  const paginatedShipments = getPaginatedData(myShipments, shipmentPage);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      'in-transit': 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      'partially-delivered': 'bg-yellow-100 text-yellow-800',
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

  const getActualStatus = (shipment: any) => {
    if (shipment.status === 'delivered') {
      const receivedItems = shipment.items.filter((item: any) => item.receivedAt);
      const totalItems = shipment.items.length;
      
      if (receivedItems.length === 0) {
        return { status: 'delivered', icon: <Package className="h-4 w-4 text-green-600" /> };
      } else if (receivedItems.length < totalItems) {
        return { status: 'partially-delivered', icon: <Package className="h-4 w-4 text-yellow-600" /> };
      } else {
        return { status: 'delivered', icon: <Package className="h-4 w-4 text-green-600" /> };
      }
    }
    return { status: shipment.status, icon: getStatusIcon(shipment.status) };
  };

  // Pagination component
  const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    totalItems 
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void; 
    totalItems: number;
  }) => {
    if (totalPages <= 1) return null;

    const pageNumbers = getPageNumbers(currentPage, totalPages);
    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) => (
              <div key={index}>
                {page === '...' ? (
                  <span className="px-2 py-1 text-sm text-muted-foreground">...</span>
                ) : (
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <EngineerLayout>
      <div className="space-y-6">
        {/* Header with MR Form Button */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Dashboard</h1>
              <p className="text-muted-foreground">Track your material requests and shipments</p>
            </div>
            <div className="flex gap-2">
              <MRFormDialog
                trigger={
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" /> MR Form
                  </Button>
                }
              />
              <MRCFormDialog
                trigger={
                  <Button variant="secondary" className="gap-2">
                    <Plus className="h-4 w-4" /> MRC Form
                  </Button>
                }
              />
            </div>
          </div>

        {/* My Tickets Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Material Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Requests ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approved Requests ({approvedRequests.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Raised</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">Loading requests...</TableCell>
                      </TableRow>
                    ) : paginatedPendingRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No pending requests found</TableCell>
                      </TableRow>
                    ) : paginatedPendingRequests.map((ticket) => (
                      <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedRequestId(ticket.id); setRequestOpen(true); }}>
                        <TableCell className="font-medium">
                          {ticket.seqId 
                            ? (ticket.requestType === 'MRC' ? `MRC-${ticket.seqId.toString().padStart(3, '0')}` : `MR-${ticket.seqId.toString().padStart(3, '0')}`)
                            : ticket.id.slice(-8)
                          }
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{ticket.title}</div>
                          </div>
                        </TableCell>
                        <TableCell>{ticket.items.reduce((sum, i) => sum + (i.quantity || 0), 0)} items</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(ticket.status)}
                            {getStatusBadge(ticket.status)}
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={pendingPage}
                  totalPages={getTotalPages(pendingRequests)}
                  onPageChange={setPendingPage}
                  totalItems={pendingRequests.length}
                />
              </TabsContent>

              <TabsContent value="approved" className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Raised</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">Loading requests...</TableCell>
                      </TableRow>
                    ) : paginatedApprovedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No approved requests found</TableCell>
                      </TableRow>
                    ) : paginatedApprovedRequests.map((ticket) => (
                      <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedRequestId(ticket.id); setRequestOpen(true); }}>
                        <TableCell className="font-medium">
                          {ticket.seqId 
                            ? (ticket.requestType === 'MRC' ? `MRC-${ticket.seqId.toString().padStart(3, '0')}` : `MR-${ticket.seqId.toString().padStart(3, '0')}`)
                            : ticket.id.slice(-8)
                          }
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{ticket.title}</div>
                          </div>
                        </TableCell>
                        <TableCell>{ticket.items.reduce((sum, i) => sum + (i.quantity || 0), 0)} items</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(ticket.status)}
                            {getStatusBadge(ticket.status)}
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination
                  currentPage={approvedPage}
                  totalPages={getTotalPages(approvedRequests)}
                  onPageChange={setApprovedPage}
                  totalItems={approvedRequests.length}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Shipment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              My Shipment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shipped Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Tracking Number</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">Loading shipments...</TableCell>
                  </TableRow>
                ) : paginatedShipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No shipments found</TableCell>
                  </TableRow>
                ) : paginatedShipments.map((shipment) => (
                  <TableRow key={shipment.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedShipId(shipment.id); setShipOpen(true); }}>
                    <TableCell className="font-medium">
                      {shipment.seqId 
                        ? `MR-${shipment.seqId.toString().padStart(3, '0')}`
                        : shipment.id.slice(-8)
                      }
                    </TableCell>
                    <TableCell>{shipment.title}</TableCell>
                    <TableCell>{shipment.items.reduce((sum, i) => sum + (i.quantity || 0), 0)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const actualStatus = getActualStatus(shipment);
                          return (
                            <>
                              {actualStatus.icon}
                              {getStatusBadge(actualStatus.status)}
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>{shipment.sentAt ? format(new Date(shipment.sentAt), 'MMM dd, yyyy') : '—'}</TableCell>
                    <TableCell>{shipment.edt ? format(new Date(shipment.edt), 'MMM dd, yyyy') : '—'}</TableCell>
                    <TableCell className="font-mono text-sm">{shipment.trackingNo || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              currentPage={shipmentPage}
              totalPages={getTotalPages(myShipments)}
              onPageChange={setShipmentPage}
              totalItems={myShipments.length}
            />
          </CardContent>
        </Card>
        {selectedShipId && (
          <EngineerShipmentViewer
            open={shipOpen}
            onOpenChange={(o) => { setShipOpen(o); if (!o) setSelectedShipId(null); }}
            request={requests.find(r => r.id === selectedShipId)!}
          />
        )}
        {selectedRequestId && (
          <EngineerRequestViewer
            open={requestOpen}
            onOpenChange={(o) => { setRequestOpen(o); if (!o) setSelectedRequestId(null); }}
            request={requests.find(r => r.id === selectedRequestId)!}
          />
        )}
      </div>
    </EngineerLayout>
  );
};

export default EngineerDashboard;
