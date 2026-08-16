const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ 
    userId: String, 
    token: String, 
    username: String, 
    status: String 
}));

const OWNER_ID = "345821033414262794";
const MOD_ROLE_ID = "1537938887509278871";

if (!global.arkadasTokens) global.arkadasTokens = new Map();
if (!global.arkadasWhitelists) global.arkadasWhitelists = new Map();
if (!global.arkadasCache) global.arkadasCache = new Map(); 
if (!global.arkadasPages) global.arkadasPages = new Map();   

async function getValidToken(userId) {
    let token = global.arkadasTokens.get(userId);
    if (!token) {
        const userAccs = await Account.find({ userId: userId });
        if (userAccs && userAccs.length > 0) {
            token = userAccs[0].token;
            global.arkadasTokens.set(userId, token);
        }
    }
    return token;
}

module.exports = {
    name: 'arkadas', 
    async executeText(message, args) {
        const isOwner = message.author.id === OWNER_ID;
        const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
        const hasModRole = message.member?.roles.cache.has(MOD_ROLE_ID);

        if (!isOwner && !isAdmin && !hasModRole) {
            return message.reply({ content: '<a:emoji197:1537925769068806214> Bu paneli kurmak için yetkiniz bulunmamaktadır.' }).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
        }

        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Arkadaş Listesi Temizleyici <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Sistem Nasıl Çalışır?**\n' +
                'Seçtiğiniz **Selfbot hesabı** ile arkadaş listeniz taranır. Belirttiğiniz **korumalı kişiler hariç** listedeki herkes arkadaşlıktan silinir!\n\n' +
                '<a:uyari:1538527482007789648> **HIZLI KULLANIM:**\n' +
                '• Sisteme kayıtlı hesabınız **otomatik olarak seçilir**, dilerseniz **Hesap Seç** ile değiştirebilirsiniz.\n' +
                '• **Listeden Korunacakları Seç** ile arkadaşlarınızı sayfa sayfa seçip korumaya alabilirsiniz.\n' +
                '• **Başlat** butonuna basarak temizliği fişekleyin!\n\n' +
                '<a:emoji24:1537925080447717447> *Aşağıdaki butonları kullanarak paneli yönetin.*'
            )
            .setColor('#2b2d31')
            .setThumbnail(serverIcon)
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const linkRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Yeni Token Ekle')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/channels/1537608795876884642/1537974081461297162')
        );

        const actionRow1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ark_sec').setLabel('Hesap Seç').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_ark_liste_sec').setLabel('Listeden Korunacakları Seç').setStyle(ButtonStyle.Success)
        );

        const actionRow2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ark_whitelist').setLabel('ID ile Koruma Ekle').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_ark_baslat').setLabel('Başlat').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_ark_durdur').setLabel('Durdur').setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({ embeds: [embed], components: [linkRow, actionRow1, actionRow2] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        const isOwner = i.user.id === OWNER_ID;
        const isAdmin = i.member?.permissions.has(PermissionFlagsBits.Administrator);
        const hasModRole = i.member?.roles.cache.has(MOD_ROLE_ID);

        if (!isOwner && !isAdmin && !hasModRole) {
            return i.reply({ content: '<a:emoji197:1537925769068806214> Bu sistemi kullanmak için yetkiniz yok!', flags: 64 });
        }

        if (id === 'btn_ark_sec') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (!userAccounts || userAccounts.length === 0) {
                return i.reply({ content: '<a:emoji197:1537925769068806214> Sisteme kayıtlı tokenin yok!', flags: 64 });
            }

            const options = userAccounts.map((acc, index) => ({
                label: acc.username || `Hesap ${index + 1}`,
                description: `Token: ${acc.token.substring(0, 15)}...`,
                value: acc.token
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_ark_token')
                .setPlaceholder('İşlem yapılacak hesabı seçin...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await i.reply({ content: '<a:emoji109:1537925984882266212> Hangi hesapla işlem yapacaksın? Lütfen seç:', components: [row], flags: 64 });
        }

        if (id === 'select_ark_token') {
            const selectedToken = i.values[0];
            global.arkadasTokens.set(i.user.id, selectedToken);
            global.arkadasCache.delete(i.user.id);
            global.arkadasPages.delete(i.user.id);
            await i.update({ content: '<a:emoji110:1537925433763299418> Hesap başarıyla seçildi!', components: [] });
        }

        if (id === 'btn_ark_liste_sec' || id === 'ark_page_next' || id === 'ark_page_prev') {
            const selectedToken = await getValidToken(i.user.id);
            if (!selectedToken) {
                return i.reply({ content: '<a:emoji197:1537925769068806214> Sisteme kayıtlı token bulunamadı! Önce hesap ekle.', flags: 64 });
            }

            await i.deferReply({ flags: 64 }).catch(() => {});

            try {
                let friends = global.arkadasCache.get(i.user.id);
                if (!friends) {
                    const res = await fetch('https://discord.com/api/v9/users/@me/relationships', {
                        headers: { 
                            'Authorization': selectedToken,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });

                    if (!res.ok) {
                        return i.editReply(`<a:emoji197:1537925769068806214> API Hatası! Kod: ${res.status}. Token geçersiz olabilir.`);
                    }

                    const relationships = await res.json();
                    friends = relationships.filter(r => r.type === 1);
                    global.arkadasCache.set(i.user.id, friends);
                }

                if (!friends || friends.length === 0) {
                    return i.editReply('<a:emoji197:1537925769068806214> Bu hesabın arkadaş listesi boş.');
                }

                let page = global.arkadasPages.get(i.user.id) || 0;
                if (id === 'ark_page_next') page++;
                if (id === 'ark_page_prev') page--;
                global.arkadasPages.set(i.user.id, page);

                const maxPage = Math.ceil(friends.length / 25) - 1;
                if (page > maxPage) page = maxPage;
                if (page < 0) page = 0;

                const start = page * 25;
                const end = start + 25;
                const sliceFriends = friends.slice(start, end);

                const options = sliceFriends.map(f => ({
                    label: (f.user.username || 'Bilinmiyor').substring(0, 25),
                    description: `ID: ${f.user.id}`,
                    value: f.user.id
                }));

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_ark_whitelist_multi')
                    .setPlaceholder(`Sayfa ${page + 1} / ${maxPage + 1} (Toplam ${friends.length} arkadaş)`)
                    .setMinValues(1)
                    .setMaxValues(options.length)
                    .addOptions(options);

                const row1 = new ActionRowBuilder().addComponents(selectMenu);
                
                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ark_page_prev').setLabel('◀️ Geri').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                    new ButtonBuilder().setCustomId('ark_page_next').setLabel('İleri ▶️').setStyle(ButtonStyle.Secondary).setDisabled(page === maxPage)
                );

                const currentWhitelist = global.arkadasWhitelists.get(i.user.id) || [];

                const embed = new EmbedBuilder()
                    .setTitle('<a:emoji58:1537925046486433802> Arkadaş Koruma Paneli')
                    .setColor('#2b2d31')
                    .setDescription(
                        `<a:emoji109:1537925984882266212> **Sayfa ${page + 1} / ${maxPage + 1}**\n` +
                        `Listeden korumak istediğin kişileri seçip onaylayabilirsin.\n\n` +
                        `🛡️ Şu an korumada olan toplam kişi: **${currentWhitelist.length}**`
                    );

                await i.editReply({ embeds: [embed], components: [row1, row2] });

            } catch (err) {
                console.error("Sayfalama Hatası:", err);
                await i.editReply('<a:emoji197:1537925769068806214> Arkadaş listesi yüklenirken bağlantı hatası oluştu.');
            }
        }

        if (id === 'select_ark_whitelist_multi') {
            const selectedIds = i.values;
            let currentWhitelist = global.arkadasWhitelists.get(i.user.id) || [];
            
            for (const uid of selectedIds) {
                if (!currentWhitelist.includes(uid)) currentWhitelist.push(uid);
            }

            global.arkadasWhitelists.set(i.user.id, currentWhitelist);
            await i.reply({ content: `<a:emoji110:1537925433763299418> Seçilenlerle beraber toplam **${currentWhitelist.length}** kişi korumaya alındı!`, flags: 64 });
        }

        if (id === 'btn_ark_whitelist') {
            const modal = new ModalBuilder()
                .setCustomId('modal_ark_whitelist')
                .setTitle('Silinmeyecek Kullanıcı IDleri');

            const idsInput = new TextInputBuilder()
                .setCustomId('whitelist_ids')
                .setLabel('Korunacak IDler (Boşluk/Virgül ile ayır)')
                .setPlaceholder('Örn: 345821033414262794, 123456789...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(idsInput));
            await i.showModal(modal);
        }

        if (id === 'modal_ark_whitelist') {
            const rawText = i.fields.getTextInputValue('whitelist_ids');
            const idList = rawText.split(/[\s,]+/).filter(id => id.length > 10);
            
            let currentWhitelist = global.arkadasWhitelists.get(i.user.id) || [];
            for (const uid of idList) {
                if (!currentWhitelist.includes(uid)) currentWhitelist.push(uid);
            }

            global.arkadasWhitelists.set(i.user.id, currentWhitelist);
            await i.reply({ content: `<a:emoji110:1537925433763299418> Toplam **${currentWhitelist.length}** adet ID korumaya alındı!`, flags: 64 });
        }

        if (id === 'btn_ark_durdur') {
            global.arkadasTokens.delete(i.user.id);
            global.arkadasWhitelists.delete(i.user.id);
            global.arkadasCache.delete(i.user.id);
            global.arkadasPages.delete(i.user.id);
            await i.reply({ content: '<a:emoji197:1537925769068806214> İşlem durduruldu ve hafıza temizlendi.', flags: 64 });
        }

        if (id === 'btn_ark_baslat') {
            await i.deferReply({ flags: 64 }).catch(() => {});

            const selectedToken = await getValidToken(i.user.id);
            if (!selectedToken) {
                return i.editReply('<a:emoji197:1537925769068806214> Sisteme kayıtlı token bulunamadı!');
            }

            const whitelist = global.arkadasWhitelists.get(i.user.id) || [];

            try {
                const res = await fetch('https://discord.com/api/v9/users/@me/relationships', {
                    headers: { 
                        'Authorization': selectedToken,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                if (!res.ok) {
                    return i.editReply(`<a:emoji197:1537925769068806214> API Hatası! Kod: ${res.status}. Token geçersiz olabilir.`);
                }

                const relationships = await res.json();
                const friends = relationships.filter(r => r.type === 1);

                if (!friends || friends.length === 0) {
                    return i.editReply('<a:emoji197:1537925769068806214> Bu hesabın arkadaş listesi zaten boş!');
                }

                let silinenSayisi = 0;
                let korunanSayisi = 0;

                for (const friend of friends) {
                    if (whitelist.includes(friend.id)) {
                        korunanSayisi++;
                        continue;
                    }

                    const delRes = await fetch(`https://discord.com/api/v9/users/@me/relationships/${friend.id}`, {
                        method: 'DELETE',
                        headers: { 
                            'Authorization': selectedToken,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });

                    if (delRes.ok) {
                        silinenSayisi++;
                    }

                    await new Promise(resolve => setTimeout(resolve, 800));
                }

                return i.editReply({ 
                    content: `<a:emoji110:1537925433763299418> **Arkadaş Listesi Temizlendi!**\n\n` +
                             `• Silinen Arkadaş Sayısı: **${silinenSayisi}**\n` +
                             `• Korunan (Dokunulmayan): **${korunanSayisi}**` 
                });

            } catch (err) {
                console.error("Arkadaş Temizleme Hatası:", err);
                return i.editReply('<a:emoji197:1537925769068806214> Arkadaş listesi temizlenirken hata oluştu.');
            }
        }
    }
};