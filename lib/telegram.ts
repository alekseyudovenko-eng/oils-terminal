// lib/telegram.ts
export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.error('❌ Missing Telegram credentials');
    return false;
  }
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    
    const data = await res.json();
    if (!data.ok) {
      console.error('❌ Telegram API error:', data);
      return false;
    }
    console.log('✅ Telegram message sent');
    return true;
  } catch (e) {
    console.error('❌ Failed to send Telegram message:', e);
    return false;
  }
}
