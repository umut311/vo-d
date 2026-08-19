const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { Client: SelfbotClient, RichPresence } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ userId: String, token: String, username: String }));
const REQUIRED_GUILD_ID = "1537608795876884642"; 
if (!global.activeTokens) global.activeTokens = new Map();

// O an seçilen tokeni hafızada tutmak için geçici harita
const tempSession = new Map();

async function renderSesPanel(userId, guild, client) {
    const userAccounts = await Account.find({ userId: userId });
    const aktifSayisi = userAccounts.filter(acc => global.activeTokens?.has(acc.token)).length;

    const embed = new EmbedBuilder()
        .setTitle('<a:emoji133:1539424360543293521> Void | Ses ve RPC Yönetimi <a:emoji195:1539424442768424992>')
        .setColor('#2b2d31')
        .setDescription(
            '<a:emoji105:1539424496346206298> **7/24 Ses & Durum Yönetimi**\n' +
            'Kayıtlı tokenlerinizi belirlediğiniz sunucunun ses kanalına sokabilirsiniz.\n\n' +
            `<a:emoji105:1539424496346206298> Seste Olan Hesaplar: **${aktifSayisi}**\n\n` +
            '<a:emoji195:1539424442768424992> *Sese sokma ve çıkarma işlemleri için butonları kullanın.*'
        );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_ses_sok_hepsi').setLabel('Hepsini Sese Sok').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tk_ses_sok_sec').setLabel('Seçtiğimi Sese Sok').setStyle(ButtonStyle.Primary)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_ses_cikar_hepsi').setLabel('Hepsini Sesten Çıkar').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('tk_ses_cikar_sec').setLabel('Seçtiğimi Sesten Çıkar').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row1, row2] };
}

