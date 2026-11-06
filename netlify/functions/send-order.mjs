// Netlify Function: securely forwards SUSHI MIR orders to Telegram.
// Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Netlify environment variables.
export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" }
    });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return new Response(JSON.stringify({ error: "Telegram bot is not configured on the server." }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  let data;
  try { data = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  const clean = (v, max = 500) => String(v ?? "").trim().slice(0, max);
  const name = clean(data["Ім’я"], 100);
  const phone = clean(data["Телефон"], 50);
  const telegram = clean(data["Telegram"], 100) || "Не вказано";
  const pickup = clean(data["Отримання"], 50);
  const comment = clean(data["Коментар"], 1000) || "Без коментаря";
  const items = Array.isArray(data.items) ? data.items.slice(0, 50) : [];

  if (!name || !phone || !items.length) {
    return new Response(JSON.stringify({ error: "Заповни ім’я, телефон та додай товари." }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  const itemLines = items.map(item => {
    const itemName = clean(item.name, 100);
    const quantity = Math.max(1, Math.min(99, Number(item.quantity) || 1));
    const price = Math.max(0, Number(item.price) || 0);
    return `• ${itemName} × ${quantity} — ${(price * quantity).toLocaleString("uk-UA")} грн`;
  }).join("\n");

  const total = items.reduce((sum, item) =>
    sum + Math.max(0, Number(item.price) || 0) * Math.max(1, Math.min(99, Number(item.quantity) || 1)), 0);

  const message =
`🍣 <b>SUSHI MIR — НОВЕ ЗАМОВЛЕННЯ</b>

👤 <b>Клієнт:</b> ${escapeHtml(name)}
📞 <b>Телефон:</b> ${escapeHtml(phone)}
✈️ <b>Telegram:</b> ${escapeHtml(telegram)}

🛍 <b>Замовлення:</b>
${itemLines}

🥡 <b>Отримання:</b> ${escapeHtml(pickup || "Не вказано")}
💬 <b>Коментар:</b> ${escapeHtml(comment)}

💰 <b>РАЗОМ: ${total.toLocaleString("uk-UA")} грн</b>`;

  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });

  const result = await telegramResponse.json().catch(() => ({}));
  if (!telegramResponse.ok || !result.ok) {
    return new Response(JSON.stringify({ error: "Telegram не прийняв повідомлення. Перевір токен і Chat ID." }), {
      status: 502, headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { "Content-Type": "application/json" }
  });
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
