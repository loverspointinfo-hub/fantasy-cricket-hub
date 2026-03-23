import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_API = 'https://api.telegram.org';

Deno.serve(async (req) => {
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

    // Poll for updates
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeout: 0, allowed_updates: ['message', 'callback_query'] }),
    });

    const data = await res.json();
    if (!data.ok) {
      return new Response(JSON.stringify({ error: 'Telegram API error', data }), { status: 502 });
    }

    const updates = data.result || [];
    let processed = 0;

    for (const update of updates) {
      // Handle /start command to register admin chat ID
      if (update.message?.text === '/start') {
        const chatId = String(update.message.chat.id);
        await supabase
          .from('site_settings')
          .update({ value: chatId })
          .eq('key', 'telegram_admin_chat_id');

        await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '✅ <b>Admin Bot Connected!</b>\n\nYou will now receive notifications for:\n• 🎉 New signups\n• 💰 Deposit requests\n• 🏧 Withdrawals\n• 🤝 Referrals\n• 🔐 Admin logins\n\nYou can approve/reject deposits directly from here!',
            parse_mode: 'HTML',
          }),
        });
        processed++;
        continue;
      }

      // Handle callback queries (deposit approval/rejection)
      if (update.callback_query) {
        const callbackData = update.callback_query.data;
        const chatId = String(update.callback_query.message.chat.id);
        const messageId = update.callback_query.message.message_id;

        if (callbackData.startsWith('approve_') || callbackData.startsWith('reject_')) {
          const isApprove = callbackData.startsWith('approve_');
          const requestId = callbackData.replace('approve_', '').replace('reject_', '');

          // Get deposit request
          const { data: request } = await supabase
            .from('deposit_requests')
            .select('*')
            .eq('id', requestId)
            .single();

          if (!request) {
            await answerCallback(botToken, update.callback_query.id, '❌ Request not found');
            continue;
          }

          if (request.status !== 'pending') {
            await answerCallback(botToken, update.callback_query.id, `Already ${request.status}`);
            continue;
          }

          if (isApprove) {
            const { data: wallet } = await supabase
              .from('wallets')
              .select('deposit_balance')
              .eq('user_id', request.user_id)
              .single();

            if (wallet) {
              await supabase
                .from('wallets')
                .update({ 
                  deposit_balance: (wallet.deposit_balance || 0) + request.amount,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', request.user_id);

              await supabase.from('transactions').insert({
                user_id: request.user_id,
                type: 'deposit',
                amount: request.amount,
                description: 'Deposit approved by admin',
                status: 'completed',
                reference_id: requestId,
              });
            }

            await supabase
              .from('deposit_requests')
              .update({ status: 'approved', updated_at: new Date().toISOString() })
              .eq('id', requestId);

            await editMessage(botToken, chatId, messageId, 
              update.callback_query.message.text + '\n\n✅ <b>APPROVED</b> by admin');
            await answerCallback(botToken, update.callback_query.id, '✅ Deposit Approved!');
          } else {
            await supabase
              .from('deposit_requests')
              .update({ status: 'rejected', updated_at: new Date().toISOString() })
              .eq('id', requestId);

            await editMessage(botToken, chatId, messageId,
              update.callback_query.message.text + '\n\n❌ <b>REJECTED</b> by admin');
            await answerCallback(botToken, update.callback_query.id, '❌ Deposit Rejected');
          }

          processed++;
        }

        // Handle KYC approval/rejection
        if (callbackData.startsWith('kyc_approve_') || callbackData.startsWith('kyc_reject_')) {
          const isApprove = callbackData.startsWith('kyc_approve_');
          const kycId = callbackData.replace('kyc_approve_', '').replace('kyc_reject_', '');

          const { data: kycDoc } = await supabase
            .from('kyc_documents')
            .select('*')
            .eq('id', kycId)
            .single();

          if (!kycDoc) {
            await answerCallback(botToken, update.callback_query.id, '❌ KYC not found');
            continue;
          }

          if (kycDoc.status !== 'pending') {
            await answerCallback(botToken, update.callback_query.id, `Already ${kycDoc.status}`);
            continue;
          }

          const newStatus = isApprove ? 'verified' : 'rejected';

          // Update KYC document
          await supabase
            .from('kyc_documents')
            .update({ 
              status: newStatus, 
              reviewed_at: new Date().toISOString(),
              admin_note: isApprove ? 'Approved via Telegram' : 'Rejected via Telegram'
            })
            .eq('id', kycId);

          // Update profile kyc_status
          await supabase
            .from('profiles')
            .update({ kyc_status: newStatus })
            .eq('id', kycDoc.user_id);

          const statusEmoji = isApprove ? '✅' : '❌';
          const statusText = isApprove ? 'VERIFIED' : 'REJECTED';

          await editMessage(botToken, chatId, messageId,
            update.callback_query.message.text + `\n\n${statusEmoji} <b>${statusText}</b> by admin via Telegram`);
          await answerCallback(botToken, update.callback_query.id, `${statusEmoji} KYC ${statusText}!`);

          processed++;
        }
      }
    }

    // Acknowledge processed updates
    if (updates.length > 0) {
      const maxUpdateId = Math.max(...updates.map((u: any) => u.update_id));
      await fetch(`${TELEGRAM_API}/bot${botToken}/getUpdates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset: maxUpdateId + 1, timeout: 0 }),
      });
    }

    return new Response(JSON.stringify({ ok: true, processed, total: updates.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Telegram poll error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function answerCallback(botToken: string, callbackId: string, text: string) {
  await fetch(`${TELEGRAM_API}/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

async function editMessage(botToken: string, chatId: string, messageId: number, text: string) {
  await fetch(`${TELEGRAM_API}/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }),
  });
}
