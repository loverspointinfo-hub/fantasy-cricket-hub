import { supabase } from "@/integrations/supabase/client";

export const sendTelegramNotification = async (
  type: 'signup' | 'deposit_request' | 'withdrawal' | 'referral' | 'admin_login' | 'kyc_submitted' | 'kyc_review',
  data: Record<string, any>
) => {
  try {
    await supabase.functions.invoke('telegram-notify', {
      body: { type, data },
    });
  } catch (err) {
    console.error('Telegram notification failed:', err);
  }
};
