import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TELEGRAM_API = 'https://api.telegram.org';

async function sendTelegramMessage(botToken: string, chatId: string, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get admin chat ID
    const { data: setting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'telegram_admin_chat_id')
      .single();

    const adminChatId = setting?.value;
    if (!adminChatId) {
      return new Response(JSON.stringify({ error: 'Admin Telegram chat ID not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, data } = await req.json();

    let message = '';
    let replyMarkup: any = undefined;

    switch (type) {
      case 'signup':
        message = `🎉 <b>New User Signup!</b>\n\n👤 <b>Username:</b> ${data.username || 'N/A'}\n📧 <b>Email:</b> ${data.email}\n🕐 <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
        break;

      case 'deposit_request':
        message = `💰 <b>Deposit Request</b>\n\n👤 <b>User:</b> ${data.username || data.email}\n💵 <b>Amount:</b> ₹${data.amount}\n🆔 <b>Request ID:</b> <code>${data.request_id}</code>\n🕐 <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
        replyMarkup = {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: `approve_${data.request_id}` },
              { text: '❌ Reject', callback_data: `reject_${data.request_id}` },
            ],
          ],
        };
        break;

      case 'withdrawal':
        message = `🏧 <b>Withdrawal Request</b>\n\n👤 <b>User:</b> ${data.username || data.email}\n💵 <b>Amount:</b> ₹${data.amount}\n🕐 <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
        break;

      case 'referral':
        message = `🤝 <b>New Referral!</b>\n\n👤 <b>Referred by:</b> ${data.referrer}\n🆕 <b>New user:</b> ${data.new_user}\n💰 <b>Bonus:</b> ₹${data.bonus_amount || 50}\n🕐 <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
        break;

      case 'admin_login':
        message = `🔐 <b>Admin Login</b>\n\n👤 <b>Email:</b> ${data.email}\n🕐 <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
        break;

      default:
        message = `📢 <b>${data.title || 'Notification'}</b>\n\n${data.message || ''}`;
    }

    const result = await sendTelegramMessage(botToken, adminChatId, message, replyMarkup);

    // If deposit request, save the message ID for later reference
    if (type === 'deposit_request' && result.ok && data.request_id) {
      await supabase
        .from('deposit_requests')
        .update({ telegram_message_id: result.result.message_id })
        .eq('id', data.request_id);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Telegram notify error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
