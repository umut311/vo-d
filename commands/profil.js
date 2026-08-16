const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ 
    userId: String, 
    token: String, 
    username: String, 
    status: String 
}));

if (!global.profilTokens) global.profilTokens = new Map();
if (!global.profilTargets) global.profilTargets = new Map();

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
        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Profil Klonlayıcı (Kimlik Hırsızı) <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Sistem Nasıl Çalışır?**\n' +
                'Belirlediğiniz kurbanın ID\'sini girersiniz. Sistem, seçtiğiniz tokenin profilini saniyeler içinde kurbanın **Görünen Adı, Profil Fotoğrafı, Afişi (Banner), Afiş Rengi ve Hakkında (Bio)** kısmıyla birebir aynı yapar!\n\n' +
                '<a:uyari:1538527482007789648> **ÖNEMLİ BİLGİLER:**\n' +
                '**1.** Eğer kopyalanan hesapta afiş (banner) veya GIF avatar varsa ve kopyalayan hesapta **Nitro yoksa**, sistem akıllı moda geçer. Nitro gerektiren kısımları tamamen es geçip **İsim, Bio, Afiş Rengi ve normal Avatarı** kopyalar.\n' +
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

        if (id === 'btn_pro_sec') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (!userAccounts || userAccounts.length === 0) {
                return i.reply({ content: '<a:uyari:1538527482007789648> Sisteme kayıtlı tokenin yok!', flags: 64 });
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

        if (id === 'btn_pro_durdur') {
            global.profilTokens.delete(i.user.id);
            global.profilTargets.delete(i.user.id);
            await i.reply({ content: '<a:uyari:1538527482007789648> Hedef ve seçili hesap sıfırlandı.', flags: 64 });
        }

        if (id === 'btn_pro_baslat') {
            let selectedToken = global.profilTokens.get(i.user.id);
            
            if (!selectedToken) {
                const userAccs = await Account.find({ userId: i.user.id });
                if (userAccs && userAccs.length > 0) {
                    selectedToken = userAccs[0].token;
                    global.profilTokens.set(i.user.id, selectedToken);
                }
            }

            const targetId = global.profilTargets.get(i.user.id);

            if (!selectedToken) return i.reply({ content: '<a:uyari:1538527482007789648> Sisteme kayıtlı token bulunamadı! Önce hesap ekle.', flags: 64 });
            if (!targetId) return i.reply({ content: '<a:uyari:1538527482007789648> Önce **Kurban ID Gir** butonundan kimi kopyalayacağını belirtmelisin!', flags: 64 });

            await i.deferReply({ flags: 64 }).catch(() => {});

            try {
                // 1. Kurbanın bilgilerini çek
                const profileRes = await fetch(`https://discord.com/api/v9/users/${targetId}/profile?with_mutual_guilds=false`, {
                    headers: { 'Authorization': selectedToken, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });

                if (!profileRes.ok) {
                    return i.editReply(`<a:uyari:1538527482007789648> Kurban bulunamadı veya profil API hatası! (Kod: ${profileRes.status})`);
                }

                const profileData = await profileRes.json();
                const user = profileData.user;
                const bio = user.bio || "";
                const globalName = user.global_name || user.username;
                const accentColor = user.accent_color; // Kurbanın Afiş Rengi

                await i.editReply('<a:emoji58:1537925046486433802> Kurbanın verileri çekildi. Resimler dönüştürülüyor ve profile uygulanıyor...');

                let avatarBase64 = null;
                let isAnimatedAvatar = false;
                if (user.avatar) {
                    isAnimatedAvatar = user.avatar.startsWith('a_');
                    const ext = isAnimatedAvatar ? 'gif' : 'png';
                    avatarBase64 = await getBase64Image(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=1024`);
                }

                let bannerBase64 = null;
                if (user.banner) {
                    const ext = user.banner.startsWith('a_') ? 'gif' : 'png';
                    bannerBase64 = await getBase64Image(`https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=1024`);
                }

                // Ana Payload (Her şeyi içerir)
                let payload = {
                    global_name: globalName,
                    bio: bio
                };
                
                // Renk ve resim verilerini ekle
                if (accentColor !== undefined && accentColor !== null) payload.accent_color = accentColor;
                if (avatarBase64) payload.avatar = avatarBase64;
                if (bannerBase64) payload.banner = bannerBase64;

                // 2. Full paketi Discord'a gönder
                let updateRes = await fetch('https://discord.com/api/v9/users/@me', {
                    method: 'PATCH',
                    headers: { 
                        'Authorization': selectedToken, 
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    body: JSON.stringify(payload)
                });

                // 3. EĞER NİTRO HATASI VERİRSE (Akıllı Kurtarma Modu)
                if (!updateRes.ok) {
                    const errData = await updateRes.json();
                    const errString = JSON.stringify(errData);

                    if (errString.includes('PREMIUM_ONLY')) {
                        // Afiş (Banner) her halükarda Nitro ister. Hata vermemesi için KEY'i tamamen siliyoruz!
                        delete payload.banner; 

                        // Eğer profil fotoğrafı GIF ise onu PNG'ye (hareketsiz) çevirip öyle çalmayı dene.
                        if (isAnimatedAvatar) {
                            payload.avatar = await getBase64Image(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=1024`);
                        }

                        // Kurtarma (Fallback) Paketi ile tekrar saldır
                        updateRes = await fetch('https://discord.com/api/v9/users/@me', {
                            method: 'PATCH',
                            headers: { 
                                'Authorization': selectedToken, 
                                'Content-Type': 'application/json',
                                'User-Agent': 'Mozilla/5.0'
                            },
                            body: JSON.stringify(payload)
                        });

                        if (updateRes.ok) {
                            return i.editReply(`<a:emoji110:1537925433763299418> **Operasyon Kısmen Başarılı!**\n\nBu hesapta Nitro olmadığı için kurbanın resimli afişi (banner) kopyalanamadı. Ancak **İsim, Bio, Afiş Rengi ve Profil Fotoğrafı** başarıyla çalındı!`);
                        } else {
                            const finalErr = await updateRes.json();
                            return i.editReply(`<a:uyari:1538527482007789648> Nitro ayarları atlanmasına rağmen hata oldu: ${JSON.stringify(finalErr)}`);
                        }
                    }

                    // Nitro harici başka bir hataysa direkt ekrana bas
                    return i.editReply(`<a:uyari:1538527482007789648> Profil güncellenirken hata oluştu! Hata: ${errString}`);
                }

                // İlk denemede her şey kusursuz çalıştıysa
                return i.editReply(`<a:emoji110:1537925433763299418> **Operasyon Başarılı!**\n\nHesap kusursuz bir şekilde kurbanın (**${globalName}**) ikizine dönüştürüldü. Kurbanın tüm Görünen Adı, Profil Resmi, Afişi ve Biyografisi başarıyla çalındı!`);

            } catch (err) {
                console.error("Profil Klonlama Hatası:", err);
                return i.editReply('<a:uyari:1538527482007789648> Klonlama sırasında sistemsel bir hata oluştu.');
            }
        }
    }
};