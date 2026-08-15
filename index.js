const { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionFlagsBits, 
    ChannelType, 
    AttachmentBuilder, 
    REST, 
    Routes,
    AuditLogEvent
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const { joinVoiceChannel } = require('@discordjs/voice');
require('dotenv').config();

const MY_CLIENT_ID = "1491071700715048970"; 
const MY_CLIENT_SECRET = process.env.CLIENT_SECRET || "_I2W0duhYviJuoJqMBy6MT3VLrWE4aur"; 
const MY_REDIRECT_URI = "https://void-project-d59p.onrender.com/callback";
const MOD_ROLE_ID = "1537938887509278871"; 
const OWNER_ID = "345821033414262794"; 

const GROK_API_KEY = process.env.GROK_API_KEY;

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Void Bot aktif!'));

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const logChannel = client.channels.cache.find(c => c.name === 'yetkilendirenler') || client.channels.cache.get("1537947423710912694");

    if (code) {
        try {
            const data = new URLSearchParams({ 
                client_id: MY_CLIENT_ID, client_secret: MY_CLIENT_SECRET, grant_type: 'authorization_code', code: code, redirect_uri: MY_REDIRECT_URI 
            });

            const tokenRes = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', body: data, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
            const tokenData = await tokenRes.json();

            if (tokenData.access_token) {
                const userRes = await fetch('https://discord.com/api/users/@me', { headers: { authorization: `Bearer ${tokenData.access_token}` } });
                const userData = await userRes.json();
                
                if (logChannel) {
                    const embed = new EmbedBuilder().setTitle('Void | Hesaba Yetki Verildi!').setDescription(`Yetki Veren Kullanıcı: <@${userData.id}> (\`${userData.username}\`)`).setColor('#5865F2').setTimestamp();
                    logChannel.send({ embeds: [embed] }).catch(()=>{});
                }
            }
        } catch (err) { console.error("OAuth Hatası:", err); }
    } else {
        if (logChannel) logChannel.send({ embeds: [new EmbedBuilder().setTitle('Void | Yetkilendirme Başarılı').setDescription('Biri uygulamayı yetkilendirdi.').setColor('#5865F2').setTimestamp()] }).catch(()=>{});
    }
    res.send('Void uygulamasını başarıyla yetkilendirdiniz! Bu pencereyi kapatabilirsiniz.');
});

app.listen(PORT, () => console.log(`[WEB] Sunucu ${PORT} portunda çalışıyor.`));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }).catch(err => console.error(err));
const Blacklist = mongoose.models.Blacklist || mongoose.model('Blacklist', new mongoose.Schema({ userId: String, expiresAt: Date }));
const AiChannel = mongoose.models.AiChannel || mongoose.model('AiChannel', new mongoose.Schema({ guildId: String, channelId: String }));

const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration 
    ] 
});

client.commands = new Collection();
client.textCommands = new Collection();
const slashCommandsData = [
    { name: 'Türkçeye Çevir', type: 3, integration_types: [0, 1], contexts: [0, 1, 2] },
    { name: 'İngilizceye Çevir', type: 3, integration_types: [0, 1], contexts: [0, 1, 2] }
];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command && command.data.name) { 
        client.commands.set(command.data.name, command); 
        slashCommandsData.push(command.data.toJSON()); 
    }
    if ('name' in command && 'executeText' in command) {
        client.textCommands.set(command.name, command);
    }
}

global.activeTokens = new Map();

client.once('ready', async () => {
    console.log(`[+] Bot aktif: ${client.user.tag}`);
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommandsData });
    } catch (error) { console.error(error); }
});

// MODERASYON LOGLARI
client.on('guildBanAdd', async ban => {
    const logChannel = ban.guild.channels.cache.find(c => c.name === 'ban');
    if (!logChannel) return;
    let executor = "Bilinmiyor";
    let reason = ban.reason || "Belirtilmedi";
    try {
        const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd });
        const banLog = auditLogs.entries.first();
        if (banLog && banLog.target.id === ban.user.id) {
            executor = banLog.executor.tag;
            if (banLog.reason) reason = banLog.reason;
        }
    } catch (e) {}
    const embed = new EmbedBuilder().setTitle('🔨 Kullanıcı Yasaklandı!').setColor('#ff0000').addFields({ name: 'Kullanıcı', value: `${ban.user.tag}`, inline: true }, { name: 'Yetkili', value: `${executor}`, inline: true }, { name: 'Sebep', value: `${reason}`, inline: false }).setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(()=>{});
});

