import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftIcon, PackageIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterialRequests } from '@/hooks/useMaterialRequests';
import { format } from 'date-fns';

const Reports = () => {
  const navigate = useNavigate();
  const { requests, isLoading } = useMaterialRequests();
  
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
                    <TableHead>MRF NO</TableHead>
                    <TableHead>MIF NO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : flattenedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">No material requests found</TableCell>
                    </TableRow>
                  ) : (
                    flattenedItems.map((item, index) => (
                      <TableRow key={`${item.id}-${index}`}>
                        <TableCell>{item.requestedBy} ({item.displayId})</TableCell>
                        <TableCell>{format(new Date(item.createdAt), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>Data will be added later</TableCell>
                        <TableCell>Data will be added later</TableCell>
                        <TableCell>Data will be added later</TableCell>
                        <TableCell>Data will be added later</TableCell>
                        <TableCell>Data will be added later</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
                    <TableHead>MRC NO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Data will be added later</TableCell>
                    <TableCell>Data will be added later</TableCell>
                    <TableCell>Data will be added later</TableCell>
                    <TableCell>Data will be added later</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;