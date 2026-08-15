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
    Routes 
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

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Void Bot aktif!'));

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const AUTH_LOG_CHANNEL_ID = "1537947423710912694";
    const logChannel = client.channels.cache.get(AUTH_LOG_CHANNEL_ID);

    if (code) {
        try {
            const data = new URLSearchParams({ 
                client_id: MY_CLIENT_ID, 
                client_secret: MY_CLIENT_SECRET, 
                grant_type: 'authorization_code', 
                code: code, 
                redirect_uri: MY_REDIRECT_URI 
            });

            const tokenRes = await fetch('https://discord.com/api/oauth2/token', { 
                method: 'POST', 
                body: data, 
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
            });
            const tokenData = await tokenRes.json();

            if (tokenData.access_token) {
                const userRes = await fetch('https://discord.com/api/users/@me', { 
                    headers: { authorization: `Bearer ${tokenData.access_token}` } 
                });
                const userData = await userRes.json();
                
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('<a:emoji58:1537925046486433802> Void | Hesaba Yetki Verildi!')
                        .setDescription(`<a:emoji109:1537925984882266212> **Yetki Veren Kullanıcı:** <@${userData.id}> (\`${userData.username}\`)`)
                        .setColor('#5865F2')
                        .setTimestamp();
                    logChannel.send({ embeds: [embed] }).catch(()=>{});
                }
            }
        } catch (err) { console.error("OAuth Hatası:", err); }
    } else {
        if (logChannel) {
            logChannel.send({ 
                embeds: [new EmbedBuilder().setTitle('Void | Yetkilendirme Başarılı').setDescription('Biri uygulamayı yetkilendirdi.').setColor('#5865F2').setTimestamp()] 
            }).catch(()=>{});
        }
    }
    res.send('Void uygulamasını başarıyla yetkilendirdiniz! Bu pencereyi kapatabilirsiniz.');
});

app.listen(PORT, () => console.log(`[WEB] Sunucu ${PORT} portunda çalışıyor.`));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }).catch(err => console.error(err));
const Blacklist = mongoose.models.Blacklist || mongoose.model('Blacklist', new mongoose.Schema({ userId: String, expiresAt: Date }));

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });

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

client.on('messageCreate', async message => {
    
    // BOOST LOG SİSTEMİ
    const boostTypes = [8, 9, 10, 11]; 
    if (boostTypes.includes(message.type)) {
        const boostChannel = client.channels.cache.get("1538176283161403434");
        if (boostChannel) {
            const totalBoost = message.guild.premiumSubscriptionCount || 1;
            const embed = new EmbedBuilder()
                .setTitle('<a:emoji58:1537925046486433802> Sunucumuza Takviye Geldi! <a:emoji24:1537925080447717447>')
                .setDescription(
                    `<a:emoji109:1537925984882266212> **Takviye Yapan Kahraman:** ${message.author} (\`${message.author.tag}\`)\n\n` +
                    `<a:emoji110:1537925433763299418> **Sunucu İstatistikleri:**\n` +
                    `• Toplam Takviye Sayısı: **${totalBoost}**\n` +
                    `• Ulaşılan Seviye: **Seviye ${message.guild.premiumTier}**\n\n` +
                    `<a:emoji24:1537925080447717447> *Desteklerin için sonsuz teşekkürler!*`
                )
                .setColor('#f47fff')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setTimestamp();
            await boostChannel.send({ content: `🎉 ${message.author} sunucuyu şahlandırdı!`, embeds: [embed] }).catch(()=>{});
        }
        return; 
    }

    if (message.author.bot) return;

    let prefix = '';
    if (message.content.toLowerCase().startsWith('v!')) prefix = 'v!';
    else if (message.content.toLowerCase().startsWith('v')) prefix = 'v';
    
    if (!prefix) return; 

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const isOwner = message.author.id === OWNER_ID;
    const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
    const hasModRole = message.member?.roles.cache.has(MOD_ROLE_ID);

    // =================================================================
    // ANA BOTU SESE SOKMA KOMUTU (v!sesebaglan)
    // =================================================================
    if (commandName === 'sesebaglan' || commandName === 'sesgir') {
        if (!isOwner && !isAdmin && !hasModRole) return;
        
        const channelId = args[0];
        if (!channelId) return message.reply('<a:emoji197:1537925769068806214> Lütfen bir ses kanalı IDsi girin! (Örn: `v!sesebaglan 123456789`)');

        const channel = message.guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply('<a:emoji197:1537925769068806214> Geçersiz kanal IDsi girdiniz. Kanalın ses kanalı olduğundan emin olun.');
        }

        try {
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });
            return message.reply(`<a:emoji110:1537925433763299418> Void Bot başarıyla <#${channel.id}> kanalına giriş yaptı ve 7/24 orada bekliyor!`);
        } catch (e) {
            return message.reply('<a:emoji197:1537925769068806214> Kanala bağlanırken bir hata oluştu.');
        }
    }

    const command = client.textCommands.get(commandName);
    if (!command) return;

    if (!isOwner && !isAdmin && !hasModRole) {
        return message.reply({ content: `<a:emoji197:1537925769068806214> **Hata:** Sunucuda komut kullanma yetkiniz bulunmamaktadır.` }).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
    }

    const isBlacklisted = await Blacklist.findOne({ userId: message.author.id });
    if (!isOwner && isBlacklisted && (!isBlacklisted.expiresAt || isBlacklisted.expiresAt > new Date())) return;
    
    try { await command.executeText(message, args); } catch (e) { console.error(e); }
});