client.on('guildBanRemove', async ban => {
    const logChannel = ban.guild.channels.cache.find(c => c.name === 'unban');
    if (!logChannel) return;
    let executor = "Bilinmiyor";
    try {
        const auditLogs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanRemove });
        const unbanLog = auditLogs.entries.first();
        if (unbanLog && unbanLog.target.id === ban.user.id) executor = unbanLog.executor.tag;
    } catch (e) {}
    const embed = new EmbedBuilder().setTitle('🔓 Yasak Kaldırıldı!').setColor('#00ff00').addFields({ name: 'Kullanıcı', value: `${ban.user.tag}`, inline: true }, { name: 'Yetkili', value: `${executor}`, inline: true }).setTimestamp();
    logChannel.send({ embeds: [embed] }).catch(()=>{});
});

client.on('guildMemberRemove', async member => {
    let isKick = false;
    let executor = "Bilinmiyor";
    let reason = "Belirtilmedi";
    try {
        const auditLogs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberKick });
        const kickLog = auditLogs.entries.first();
        if (kickLog && kickLog.target.id === member.id && kickLog.createdAt > Date.now() - 5000) {
            isKick = true;
            executor = kickLog.executor.tag;
            if (kickLog.reason) reason = kickLog.reason;
        }
    } catch(e) {}

    if (isKick) {
        const logChannel = member.guild.channels.cache.find(c => c.name === 'kick');
        if (logChannel) {
            const embed = new EmbedBuilder().setTitle('🥾 Kullanıcı Atıldı!').setColor('#ffa500').addFields({ name: 'Kullanıcı', value: `${member.user.tag}`, inline: true }, { name: 'Yetkili', value: `${executor}`, inline: true }, { name: 'Sebep', value: `${reason}`, inline: false }).setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(()=>{});
        }
    } else {
        const leaveLogCh = member.guild.channels.cache.find(c => c.name === 'log') || member.guild.channels.cache.get("1537947723708506153");
        if (leaveLogCh) {
            const embed = new EmbedBuilder().setTitle('Üye Ayrıldı!').setDescription(`Kullanıcı: \`${member.user.tag}\``).setColor('#ff0000').setTimestamp();
            leaveLogCh.send({ embeds: [embed] }).catch(()=>{});
        }
    }
});

client.on('guildMemberAdd', async member => {
    const logCh = member.guild.channels.cache.find(c => c.name === 'log') || member.guild.channels.cache.get("1537947626937262203");
    if (logCh) {
        const embed = new EmbedBuilder().setTitle('Yeni Üye Katıldı!').setDescription(`Kullanıcı: ${member}`).setColor('#00ff00').setTimestamp();
        logCh.send({ embeds: [embed] }).catch(()=>{});
    }
});

