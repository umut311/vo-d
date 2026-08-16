const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ 
    userId: String, 
    token: String, 
    username: String, 
    status: String 
}));

// Kullanıcıların seçtiği token ve güvenli ID'leri (whitelist) hafızada tutmak için
if (!global.arkadasTokens) global.arkadasTokens = new Map();
if (!global.arkadasWhitelists) global.arkadasWhitelists = new Map();

module.exports = {
    name: 'arkadas', 
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('<a:emoji197:1537925769068806214> Bu paneli kurmak için Yönetici yetkisine sahip olmalısın!');
        }

        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Arkadaş Listesi Temizleyici <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Sistem Nasıl Çalışır?**\n' +
                'Seçtiğiniz **Selfbot hesabı** ile arkadaş listeniz taranır. Belirttiğiniz **korumalı ID\'ler hariç** listedeki herkes arkadaşlıktan silinir!\n\n' +
                '⚠️ **NASIL KULLANILIR?**\n' +
                '**1.** **Kayıtlılardan Seç** butonu ile temizliği yapacak hesabı seçin.\n' +
                '**2.** **Korunacak ID Gir** butonuna basarak silinmesini istemediğiniz kişilerin ID\'lerini yazın (birden fazla ise boşluk veya virgül koyun).\n' +
                '**3.** **Başlat** butonuna basarak temizliği fişekleyin!\n\n' +
                '<a:emoji24:1537925080447717447> *Aşağıdaki butonları kullanarak paneli yönetin.*'
            )
            .setColor('#2b2d31')
            .setThumbnail(serverIcon)
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        // 1. Satır: Yeni Token Ekle (Link Butonu)
        const linkRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Yeni Token Ekle')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/channels/1537608795876884642/1537974081461297162')
        );

        // 2. Satir: İşlem Butonları
        const actionRow1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ark_sec').setLabel('Kayıtlılardan Seç').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_ark_whitelist').setLabel('Korunacak ID Gir').setStyle(ButtonStyle.Secondary)
        );

        // 3. Satir: Başlat / Durdur
        const actionRow2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ark_baslat').setLabel('Başlat').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_ark_durdur').setLabel('Durdur').setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({ embeds: [embed], components: [linkRow, actionRow1, actionRow2] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return i.reply({ content: '<a:emoji197:1537925769068806214> Bu işlemi yapmak için Yönetici yetkisine sahip olmalısın!', flags: 64 });
        }

        // 1. KAYITLILARDAN SEÇ BUTONU
        if (id === 'btn_ark_sec') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (!userAccounts || userAccounts.length === 0) {
                return i.reply({ content: '<a:emoji197:1537925769068806214> Sisteme kayıtlı tokenin yok! Önce Yeni Token Ekle butonundan hesap ekle.', flags: 64 });
            }

            const options = userAccounts.map((acc, index) => ({
                label: acc.username || `Hesap ${index + 1}`,
                description: `Token: ${acc.token.substring(0, 15)}...`,
                value: acc.token
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_ark_token')
                .setPlaceholder('Temizlik yapılacak hesabı seçin...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await i.reply({ content: '<a:emoji109:1537925984882266212> Temizliği hangi hesapla yapacaksın? Lütfen seç:', components: [row], flags: 64 });
        }

        // 2. MENÜDEN HESAP SEÇİLDİĞİNDE
        if (id === 'select_ark_token') {
            const selectedToken = i.values[0];
            global.arkadasTokens.set(i.user.id, selectedToken);
            await i.update({ content: '<a:emoji110:1537925433763299418> Hesap başarıyla seçildi! Şimdi **Korunacak ID Gir** butonuna basarak silinmeyecek kişileri ekleyebilirsin.', components: [] });
        }

        // 3. KORUNACAK ID GİR (MODAL AÇAR)
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

        // 4. WHITELIST MODALI GÖnderİLİNCE
        if (id === 'modal_ark_whitelist') {
            const rawText = i.fields.getTextInputValue('whitelist_ids');
            // ID'leri diziye çevir (boşluk, virgül veya yeni satıra göre ayırır)
            const idList = rawText.split(/[\s,]+/).filter(id => id.length > 10);
            
            global.arkadasWhitelists.set(i.user.id, idList);
            await i.reply({ content: `<a:emoji110:1537925433763299418> Korumaya alınan **${idList.length}** adet ID sisteme kaydedildi! Artık **Başlat** butonuna basabilirsin.`, flags: 64 });
        }

        // 5. DURDUR BUTONU
        if (id === 'btn_ark_durdur') {
            global.arkadasTokens.delete(i.user.id);
            global.arkadasWhitelists.delete(i.user.id);
            await i.reply({ content: '<a:emoji197:1537925769068806214> İşlem durduruldu ve hafıza temizlendi.', flags: 64 });
        }

        // 6. BAŞLAT BUTONU (TEMİZLİĞİ BAŞLATIR)
        if (id === 'btn_ark_baslat') {
            await i.deferReply({ flags: 64 });

            const selectedToken = global.arkadasTokens.get(i.user.id);
            if (!selectedToken) {
                return i.editReply('<a:emoji197:1537925769068806214> Önce **Kayıtlılardan Seç** butonuna basarak bir hesap belirlemelisin!');
            }

            const whitelist = global.arkadasWhitelists.get(i.user.id) || [];

            try {
                // Arkadaş listesini çek (Discord API relationships endpoint)
                const res = await fetch('https://discord.com/api/v9/users/@me/relationships', {
                    headers: { 'Authorization': selectedToken }
                });

                if (res.status === 401 || res.status === 403) {
                    return i.editReply('<a:emoji197:1537925769068806214> Token geçersiz veya yetkisiz!');
                }

                const relationships = await res.json();
                // type === 1 demek ekli arkadaşlar demektir
                const friends = relationships.filter(r => r.type === 1);

                if (friends.length === 0) {
                    return i.editReply('<a:emoji197:1537925769068806214> Bu hesabın arkadaş listesi zaten boş!');
                }

                let silinenSayisi = 0;
                let korunanSayisi = 0;

                for (const friend of friends) {
                    // Eğer kullanıcı whitelist (korunan) listesindeyse silme
                    if (whitelist.includes(friend.id)) {
                        korunanSayisi++;
                        continue;
                    }

                    // Arkadaşı sil (DELETE relationships)
                    const delRes = await fetch(`https://discord.com/api/v9/users/@me/relationships/${friend.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': selectedToken }
                    });

                    if (delRes.ok) {
                        silinenSayisi++;
                    }

                    // Rate limit yememek için araya mini bir gecikme koyalım
                    await new Promise(resolve => setTimeout(resolve, 800));
                }

                return i.editReply({ 
                    content: `<a:emoji110:1537925433763299418> **Arkadaş Listesi Temizlendi!**\n\n` +
                             `• Silinen Arkadaş Sayısı: **${silinenSayisi}**\n` +
                             `• Korunan (Dokunulmayan): **${korunanSayisi}**` 
                });

            } catch (err) {
                console.error("Arkadaş Temizleme Hatası:", err);
                return i.editReply('<a:emoji197:1537925769068806214> Arkadaş listesi temizlenirken bir hata oluştu.');
            }
        }
    }
};