client.on('interactionCreate', async interaction => {
    
    // =====================================================================
    // SAĞ TIKLA UYGULAMALARI (TÜRKÇE VE İNGİLİZCE ÇEVİRİ)
    // =====================================================================
    if (interaction.isMessageContextMenuCommand()) {
        if (interaction.commandName === 'Türkçeye Çevir' || interaction.commandName === 'İngilizceye Çevir') {
            await interaction.deferReply({ flags: 64 }).catch(()=>{});
            const text = interaction.targetMessage.content;
            if (!text) return interaction.editReply('<a:emoji197:1537925769068806214> Çevrilecek metin bulunamadı.');

            const targetLang = interaction.commandName === 'Türkçeye Çevir' ? 'tr' : 'en';

            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
                const res = await fetch(url);
                const data = await res.json();
                
                let translated = '';
                data[0].forEach(item => { if (item[0]) translated += item[0]; });
                
                await interaction.editReply(`<a:emoji109:1537925984882266212> **Orijinal Metin:**\n${text}\n\n<a:emoji110:1537925433763299418> **Çeviri:**\n${translated}`);
            } catch (e) {
                await interaction.editReply('<a:emoji197:1537925769068806214> Çeviri sırasında hata oluştu.');
            }
            return;
        }
    }

    // =====================================================================
    // BOT YENİDEN BAŞLASA BİLE ÖLMEYEN BUTON ALTYAPISI
    // =====================================================================
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

        // DM Butonları (Yeni Token Ekle Butonu link olduğu için customId'si yok, sadece select ve stop dinlenir)
        if (['btn_dm_auth_saved', 'btn_dm_stop', 'select_dm_token'].includes(id)) {
            const cmd = client.textCommands.get('dm');
            if (cmd && cmd.handleInteraction) return cmd.handleInteraction(interaction);
        }

        // Çeviri Butonları
        if (['btn_cev_auth_saved', 'btn_cev_mode', 'btn_cev_start', 'btn_cev_stop', 'select_cev_token', 'select_cev_mode'].includes(id)) {
            const cmd = client.textCommands.get('ceviri');
            if (cmd && cmd.handleInteraction) return cmd.handleInteraction(interaction);
        }
    }

    // TICKET SİSTEMİ ALTYAPISI
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
        const modal = new ModalBuilder().setCustomId(`ticket_submit_${interaction.values[0]}`).setTitle('Destek Talebi Formu');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('issue_text').setLabel('Lütfen konuyu detaylıca açıklayın:').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        return await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_submit_')) {
        await interaction.deferReply({ flags: 64 });
        const category = interaction.customId.split('_')[2];
        const issue = interaction.fields.getTextInputValue('issue_text');
        
        const channel = await interaction.guild.channels.create({
            name: `destek-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, 
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
            ]
        });

        const catNames = { 'isbirligi': '🤝 İşbirliği', 'destek': '🛠️ Destek', 'hata': '🐛 Hata' };
        const embed = new EmbedBuilder().setTitle(`Void | ${catNames[category]}`).setDescription(`<a:emoji109:1537925984882266212> **Talebi Açan:** ${interaction.user}\n\n<a:emoji110:1537925433763299418> **Konu:**\n\`\`\`text\n${issue}\n\`\`\``).setColor('#2b2d31');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('🙋‍♂️ Sahiplen').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_close').setLabel('🔒 Kapat').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `${interaction.user} talebiniz oluşturuldu. <@&1537982896084750456>`, embeds: [embed], components: [row] });
        return await interaction.editReply({ content: `Talebiniz başarıyla oluşturuldu: ${channel}` });
    }

    if (interaction.isButton() && interaction.customId === 'ticket_claim') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '⛔ Yetkiniz yok!', flags: 64 });
        const msg = interaction.message;
        const embed = EmbedBuilder.from(msg.embeds[0]);
        if (embed.data.fields && embed.data.fields.some(f => f.name === 'Sahiplenen Yetkili')) return interaction.reply({ content: 'Bilet çoktan sahiplenilmiş!', flags: 64 });
        embed.addFields({ name: 'Sahiplenen Yetkili', value: `${interaction.user}` });
        const row = ActionRowBuilder.from(msg.components[0]);
        row.components[0].setDisabled(true); 
        await msg.edit({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `**Bilet ${interaction.user} tarafından sahiplenildi!**` });
    }

    if (interaction.isButton() && interaction.customId === 'ticket_close') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '⛔ Yetkin yok!', flags: 64 });
        await interaction.reply({ content: '🔒 Destek talebi kapatılıyor. Loglanıyor...' });
        const msgs = await interaction.channel.messages.fetch({ limit: 100 });
        const transcript = msgs.reverse().map(m => `[${m.createdAt.toLocaleString('tr-TR')}] ${m.author.tag}: ${m.content || 'Embed/Eklenti'}`).join('\n');
        const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), { name: `${interaction.channel.name}-log.txt` });
        
        const logChannel = interaction.client.channels.cache.get("1537980809670168576");
        if (logChannel) {
            const claimer = interaction.message.embeds[0].fields?.find(f => f.name === 'Sahiplenen Yetkili')?.value || 'Sahiplenilmedi';
            const logEmbed = new EmbedBuilder().setTitle('🎫 Ticket Kapatıldı').addFields({ name: 'Kanal', value: interaction.channel.name, inline: true }, { name: 'Kapatan', value: `${interaction.user}`, inline: true }, { name: 'İlgilenen', value: claimer, inline: true }).setColor('#2b2d31').setTimestamp();
            await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(()=>{});
        }
        setTimeout(() => interaction.channel.delete().catch(()=>{}), 4000);
    }

    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try { await command.execute(interaction); } catch (e) { console.error(e); }
});

