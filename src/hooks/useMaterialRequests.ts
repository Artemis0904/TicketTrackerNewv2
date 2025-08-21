import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MaterialRequest } from '@/store/appStore';
import { useAuth } from './useAuth';

export function useMaterialRequests() {
  const { user, department } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['material-requests'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('material_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((item): MaterialRequest => ({
        id: item.id,
        seqId: item.seq_id || undefined,
        title: item.title,
        items: (item.items as any) || [],
        requestedBy: item.requested_by,
        requesterEmail: item.requester_email || undefined,
        requesterId: item.requester_id || undefined,
        createdAt: item.created_at,
        status: item.status as any,
        requestType: (item.request_type as 'MR' | 'MRC') || 'MR', // Map request_type field
        ticketNumber: item.ticket_number || undefined,
        zone: item.zone || undefined,
        description: item.description || undefined,
        transportMode: (item.transport_mode as any) || undefined,
        edt: item.edt || undefined,
        trackingNo: item.tracking_no || undefined,
        sentAt: item.sent_at || undefined,
      }));
    },
    enabled: !!user,
  });

  const deleteRequest = async (id: string) => {
    if (department !== 'regional_manager') {
      throw new Error('Only regional managers can delete requests');
    }

    const { error } = await supabase
      .from('material_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['material-requests'] });
  };

  const updateRequest = async (id: string, updates: Partial<MaterialRequest>) => {
    const { error } = await supabase
      .from('material_requests')
      .update({
        items: updates.items,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['material-requests'] });
  };

  return {
    requests,
    isLoading,
    error,
    deleteRequest,
    updateRequest,
    refreshRequests: () => queryClient.invalidateQueries({ queryKey: ['material-requests'] }),
  };
}