// MESAJ İŞLEYİCİSİ
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // GROK AI KONTROLÜ (Doğru API adresi ve grok-4.6 modeli)
    const isAiChannel = await AiChannel.findOne({ channelId: message.channel.id });
    if (isAiChannel && !message.content.startsWith('v!') && !message.content.startsWith('v')) {
        await message.channel.sendTyping();
        try {
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: "grok-4.6", 
                    messages: [
                        { role: "system", content: "Senin adın Void AI. Yazılımdan ve kodlamadan çok iyi anlayan samimi ve kanka diyerek konuşabilen bir yapay zekasın. Yaratıcın Umut'tur." },
                        { role: "user", content: message.content }
                    ]
                })
            });

            const data = await response.json();
            if (data.choices && data.choices[0]) {
                const reply = data.choices[0].message.content;
                if (reply.length > 2000) {
                    const chunks = reply.match(/[\s\S]{1,1950}/g) || [];
                    for (const chunk of chunks) { await message.channel.send(chunk); }
                } else {
                    await message.reply(reply);
                }
            } else {
                await message.reply('Kanka serviste yoğunluk var, tekrar dene.');
            }
        } catch (err) {
            console.error("Grok API Hatası:", err);
            await message.reply('Bağlantı hatası oluştu.');
        }
        return; 
    }

    let prefix = '';
    if (message.content.toLowerCase().startsWith('v!')) prefix = 'v!';
    else if (message.content.toLowerCase().startsWith('v')) prefix = 'v';
    
    if (!prefix) return; 

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const isOwner = message.author.id === OWNER_ID;
    const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
    const hasModRole = message.member?.roles.cache.has(MOD_ROLE_ID);

    if (commandName === 'sesebaglan' || commandName === 'sesgir') {
        if (!isOwner && !isAdmin && !hasModRole) return;
        const channelId = args[0];
        if (!channelId) return message.reply('Lütfen ses kanal IDsi girin.');
        const channel = message.guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildVoice) return message.reply('Geçersiz kanal.');
        try {
            joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator, selfDeaf: true, selfMute: true });
            return message.reply(`Başarıyla <#${channel.id}> kanalına bağlandı.`);
        } catch (e) { return message.reply('Bağlantı hatası.'); }
    }

    const command = client.textCommands.get(commandName);
    if (!command) return;

    const publicCommands = ['hesap', 'ses', 'kurallar', 'ticket', 'afk', 'spam', 'boost', 'dm', 'ceviri', 'cevirici', 'ai']; 
    if (!publicCommands.includes(commandName)) {
        if (!isOwner && !isAdmin && !hasModRole) {
            return message.reply({ content: `⛔ Bu komutu kullanma yetkiniz yok.` }).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
        }
    }

    const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
    if (!isOwner && isBlacklisted && (!isBlacklisted.expiresAt || isBlacklisted.expiresAt > new Date())) return;
    
    try { await command.executeText(message, args); } catch (e) { console.error(e); }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isMessageContextMenuCommand()) {
        if (interaction.commandName === 'Türkçeye Çevir' || interaction.commandName === 'İngilizceye Çevir') {
            await interaction.deferReply({ flags: 64 }).catch(()=>{});
            const text = interaction.targetMessage.content;
            if (!text) return interaction.editReply('Metin bulunamadı.');
            const targetLang = interaction.commandName === 'Türkçeye Çevir' ? 'tr' : 'en';
            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
                const res = await fetch(url);
                const data = await res.json();
                let translated = '';
                data[0].forEach(item => { if (item[0]) translated += item[0]; });
                await interaction.editReply(`**Çeviri:**\n${translated}`);
            } catch (e) { await interaction.editReply('Çeviri hatası.'); }
            return;
        }
    }

    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
        const id = interaction.customId;
        if (['btn_hesap_panel', 'tk_gor', 'tk_ekle', 'tk_sil', 'modal_tk_ekle'].includes(id)) {
            const cmd = client.textCommands.get('hesap');
            if (cmd && cmd.handleInteraction) return cmd.handleInteraction(interaction);
        }
        if (['btn_ses_panel', 'tk_ses_sok_hepsi', 'tk_ses_sok_sec', 'tk_ses_cikar_hepsi', 'tk_ses_cikar_sec', 'select_ses_sok', 'select_ses_cikar', 'modal_sese_sok'].includes(id)) {
            const cmd = client.textCommands.get('ses');
            if (cmd && cmd.handleInteraction) return cmd.handleInteraction(interaction);
        }
        if (['btn_afk_ac', 'afk_baslat', 'afk_durdur'].includes(id)) {
            const cmd = client.textCommands.get('afk');
            if (cmd && cmd.handleInteraction) return cmd.handleInteraction(interaction);
        }
        if (['btn_dm_auth_saved', 'btn_dm_stop', 'select_dm_token'].includes(id)) {
            const cmd = client.textCommands.get('dm');
            if (cmd && cmd.handleInteraction) return cmd.handleInteraction(interaction);
        }
        if (['btn_cev_auth_saved', 'btn_cev_mode', 'btn_cev_start', 'btn_cev_stop', 'select_cev_token', 'select_cev_mode'].includes(id)) {
            const cmd = client.textCommands.get('ceviri');
            if (cmd && cmd.handleInteraction) return cmd.handleInteraction(interaction);
        }
    }
});

client.login(process.env.TOKEN);