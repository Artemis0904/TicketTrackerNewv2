import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftIcon, PackageIcon, RotateCcwIcon, ChevronLeft, ChevronRight, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterialRequests } from '@/hooks/useMaterialRequests';
import { format } from 'date-fns';
import { useState } from 'react';

const Reports = () => {
  const navigate = useNavigate();
  const { requests, isLoading, refreshRequests } = useMaterialRequests();
  
  // Pagination state for each tab
  const [mrPage, setMrPage] = useState(1);
  const [mrcPage, setMrcPage] = useState(1);
  
  // Filter for regular material requests (not MRC) and flatten into individual items
  const materialRequests = requests.filter(r => r.requestType !== 'MRC');
  
  // Flatten requests into individual items
  const flattenedItems = materialRequests.flatMap(request => 
    request.items.map(item => ({
      ...request,
      currentItem: item,
      // Generate display ID based on seqId or fallback to request ID
      displayId: request.seqId 
        ? `MR-${request.seqId.toString().padStart(3, '0')}`
        : request.id.slice(-8)
    }))
  );

  // Filter for MRC requests
  const mrcRequests = requests.filter(r => r.requestType === 'MRC');

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
  const paginatedFlattenedItems = getPaginatedData(flattenedItems, mrPage);
  const paginatedMrcRequests = getPaginatedData(mrcRequests, mrcPage);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/store-manager/dashboard')}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics and insights for material request management.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshRequests}
          disabled={isLoading}
          className="ml-auto"
        >
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Tabs for different report types */}
      <Tabs defaultValue="mr-reports" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mr-reports" className="flex items-center gap-2">
            <PackageIcon className="h-4 w-4" />
            MR Reports
          </TabsTrigger>
          <TabsTrigger value="mrc-reports" className="flex items-center gap-2">
            <RotateCcwIcon className="h-4 w-4" />
            MRC Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mr-reports">
          <Card>
            <CardHeader>
              <CardTitle>Material Request Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request Raised By</TableHead>
                    <TableHead>Raised Date</TableHead>
                    <TableHead>Approved Date</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Received Date</TableHead>
                    <TableHead>Sent by transport</TableHead>
                    <TableHead>MRF NO</TableHead>
                    <TableHead>MIF NO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : paginatedFlattenedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">No material requests found</TableCell>
                    </TableRow>
                  ) : (
                    paginatedFlattenedItems.map((item, index) => (
                      <TableRow key={`${item.id}-${index}`}>
                        <TableCell>{item.requestedBy} ({item.displayId})</TableCell>
                        <TableCell>{format(new Date(item.createdAt), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{item.approvedAt ? format(new Date(item.approvedAt), 'MMM dd, yyyy') : '—'}</TableCell>
                        <TableCell>{item.sentAt ? format(new Date(item.sentAt), 'MMM dd, yyyy') : '—'}</TableCell>
                        <TableCell>{item.currentItem.receivedAt ? format(new Date(item.currentItem.receivedAt), 'MMM dd, yyyy') : '—'}</TableCell>
                        <TableCell>
                          {(() => {
                            const transportMode = item.transportMode || item.currentItem.transportModeRow;
                            if (!transportMode) return '—';
                            if (transportMode === 'Courier' && item.courierName) {
                              return `Courier (${item.courierName})`;
                            }
                            return transportMode;
                          })()}
                        </TableCell>
                        <TableCell>{item.currentItem.mrfNo || '—'}</TableCell>
                        <TableCell>{item.currentItem.mifNo || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <Pagination
                currentPage={mrPage}
                totalPages={getTotalPages(flattenedItems)}
                onPageChange={setMrPage}
                totalItems={flattenedItems.length}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mrc-reports">
          <Card>
            <CardHeader>
              <CardTitle>Material Return Request Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sent By</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Received Date</TableHead>
                    <TableHead>Sent by transport</TableHead>
                    <TableHead>MRC NO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : paginatedMrcRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No MRC requests found</TableCell>
                    </TableRow>
                  ) : (
                    paginatedMrcRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.requestedBy}</TableCell>
                        <TableCell>{format(new Date(request.createdAt), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{request.receivedAt ? format(new Date(request.receivedAt), 'MMM dd, yyyy') : '—'}</TableCell>
                        <TableCell>
                          {(() => {
                            const transportMode = request.transportMode;
                            if (!transportMode) return '—';
                            if (transportMode === 'Courier' && request.courierName) {
                              return `Courier (${request.courierName})`;
                            }
                            return transportMode;
                          })()}
                        </TableCell>
                        <TableCell>
                          {request.seqId 
                            ? `MRC-${request.seqId.toString().padStart(3, '0')}`
                            : request.id.slice(-8)
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <Pagination
                currentPage={mrcPage}
                totalPages={getTotalPages(mrcRequests)}
                onPageChange={setMrcPage}
                totalItems={mrcRequests.length}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;