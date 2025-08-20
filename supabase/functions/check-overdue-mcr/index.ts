import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OverdueMCRItem {
  id: string;
  title: string;
  requestedBy: string;
  requesterEmail: string | null;
  receivedAt: string;
  items: any[];
  zone: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Daily MCR overdue check started");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    
    console.log("Supabase URL:", supabaseUrl);
    console.log("Service Role Key exists:", !!supabaseServiceKey);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Fetching MRC requests with status 'mcr-needed'...");
    
    // Get MRC requests that need MCR NO. entry
    const { data: mrcRequests, error } = await supabase
      .from('material_requests')
      .select('*')
      .eq('request_type', 'MRC')
      .eq('status', 'mcr-needed');

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    console.log("MRC requests found:", mrcRequests?.length || 0);

    const overdueMCRs: OverdueMCRItem[] = [];
    const now = new Date();

    // Check each MRC request for overdue items
    for (const request of mrcRequests || []) {
      console.log("Processing request:", request.id, request.title);
      const items = request.items as any[];
      
      if (!items || items.length === 0) {
        console.log("No items found in this request");
        continue;
      }
      
      console.log(`Found ${items.length} items in request ${request.id}`);
      
      const overdueItems = items.filter((item: any) => {
        console.log("Checking item:", JSON.stringify(item, null, 2));
        console.log("Item receivedAt:", item.receivedAt);
        console.log("Item mrcNo:", item.mrcNo);
        
        if (!item.receivedAt || item.mrcNo) {
          console.log("Item skipped - no receivedAt or has mrcNo");
          return false;
        }
        
        const receivedDate = new Date(item.receivedAt);
        const daysSinceReceived = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log("Days since received:", daysSinceReceived);
        
        // Check if it's been 7 or more days AND it's a multiple of 7 (7, 14, 21, etc.)
        return daysSinceReceived >= 7 && daysSinceReceived % 7 === 0;
      });

      console.log("Overdue items in this request:", overdueItems.length);

      if (overdueItems.length > 0) {
        overdueMCRs.push({
          id: request.id,
          title: request.title,
          requestedBy: request.requested_by,
          requesterEmail: request.requester_email,
          receivedAt: request.created_at,
          items: overdueItems,
          zone: request.zone
        });
      }
    }

    console.log(`Found ${overdueMCRs.length} MRC requests with overdue items`);

    // Create in-app notifications for overdue items
    let notificationCount = 0;
    for (const overdueMCR of overdueMCRs) {
      for (const item of overdueMCR.items) {
        const receivedDate = new Date(item.receivedAt);
        const daysSinceReceived = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check if we should send notification (avoid duplicates)
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('*')
          .eq('data->>request_id', overdueMCR.id)
          .eq('data->>item_id', item.id)
          .eq('type', 'warning')
          .eq('created_at::date', now.toISOString().split('T')[0]) // Today's date
          .single();

        if (existingNotification) {
          console.log(`Notification already sent today for item ${item.id}`);
          continue;
        }

        // Create in-app notification for Store Managers
        try {
          // Get Store Manager user IDs for the zone
          const { data: storeManagers } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('department', 'store_manager')
            .eq('zone', overdueMCR.zone);

          if (storeManagers && storeManagers.length > 0) {
            for (const storeManager of storeManagers) {
              const notificationTitle = `MCR Number Required - ${daysSinceReceived} days overdue`;
              const notificationMessage = `Item "${item.description}" from request "${overdueMCR.title}" requires MCR number entry. Received ${daysSinceReceived} days ago.`;

              const { error: notificationError } = await supabase
                .from('notifications')
                .insert({
                  user_id: storeManager.id,
                  title: notificationTitle,
                  message: notificationMessage,
                  type: 'warning',
                  data: {
                    request_id: overdueMCR.id,
                    item_id: item.id,
                    days_overdue: daysSinceReceived,
                    request_title: overdueMCR.title,
                    item_description: item.description,
                    received_date: item.receivedAt,
                    zone: overdueMCR.zone
                  }
                });

              if (notificationError) {
                console.error("Error creating notification for user", storeManager.id, notificationError);
              } else {
                console.log(`In-app notification created for Store Manager: ${storeManager.email}`);
                notificationCount++;
              }
            }
          } else {
            console.log("No Store Managers found for zone:", overdueMCR.zone);
          }
        } catch (error) {
          console.error("Error creating in-app notification:", error);
        }
      }
    }

    const response = {
      ok: true,
      overdueCount: overdueMCRs.length,
      notificationsSent: notificationCount,
      message: `Found ${overdueMCRs.length} MRC requests with overdue items. Created ${notificationCount} notifications.`,
      debug: {
        totalMrcRequests: mrcRequests?.length || 0,
        processedRequests: mrcRequests?.length || 0,
        overdueRequests: overdueMCRs.length
      }
    };

    console.log("Daily MCR check completed:", response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("check-overdue-mcr error", error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(error?.message || error),
      message: "Failed to check overdue MCRs",
      debug: {
        errorType: error?.constructor?.name,
        errorMessage: error?.message
      }
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});