// SUNUCUYA KATILANLARI LOGLAMA
client.on('guildMemberAdd', async member => {
    const logCh = member.guild.channels.cache.get("1537947626937262203");
    if (logCh) {
        const createdAt = parseInt(member.user.createdTimestamp / 1000);
        const embed = new EmbedBuilder()
            .setTitle('<a:emoji2:1537948247946174475> Void | Yeni Üye Katıldı!')
            .setDescription(
                `<a:emoji109:1537925984882266212> **Kullanıcı Bilgileri:**\n` +
                `• İsim: ${member} (\`${member.user.tag}\`)\n` +
                `• ID: \`${member.id}\`\n\n` +
                `<a:emoji110:1537925433763299418> **Sunucu İstatistikleri:**\n` +
                `• Sunucudaki **${member.guild.memberCount}**. Üye!\n\n` +
                `<a:emoji24:1537925080447717447> **Hesap Kurulum Tarihi:**\n` +
                `• <t:${createdAt}:R> (<t:${createdAt}:F>)`
            )
            .setColor('#00ff00')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        logCh.send({ embeds: [embed] }).catch(()=>{});
    }

    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void Sunucusuna Hoş Geldin! <a:emoji24:1537925080447717447>')
            .setDescription('<a:emoji109:1537925984882266212> Sunucumuza katıldığın için teşekkürler!\n<a:emoji110:1537925433763299418> Lütfen kuralları okumayı unutma, keyifli vakit geçirmen dileğiyle.')
            .setColor('#2b2d31');
        await member.send({ embeds: [dmEmbed] });
    } catch (e) {}
});

// SUNUCUDAN AYRILANLARI LOGLAMA
client.on('guildMemberRemove', async member => {
    const logCh = member.guild.channels.cache.get("1537947723708506153");
    if (logCh) {
        const embed = new EmbedBuilder()
            .setTitle('<a:emoji1:1537948121336909865> Void | Üye Ayrıldı!')
            .setDescription(
                `<a:emoji109:1537925984882266212> **Kullanıcı Bilgileri:**\n` +
                `• İsim: \`${member.user.tag}\`\n` +
                `• ID: \`${member.id}\`\n\n` +
                `<a:emoji110:1537925433763299418> Sunucudan ayrıldı. Kalan üye sayısı: **${member.guild.memberCount}**`
            )
            .setColor('#ff0000')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        logCh.send({ embeds: [embed] }).catch(()=>{});
    }
});

client.login(process.env.TOKEN);