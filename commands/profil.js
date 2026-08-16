const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');

// Veritabanı modeli
const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ 
    userId: String, 
    token: String, 
    username: String, 
    status: String 
}));

if (!global.profilTokens) global.profilTokens = new Map();
if (!global.profilTargets) global.profilTargets = new Map();

// Base64 Fotoğraf Dönüştürücü (Discord API'sine fotoğrafı böyle yolluyoruz)
async function getBase64Image(url) {
    if (!url) return null;
    try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mime = url.includes('.gif') ? 'image/gif' : 'image/png';
        return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (e) {
        console.error("Resim dönüştürme hatası:", e);
        return null;
    }
}

module.exports = {
    name: 'profil', 
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('<a:emoji197:1537925769068806214> Bu paneli kurmak için Yönetici yetkisine sahip olmalısın!');
        }

        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Profil Klonlayıcı (Kimlik Hırsızı) <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Sistem Nasıl Çalışır?**\n' +
                'Belirlediğiniz kurbanın ID\'sini girersiniz. Sistem, seçtiğiniz tokenin profilini saniyeler içinde kurbanın **Görünen Adı, Profil Fotoğrafı, Afişi (Banner) ve Hakkında (Bio)** kısmıyla birebir aynı yapar!\n\n' +
                '⚠️ **ÖNEMLİ BİLGİLER:**\n' +
                '**1.** Kurbanın profilinde **hareketli (GIF) PP veya Banner** varsa, bunları kopyalayabilmek için işlem yapılan tokende **Nitro** olması gerekmektedir.\n' +
                '**2.** Discord API kısıtlamaları gereği orijinal `@username` değiştirilmez, bunun yerine birebir aynı yapılabilen **Görünen Ad (Display Name)** kopyalanır.\n\n' +
                '<a:emoji24:1537925080447717447> *Klonlamayı başlatmak için paneli kullanın.*'
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
            new ButtonBuilder().setCustomId('btn_pro_sec').setLabel('Hesap Seç').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_pro_kurban').setLabel('Kurban ID Gir').setStyle(ButtonStyle.Secondary)
        );

        const actionRow2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_pro_baslat').setLabel('Klonlamayı Başlat').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_pro_durdur').setLabel('Sıfırla').setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({ embeds: [embed], components: [linkRow, actionRow1, actionRow2] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return i.reply({ content: '<a:emoji197:1537925769068806214> Bu işlemi yapmak için Yönetici yetkisine sahip olmalısın!', flags: 64 });
        }

        // HESAP SEÇME
        if (id === 'btn_pro_sec') {
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
                .setCustomId('select_pro_token')
                .setPlaceholder('Kılık değiştirecek hesabı seçin...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await i.reply({ content: '<a:emoji109:1537925984882266212> Kılık değiştirecek (klonlanacak) hesabı seçin:', components: [row], flags: 64 });
        }

        if (id === 'select_pro_token') {
            global.profilTokens.set(i.user.id, i.values[0]);
            await i.update({ content: '<a:emoji110:1537925433763299418> Hesap başarıyla seçildi! Şimdi Kurban ID Gir butonuna basın.', components: [] });
        }

        // KURBAN ID GİRME MODALI
        if (id === 'btn_pro_kurban') {
            const modal = new ModalBuilder()
                .setCustomId('modal_pro_kurban')
                .setTitle('Kurban Bilgileri');

            const idInput = new TextInputBuilder()
                .setCustomId('kurban_id')
                .setLabel('Kurbanın Discord ID\'si')
                .setPlaceholder('Örn: 345821033414262794')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(idInput));
            await i.showModal(modal);
        }

        if (id === 'modal_pro_kurban') {
            const kurbanId = i.fields.getTextInputValue('kurban_id');
            global.profilTargets.set(i.user.id, kurbanId);
            await i.reply({ content: `<a:emoji110:1537925433763299418> Kurban ID (\`${kurbanId}\`) sisteme kilitlendi! Klonlamayı başlatabilirsiniz.`, flags: 64 });
        }

        // SIFIRLA
        if (id === 'btn_pro_durdur') {
            global.profilTokens.delete(i.user.id);
            global.profilTargets.delete(i.user.id);
            await i.reply({ content: '<a:emoji197:1537925769068806214> Hedef ve seçili hesap sıfırlandı.', flags: 64 });
        }

        // KLONLAMAYI BAŞLAT
        if (id === 'btn_pro_baslat') {
            const selectedToken = global.profilTokens.get(i.user.id);
            const targetId = global.profilTargets.get(i.user.id);

            if (!selectedToken) return i.reply({ content: '<a:emoji197:1537925769068806214> Önce **Hesap Seç** butonundan bir kılık değiştirecek hesap seçmelisin!', flags: 64 });
            if (!targetId) return i.reply({ content: '<a:emoji197:1537925769068806214> Önce **Kurban ID Gir** butonundan kimi kopyalayacağını belirtmelisin!', flags: 64 });

            await i.deferReply({ flags: 64 }).catch(() => {});

            try {
                // 1. Kurbanın bilgilerini API'den ajan gibi çek
                const profileRes = await fetch(`https://discord.com/api/v9/users/${targetId}/profile?with_mutual_guilds=false`, {
                    headers: { 'Authorization': selectedToken, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });

                if (!profileRes.ok) {
                    return i.editReply(`<a:emoji197:1537925769068806214> Kurban bulunamadı veya profil API hatası! (Kod: ${profileRes.status})`);
                }

                const profileData = await profileRes.json();
                const user = profileData.user;
                const bio = user.bio || "";
                const globalName = user.global_name || user.username;

                await i.editReply('<a:emoji58:1537925046486433802> Kurbanın verileri çekildi. Resimler dönüştürülüyor ve profile uygulanıyor...');

                // 2. Avatar ve Banner'ı Base64'e dönüştür
                let avatarBase64 = null;
                if (user.avatar) {
                    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
                    avatarBase64 = await getBase64Image(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=1024`);
                }

                let bannerBase64 = null;
                if (user.banner) {
                    const ext = user.banner.startsWith('a_') ? 'gif' : 'png';
                    bannerBase64 = await getBase64Image(`https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=1024`);
                }

                // 3. Seçili tokenin profiline kurbanın verilerini yamala (PATCH)
                const updateRes = await fetch('https://discord.com/api/v9/users/@me', {
                    method: 'PATCH',
                    headers: { 
                        'Authorization': selectedToken, 
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    body: JSON.stringify({
                        global_name: globalName,
                        bio: bio,
                        avatar: avatarBase64,
                        banner: bannerBase64
                    })
                });

                if (!updateRes.ok) {
                    const errData = await updateRes.json();
                    if (errData.avatar || errData.banner) {
                        return i.editReply('<a:emoji197:1537925769068806214> **Klonlama Başarısız!**\nKurbanın hareketli (GIF) avatarı veya bannerı var, bunu kopyalamak için bu hesabında **Discord Nitro** olması gerekiyor.');
                    }
                    return i.editReply(`<a:emoji197:1537925769068806214> Profil güncellenirken hata oluştu! Hata: ${JSON.stringify(errData)}`);
                }

                return i.editReply(`<a:emoji110:1537925433763299418> **Operasyon Başarılı!**\n\nHesap kusursuz bir şekilde kurbanın (**${globalName}**) ikizine dönüştürüldü. Kurbanın tüm Görünen Adı, Profil Resmi, Afişi ve Biyografisi başarıyla çalındı!`);

            } catch (err) {
                console.error("Profil Klonlama Hatası:", err);
                return i.editReply('<a:emoji197:1537925769068806214> Klonlama sırasında sistemsel bir hata oluştu.');
            }
        }
    }
};