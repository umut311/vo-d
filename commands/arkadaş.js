const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ 
    userId: String, 
    token: String, 
    username: String, 
    status: String 
}));

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
                '**2.** **Arkadaşları Gör** butonuna basarak mevcut tüm arkadaşlarınızı ve ID\'lerini kolayca kopyalayabilirsiniz.\n' +
                '**3.** **Korunacak ID Gir** butonuna basarak silinmesini istemediğiniz kişilerin ID\'lerini yazın.\n' +
                '**4.** **Başlat** butonuna basarak temizliği fişekleyin!\n\n' +
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
                .setURL('[https://discord.com/channels/1537608795876884642/1537974081461297162](https://discord.com/channels/1537608795876884642/1537974081461297162)')
        );

        const actionRow1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ark_sec').setLabel('Kayıtlılardan Seç').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_ark_gor').setLabel('Arkadaşları Gör').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_ark_whitelist').setLabel('Korunacak ID Gir').setStyle(ButtonStyle.Secondary)
        );

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
                .setPlaceholder('İşlem yapılacak hesabı seçin...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await i.reply({ content: '<a:emoji109:1537925984882266212> Hangi hesapla işlem yapacaksın? Lütfen seç:', components: [row], flags: 64 });
        }

        if (id === 'select_ark_token') {
            const selectedToken = i.values[0];
            global.arkadasTokens.set(i.user.id, selectedToken);
            await i.update({ content: '<a:emoji110:1537925433763299418> Hesap başarıyla seçildi!', components: [] });
        }

        // ARKADAŞLARI GÖR (KOPYALANABİLİR MOBİL & PC UYUMLU KOD BLOK)
        if (id === 'btn_ark_gor') {
            const selectedToken = global.arkadasTokens.get(i.user.id);
            if (!selectedToken) {
                return i.reply({ content: '<a:emoji197:1537925769068806214> Önce **Kayıtlılardan Seç** butonuna basarak bir hesap belirlemelisin!', flags: 64 });
            }

            await i.deferReply({ flags: 64 });

            try {
                const res = await fetch('[https://discord.com/api/v9/users/@me/relationships](https://discord.com/api/v9/users/@me/relationships)', {
                    headers: { 'Authorization': selectedToken }
                });

                if (res.status === 401 || res.status === 403) {
                    return i.editReply('<a:emoji197:1537925769068806214> Token geçersiz veya yetkisiz!');
                }

                const relationships = await res.json();
                const friends = relationships.filter(r => r.type === 1);

                if (friends.length === 0) {
                    return i.editReply('<a:emoji197:1537925769068806214> Bu hesabın arkadaş listesi boş.');
                }

                let textList = friends.map(f => `${f.user.username} - ${f.user.id}`).join('\n');
                
                if (textList.length > 1950) {
                    textList = textList.substring(0, 1900) + '\n... (Liste çok uzun olduğu için kısaltıldı)';
                }

                await i.editReply({
                    content: `<a:emoji110:1537925433763299418> **Mevcut Arkadaş Listesi (${friends.length} kişi):**\n\`\`\`text\n${textList}\n\`\`\``
                });

            } catch (err) {
                console.error("Arkadaşları Listeleme Hatası:", err);
                await i.editReply('<a:emoji197:1537925769068806214> Arkadaş listesi alınırken bir hata oluştu.');
            }
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
            
            global.arkadasWhitelists.set(i.user.id, idList);
            await i.reply({ content: `<a:emoji110:1537925433763299418> Korumaya alınan **${idList.length}** adet ID sisteme kaydedildi!`, flags: 64 });
        }

        if (id === 'btn_ark_durdur') {
            global.arkadasTokens.delete(i.user.id);
            global.arkadasWhitelists.delete(i.user.id);
            await i.reply({ content: '<a:emoji197:1537925769068806214> İşlem durduruldu ve hafıza temizlendi.', flags: 64 });
        }

        if (id === 'btn_ark_baslat') {
            await i.deferReply({ flags: 64 });

            const selectedToken = global.arkadasTokens.get(i.user.id);
            if (!selectedToken) {
                return i.editReply('<a:emoji197:1537925769068806214> Önce **Kayıtlılardan Seç** butonuna basarak bir hesap belirlemelisin!');
            }

            const whitelist = global.arkadasWhitelists.get(i.user.id) || [];

            try {
                const res = await fetch('[https://discord.com/api/v9/users/@me/relationships](https://discord.com/api/v9/users/@me/relationships)', {
                    headers: { 'Authorization': selectedToken }
                });

                if (res.status === 401 || res.status === 403) {
                    return i.editReply('<a:emoji197:1537925769068806214> Token geçersiz veya yetkisiz!');
                }

                const relationships = await res.json();
                const friends = relationships.filter(r => r.type === 1);

                if (friends.length === 0) {
                    return i.editReply('<a:emoji197:1537925769068806214> Bu hesabın arkadaş listesi zaten boş!');
                }

                let silinenSayisi = 0;
                let korunanSayisi = 0;

                for (const friend of friends) {
                    if (whitelist.includes(friend.id)) {
                        korunanSayisi++;
                        continue;
                    }

                    const delRes = await fetch(`[https://discord.com/api/v9/users/@me/relationships/$](https://discord.com/api/v9/users/@me/relationships/$){friend.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': selectedToken }
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
                return i.editReply('<a:emoji197:1537925769068806214> Arkadaş listesi temizlenirken bir hata oluştu.');
            }
        }
    }
};