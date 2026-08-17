const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { Client: SelfbotClient, RichPresence } = require('discord.js-selfbot-v13');
const { Streamer } = require('@dank074/discord-video-stream'); // YENİ EKLENEN PROFESYONEL PAKET

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ userId: String, token: String, username: String }));
const REQUIRED_GUILD_ID = "1537608795876884642"; 
if (!global.activeTokens) global.activeTokens = new Map();
if (!global.streamers) global.streamers = new Map(); // Streamer nesnelerini tutacağımız hafıza

// O an seçilen tokeni ve modu hafızada tutmak için geçici harita
const tempSession = new Map();

async function renderSesPanel(userId, guild, client) {
    const userAccounts = await Account.find({ userId: userId });
    const aktifSayisi = userAccounts.filter(acc => global.activeTokens?.has(acc.token)).length;

    const embed = new EmbedBuilder()
        .setTitle('<a:emoji58:1537925046486433802> Void | Profesyonel Ses & Yayın Yönetimi <a:emoji24:1537925080447717447>')
        .setColor('#2b2d31')
        .setDescription(
            '<a:emoji109:1537925984882266212> **7/24 Ses & Durum Yönetimi**\n' +
            'Kayıtlı tokenlerinizi belirlediğiniz sunucunun ses kanalına sokabilirsiniz.\n\n' +
            `<a:emoji110:1537925433763299418> Seste Olan Hesaplar: **${aktifSayisi}**\n\n` +
            '<a:emoji24:1537925080447717447> *Sese sokma ve çıkarma işlemleri için aşağıdaki butonları kullanın.*'
        );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_ses_sok_hepsi').setLabel('Hepsini Sese Sok').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tk_ses_sok_sec').setLabel('Seçtiğimi Sese Sok').setStyle(ButtonStyle.Primary)
    );
    
    // Kamera ve Yayın (Stream) Butonları
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_ses_yayin_hepsi').setLabel('Kamera+Yayın Aç (Hepsi)').setStyle(ButtonStyle.Success).setEmoji('🎥'),
        new ButtonBuilder().setCustomId('tk_ses_yayin_sec').setLabel('Kamera+Yayın Aç (Seçili)').setStyle(ButtonStyle.Primary).setEmoji('🎥')
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_ses_cikar_hepsi').setLabel('Hepsini Sesten Çıkar').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('tk_ses_cikar_sec').setLabel('Seçtiğimi Sesten Çıkar').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row1, row2, row3] };
}

