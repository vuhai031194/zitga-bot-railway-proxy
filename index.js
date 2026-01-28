const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();
app.use(express.json());

// Khởi tạo Discord Client
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Hàm xử lý chung để thực thi lệnh
app.post('/execute', async (req, res) => {
    const { action, token, channelId, threadId, name, content } = req.body;

    try {
        // Đăng nhập bot theo token được gửi từ GAS (linh hoạt cho nhiều bot)
        const tempClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
        await tempClient.login(token);

        if (action === 'createThread') {
            const channel = await tempClient.channels.fetch(channelId);
            const thread = await channel.threads.create({
                name: name || 'New Thread',
                autoArchiveDuration: 1440,
                type: 11
            });
            await tempClient.destroy();
            return res.json({ success: true, threadId: thread.id });
        }

        if (action === 'sendMessage') {
            const targetId = threadId || channelId;
            const channel = await tempClient.channels.fetch(targetId);
            const message = await channel.send(content);
            await tempClient.destroy();
            return res.json({ success: true, messageId: message.id });
        }

        res.status(400).json({ error: 'Action không hợp lệ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bridge API đang chạy tại cổng ${PORT}`));