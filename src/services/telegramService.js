
export const sendToTelegram = async (message, botToken, chatId, parseMode = 'HTML') => {
  if (!botToken || !chatId) {
    throw new Error("Telegram Bot Token or Chat ID not configured.");
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: parseMode,
    disable_web_page_preview: false
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Telegram API Error: ${errorData.description}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending to Telegram:", error);
    throw error;
  }
};
