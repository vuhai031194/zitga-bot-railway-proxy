const express = require('express');
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
const app = express();
app.use(express.json());

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Cache đơn giản để lưu Thread ID theo ngày (để đỡ phải query Discord nhiều)
// Trong thực tế nếu deploy lại sẽ mất cache, Railway sẽ tự fetch lại hoặc tạo mới.
const threadCache = new Map();

client.once('ready', () => {
  console.log(`✅ Discord Bridge Ready: ${client.user.tag}`);
});

app.post('/execute', async (req, res) => {
  const { action, token, channelId, data } = req.body;

  try {
    // 1. Kiểm tra hành động
    if (action === 'flushTask') {
      const channel = await client.channels.fetch(channelId);
      
      // 2. Xử lý Daily Thread ID
      const eventDateStr = data.eventDateStr; // yyyy-MM-dd gửi từ GAS
      let threadId = threadCache.get(eventDateStr);

      if (!threadId) {
        // Tìm hoặc Tạo Thread mới
        threadId = await getOrCreateThread(channel, eventDateStr);
        threadCache.set(eventDateStr, threadId);
      }

      // 3. Gửi Embed vào Thread
      const thread = await client.channels.fetch(threadId);
      await thread.send({ embeds: [data.embed] });

      return res.json({ success: true, threadId });
    }

    res.status(400).json({ error: 'Action not supported' });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Hàm tìm hoặc tạo Daily Thread
async function getOrCreateThread(channel, dateStr) {
  const threadName = `Daily Log ${dateStr}`;
  
  // Thử tìm trong các thread đang hoạt động
  const activeThreads = await channel.threads.fetchActive();
  const existing = activeThreads.threads.find(t => t.name === threadName);
  if (existing) return existing.id;

  // Nếu không thấy, tạo message mồi và tạo thread
  const starterMsg = await channel.send(`📌 **Daily Task Log** — ${dateStr}\nAll updates for this day in this thread.`);
  const thread = await starterMsg.startThread({
    name: threadName,
    autoArchiveDuration: 1440,
  });
  
  return thread.id;
}

const PORT = process.env.PORT || 3000;
client.login(process.env.DISCORD_TOKEN).then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});