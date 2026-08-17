const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { Client: SelfbotClient, RichPresence } = require('discord.js-selfbot-v13');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ userId: String, token: String, username: String }));
const REQUIRED_GUILD_ID = "1537608795876884642"; 

if (!global.activeTokens) global.activeTokens = new Map();
const tempSession = new Map();

async function renderSesPanel(userId, guild, client) {
    const userAccounts = await Account.find({ userId: userId });
    const aktifSayisi = userAccounts.filter(acc => global.activeTokens?.has(acc.token)).length;

    const embed = new EmbedBuilder()
        .setTitle('<a:emoji58:1537925046486433802> Void | Saf Sinyal Ses & Yayın <a:emoji24:1537925080447717447>')
        .setColor('#2b2d31')
        .setDescription(
            '<a:emoji109:1537925984882266212> **7/24 Ses & Kamera Yönetimi**\n' +
            'Bu sistem kütüphaneleri atlayıp Discord sunucularına doğrudan ajan sinyali (Gateway Payload) yollar.\n\n' +
            `<a:emoji110:1537925433763299418> Seste Olan Hesaplar: **${aktifSayisi}**\n\n` +
            '<a:emoji24:1537925080447717447> *İşlem yapmak için butonları kullanın.*'
        );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_ses_sok_hepsi').setLabel('Toplu Sese Sok').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tk_ses_sok_sec').setLabel('Tekli Sese Sok').setStyle(ButtonStyle.Primary)
    );
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_ses_cikar').setLabel('Çalışan Tüm Hesapları Sesten Çıkar').setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row1, row2] };
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
        if (id === 'tk_ses_sok_hepsi' || id === 'tk_ses_sok_sec') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (userAccounts.length === 0) return i.reply({ content: '<a:emoji197:1537925769068806214> Kayıtlı tokeniniz yok!', flags: 64 });

            if (id === 'tk_ses_sok_sec') {
                const options = userAccounts.map((acc, index) => ({ label: acc.username || `Hesap ${index + 1}`, value: acc.token }));
                const selectMenu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_ses_sok').setPlaceholder('Sese sokulacak hesabı seçin').addOptions(options));
                return i.reply({ content: '<a:emoji109:1537925984882266212> Lütfen sese sokmak istediğiniz hesabı seçin:', components: [selectMenu], flags: 64 });
            }

            tempSession.set(i.user.id, { tokens: userAccounts.map(a => a.token) });
            const modal = new ModalBuilder().setCustomId('modal_sese_sok').setTitle('Sese Sokma Ayarları');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_id').setLabel('Sunucu ID').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('c_id').setLabel('Ses Kanal ID').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('stream_opt').setLabel('Kamera & Yayın Açılsın mı?').setPlaceholder('"evet" veya "hayir" yazın').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await i.showModal(modal);
        }

        if (id === 'select_ses_sok') {
            tempSession.set(i.user.id, { tokens: [i.values[0]] }); 
            const modal = new ModalBuilder().setCustomId('modal_sese_sok').setTitle('Sese Sokma Ayarları');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_id').setLabel('Sunucu ID').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('c_id').setLabel('Ses Kanal ID').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('stream_opt').setLabel('Kamera & Yayın Açılsın mı?').setPlaceholder('"evet" veya "hayir" yazın').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await i.showModal(modal);
        }

        if (id === 'modal_sese_sok') {
            await i.deferUpdate().catch(()=>{});
            const hedefSunucu = i.fields.getTextInputValue('g_id');
            const hedefKanal = i.fields.getTextInputValue('c_id');
            const streamSecim = i.fields.getTextInputValue('stream_opt').toLowerCase();
            const isStream = streamSecim.includes('evet'); 

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
                        if (guild) {
                            // SADECE SAF WEBSOCKET SİNYALİ KULLANIYORUZ - KÜTÜPHANE YOK
                            guild.shard.send({
                                op: 4, // Voice State Update
                                d: {
                                    guild_id: guild.id,
                                    channel_id: hedefKanal,
                                    self_mute: true,
                                    self_deaf: true,
                                    self_video: isStream // Bu direkt kamerayı zorla açar!
                                }
                            });

                            if (isStream) {
                                // 2 saniye sonra "YAYINDA" rozetini tetikliyoruz
                                setTimeout(() => {
                                    guild.shard.send({
                                        op: 18, // Stream Create
                                        d: {
                                            type: "guild",
                                            guild_id: guild.id,
                                            channel_id: hedefKanal,
                                            preferred_region: null
                                        }
                                    });
                                }, 2000);
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
            await i.followUp({ content: `<a:emoji110:1537925433763299418> Birlikler sese konumlandı${isStream ? ' ve Yayın/Kamera zorla aktif edildi' : ''}!`, flags: 64 });
        }

        // ==================== SESTEN ÇIKARMA İŞLEMLERİ ====================
        if (id === 'tk_ses_cikar') {
            await i.deferUpdate().catch(()=>{});
            
            const userAccounts = await Account.find({ userId: i.user.id });
            if (userAccounts.length === 0) return;

            let cikarlan = 0;
            for (const acc of userAccounts) {
                let targetBot = global.activeTokens?.get(acc.token);
                
                if (targetBot) {
                    try {
                        // Tüm sunuculardaki ses bağlantısını silmek için sahte disconnect sinyali
                        targetBot.guilds.cache.forEach(guild => {
                            guild.shard.send({ 
                                op: 4, 
                                d: { guild_id: guild.id, channel_id: null, self_mute: false, self_deaf: false, self_video: false } 
                            });
                        });
                        
                        targetBot.destroy();
                        global.activeTokens.delete(acc.token);
                        cikarlan++;
                    } catch(e) {}
                }
            }

            await i.editReply(await renderSesPanel(i.user.id, i.guild, i.client));
            if (cikarlan > 0) {
                await i.followUp({ content: `<a:emoji110:1537925433763299418> Toplam **${cikarlan}** hesap sesten çekildi ve kapatıldı!`, flags: 64 });
            } else {
                await i.followUp({ content: `<a:emoji197:1537925769068806214> Seste çalışan hesabın bulunamadı.`, flags: 64 });
            }
        }
    }
};