module.exports = {
    name: 'ses', 
    data: new SlashCommandBuilder().setName('ses').setDescription('Hesaplarınızı sese veya yayına sokun.'),

    async executeText(message) {
        const infoEmbed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Ses Yönetim Sistemi <a:emoji24:1537925080447717447>')
            .setDescription('<a:emoji109:1537925984882266212> **Sistem Hakkında:**\nKayıtlı tokenlerinizi dilediğiniz gibi tek tek veya toplu olarak sese sokabilirsiniz.\n\n<a:emoji24:1537925080447717447> *Aşağıdaki butona tıklayın!*')
            .setColor('#2b2d31');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_ses_panel').setLabel('Ses Panelini Aç').setStyle(ButtonStyle.Secondary).setEmoji('1537925080447717447'));
        await message.channel.send({ embeds: [infoEmbed], components: [row] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        if (id === 'btn_ses_panel') {
            await i.deferReply({ flags: 64 }).catch(()=>{});
            return i.editReply(await renderSesPanel(i.user.id, i.guild, i.client));
        }

        // ==================== SESE SOKMA İŞLEMLERİ ====================
        if (id === 'tk_ses_sok_hepsi' || id === 'tk_ses_sok_sec' || id === 'tk_ses_yayin_hepsi' || id === 'tk_ses_yayin_sec') {
            const isStream = id.includes('yayin');
            const userAccounts = await Account.find({ userId: i.user.id });
            if (userAccounts.length === 0) return i.reply({ content: '<a:emoji197:1537925769068806214> Kayıtlı tokeniniz yok!', flags: 64 });

            if (id === 'tk_ses_sok_sec' || id === 'tk_ses_yayin_sec') {
                const customId = isStream ? 'select_ses_yayin' : 'select_ses_sok';
                const options = userAccounts.map((acc, index) => ({ label: acc.username || `Hesap ${index + 1}`, value: acc.token }));
                const selectMenu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder('Sese sokulacak hesabı seçin').addOptions(options));
                return i.reply({ content: '<a:emoji109:1537925984882266212> Lütfen sese sokmak istediğiniz hesabı seçin:', components: [selectMenu], flags: 64 });
            }

            tempSession.set(i.user.id, { tokens: userAccounts.map(a => a.token), stream: isStream });
            const modal = new ModalBuilder().setCustomId('modal_sese_sok').setTitle('Hedef Sunucu & Kanal');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_id').setLabel('Sunucu ID').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('c_id').setLabel('Ses Kanal ID').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await i.showModal(modal);
        }

        if (id === 'select_ses_sok' || id === 'select_ses_yayin') {
            const isStream = id.includes('yayin');
            tempSession.set(i.user.id, { tokens: [i.values[0]], stream: isStream }); 
            const modal = new ModalBuilder().setCustomId('modal_sese_sok').setTitle('Hedef Sunucu & Kanal');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_id').setLabel('Sunucu ID').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('c_id').setLabel('Ses Kanal ID').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await i.showModal(modal);
        }

        if (id === 'modal_sese_sok') {
            await i.deferUpdate().catch(()=>{});
            const hedefSunucu = i.fields.getTextInputValue('g_id');
            const hedefKanal = i.fields.getTextInputValue('c_id');
            const sessionData = tempSession.get(i.user.id);
            if (!sessionData) return;

            const isStream = sessionData.stream || false;

            for (const token of sessionData.tokens) {
                if (global.activeTokens?.has(token)) continue; // Zaten aktifse geç
                try {
                    const selfBot = new SelfbotClient({ checkUpdate: false });
                    
                    selfBot.on('ready', async () => {
                        const status = new RichPresence(selfBot).setApplicationId('1491071700715048970').setType('PLAYING').setName('.gg/voido').setDetails('Project by noxy').addButton('Discord', 'https://discord.gg/voido');
                        selfBot.user.setActivity(status);
                        
                        // YENİ PROFESYONEL YAYIN ALTYAPISI
                        const streamer = new Streamer(selfBot);
                        global.streamers.set(token, streamer);
                        
                        // Sese katıl (Streamer üzerinden bağlanıyoruz)
                        await streamer.joinVoice(hedefSunucu, hedefKanal);

                        if (isStream) {
                            // Gerçek kamera sinyali gönder
                            selfBot.signalVideo(hedefSunucu, hedefKanal, true);
                            
                            // Gerçek ekran paylaşımı (Go-Live) sinyali oluştur
                            try {
                                await streamer.createStream(); // Discord UDP sunucularında yayın odası açar
                            } catch (e) {
                                console.error("Yayın odası oluşturulurken hata (Normal olabilir):", e);
                            }
                        }

                        global.activeTokens.set(token, selfBot);
                    });
                    
                    await selfBot.login(token);
                } catch (e) {
                    console.error("Token giriş yapamadı: ", e);
                }
            }
            
            await i.editReply(await renderSesPanel(i.user.id, i.guild, i.client));
            await i.followUp({ content: `<a:emoji110:1537925433763299418> Birlikler sese konumlandı${isStream ? ' ve kameralar aktif edildi' : ''}!`, flags: 64 });
        }

        // ==================== SESTEN ÇIKARMA İŞLEMLERİ ====================
        if (id === 'tk_ses_cikar_hepsi' || id === 'tk_ses_cikar_sec') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (userAccounts.length === 0) return i.reply({ content: '<a:emoji197:1537925769068806214> Kayıtlı tokeniniz yok!', flags: 64 });

            if (id === 'tk_ses_cikar_sec') {
                const options = userAccounts.map((acc, index) => ({ label: acc.username || `Hesap ${index + 1}`, value: acc.token }));
                const selectMenu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_ses_cikar').setPlaceholder('Sesten çıkarılacak hesabı seçin').addOptions(options));
                return i.reply({ content: '<a:emoji109:1537925984882266212> Lütfen sesten çıkarmak istediğiniz hesabı seçin:', components: [selectMenu], flags: 64 });
            }

            await i.deferUpdate().catch(()=>{});
            for (const acc of userAccounts) {
                let targetBot = global.activeTokens?.get(acc.token);
                let targetStreamer = global.streamers?.get(acc.token);
                
                if (targetStreamer) {
                    try { targetStreamer.leaveVoice(); } catch(e){}
                    global.streamers.delete(acc.token);
                }
                
                if (targetBot) {
                    try {
                        targetBot.user.setActivity(null);
                        setTimeout(() => { try { targetBot.destroy(); } catch(e){} global.activeTokens.delete(acc.token); }, 1500);
                    } catch(e) {}
                }
            }
            await i.editReply(await renderSesPanel(i.user.id, i.guild, i.client));
        }

        if (id === 'select_ses_cikar') {
            await i.deferUpdate().catch(()=>{});
            const token = i.values[0];
            let targetBot = global.activeTokens?.get(token);
            let targetStreamer = global.streamers?.get(token);
            
            if (targetStreamer) {
                try { targetStreamer.leaveVoice(); } catch(e){}
                global.streamers.delete(token);
            }
            
            if (targetBot) {
                targetBot.user.setActivity(null);
                setTimeout(() => { try { targetBot.destroy(); } catch(e){} global.activeTokens.delete(token); }, 1500);
            }
            await i.editReply(await renderSesPanel(i.user.id, i.guild, i.client));
        }
    }
};