module.exports = {
    name: 'ses', 
    data: new SlashCommandBuilder().setName('ses').setDescription('Hesaplarınızı sese sokun.'),

    async executeText(message) {
        const infoEmbed = new EmbedBuilder()
            .setTitle('<a:emoji133:1539424360543293521> Void | Ses Yönetim Sistemi <a:emoji195:1539424442768424992>')
            .setDescription('<a:emoji105:1539424496346206298> **Sistem Hakkında:**\nKayıtlı tokenlerinizi dilediğiniz gibi tek tek veya toplu olarak sese sokabilirsiniz.\n\n<a:emoji195:1539424442768424992> *Aşağıdaki butona tıklayın!*')
            .setColor('#2b2d31');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_ses_panel').setLabel('Ses Panelini Aç').setStyle(ButtonStyle.Secondary).setEmoji('1539424442768424992'));
        await message.channel.send({ embeds: [infoEmbed], components: [row] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        if (id === 'btn_ses_panel') {
            await i.deferReply({ flags: 64 }).catch(()=>{});
            return i.editReply(await renderSesPanel(i.user.id, i.guild, i.client));
        }

        // ==================== SESE SOKMA İŞLEMLERİ ====================
        if (id === 'tk_ses_sok_hepsi' || id === 'tk_ses_sok_sec') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (userAccounts.length === 0) return i.reply({ content: '<a:emoji235:1539424382332444732> Kayıtlı tokeniniz yok!', flags: 64 });

            if (id === 'tk_ses_sok_sec') {
                const options = userAccounts.map((acc, index) => ({ label: acc.username || `Hesap ${index + 1}`, value: acc.token }));
                const selectMenu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_ses_sok').setPlaceholder('Sese sokulacak hesabı seçin').addOptions(options));
                return i.reply({ content: '<a:emoji105:1539424496346206298> Lütfen sese sokmak istediğiniz hesabı seçin:', components: [selectMenu], flags: 64 });
            }

            // Hepsini Sese Sok modu
            tempSession.set(i.user.id, { tokens: userAccounts.map(a => a.token) });
            const modal = new ModalBuilder().setCustomId('modal_sese_sok').setTitle('Hedef Sunucu & Kanal');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_id').setLabel('Sunucu ID').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('c_id').setLabel('Ses Kanalı ID').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await i.showModal(modal);
        }

        if (id === 'select_ses_sok') {
            tempSession.set(i.user.id, { tokens: [i.values[0]] }); // Sadece seçileni al
            const modal = new ModalBuilder().setCustomId('modal_sese_sok').setTitle('Hedef Sunucu & Kanal');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_id').setLabel('Sunucu ID').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('c_id').setLabel('Ses Kanalı ID').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await i.showModal(modal);
        }

        if (id === 'modal_sese_sok') {
            await i.deferUpdate().catch(()=>{});
            const hedefSunucu = i.fields.getTextInputValue('g_id');
            const hedefKanal = i.fields.getTextInputValue('c_id');
            const sessionData = tempSession.get(i.user.id);
            if (!sessionData) return;

            for (const token of sessionData.tokens) {
                if (global.activeTokens?.has(token)) continue;
                try {
                    const selfBot = new SelfbotClient({ checkUpdate: false });
                    selfBot.on('ready', async () => {
                        const status = new RichPresence(selfBot).setApplicationId('1491071700715048970').setType('PLAYING').setName('.gg/voido').setDetails('Project by noxy').addButton('Discord', 'https://discord.gg/voido');
                        selfBot.user.setActivity(status);
                        const guild = selfBot.guilds.cache.get(hedefSunucu);
                        if (guild) joinVoiceChannel({ channelId: hedefKanal, guildId: guild.id, adapterCreator: guild.voiceAdapterCreator, group: selfBot.user.id, selfDeaf: true, selfMute: true });
                        global.activeTokens.set(token, selfBot);
                    });
                    await selfBot.login(token);
                } catch (e) {}
            }
            await i.editReply(await renderSesPanel(i.user.id, i.guild, i.client));
            await i.followUp({ content: '<a:emoji133:1539424360543293521> İşlem tamamlandı!', flags: 64 });
        }

        // ==================== SESTEN ÇIKARMA İŞLEMLERİ ====================
        if (id === 'tk_ses_cikar_hepsi' || id === 'tk_ses_cikar_sec') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (userAccounts.length === 0) return i.reply({ content: '<a:emoji235:1539424382332444732> Kayıtlı tokeniniz yok!', flags: 64 });

            if (id === 'tk_ses_cikar_sec') {
                const options = userAccounts.map((acc, index) => ({ label: acc.username || `Hesap ${index + 1}`, value: acc.token }));
                const selectMenu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_ses_cikar').setPlaceholder('Sesten çıkarılacak hesabı seçin').addOptions(options));
                return i.reply({ content: '<a:emoji105:1539424496346206298> Lütfen sesten çıkarmak istediğiniz hesabı seçin:', components: [selectMenu], flags: 64 });
            }

            // Hepsini Çıkar
            await i.deferUpdate().catch(()=>{});
            for (const acc of userAccounts) {
                let targetBot = global.activeTokens?.get(acc.token);
                if (targetBot) {
                    try {
                        targetBot.user.setActivity(null);
                        targetBot.guilds.cache.forEach(guild => {
                            const conn = getVoiceConnection(guild.id, targetBot.user.id);
                            if (conn) conn.destroy();
                            guild.shard.send({ op: 4, d: { guild_id: guild.id, channel_id: null, self_mute: false, self_deaf: false } });
                        });
                        setTimeout(() => { try { targetBot.destroy(); } catch(e){} global.activeTokens.delete(acc.token); }, 2000);
                    } catch(e) {}
                }
            }
            await i.editReply(await renderSesPanel(i.user.id, i.guild, i.client));
        }

        if (id === 'select_ses_cikar') {
            await i.deferUpdate().catch(()=>{});
            const token = i.values[0];
            let targetBot = global.activeTokens?.get(token);
            if (targetBot) {
                targetBot.user.setActivity(null);
                targetBot.guilds.cache.forEach(guild => {
                    const conn = getVoiceConnection(guild.id, targetBot.user.id);
                    if (conn) conn.destroy();
                    guild.shard.send({ op: 4, d: { guild_id: guild.id, channel_id: null, self_mute: false, self_deaf: false } });
                });
                setTimeout(() => { try { targetBot.destroy(); } catch(e){} global.activeTokens.delete(token); }, 2000);
            }
            await i.editReply(await renderSesPanel(i.user.id, i.guild, i.client));
        }
    }
};