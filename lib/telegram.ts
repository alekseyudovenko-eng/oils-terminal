// lib/telegram.ts — DEBUG VERSION
export async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  console.log('🔍 Telegram debug:', {
    hasToken: !!token,
    hasChatId: !!chatId,
    tokenStart: token ? token.slice(0, 10) + '...' : 'MISSING',
    chatId: chatId
  });
  
  if (!token || !chatId) {
    console.error('❌ Missing Telegram credentials');
    return false;
  }
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    console.log('📤 Sending to Telegram:', url.replace(token, '***'));
    
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
    
    const responseData = await res.json();
    console.log('📥 Telegram response:', { 
      status: res.status, 
      ok: responseData.ok, 
      error: responseData.description 
    });
    
    if (!res.ok || !responseData.ok) {
      console.error('❌ Telegram API error:', responseData);
      return false;
    }
    
    console.log('✅ Message sent successfully');
    return true;
  } catch (e: any) {
    console.error('❌ Fetch error:', e.message || e);
    return false;
  }
}
