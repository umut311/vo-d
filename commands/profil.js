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

const delay = ms => new Promise(res => setTimeout(res, ms));

// Discord'un güvenlik sistemini atlatmak için Tarayıcı Kimliği
const superProperties = Buffer.from(JSON.stringify({
    os: "Windows", browser: "Chrome", device: "", system_locale: "tr-TR",
    browser_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    browser_version: "120.0.0.0", os_version: "10", referrer: "", referring_domain: "",
    referrer_current: "", referring_domain_current: "", release_channel: "stable",
    client_build_number: 250000, client_event_source: null
})).toString('base64');

const reqHeaders = (token) => ({
    'Authorization': token, 
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Super-Properties': superProperties,
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Origin': 'https://discord.com',
    'Referer': 'https://discord.com/channels/@me'
});

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

async function patchProfile(token, payload) {
    return await fetch('https://discord.com/api/v9/users/@me', {
        method: 'PATCH',
        headers: reqHeaders(token),
        body: JSON.stringify(payload)
    });
}

module.exports = {
    name: 'profil', 
    async executeText(message, args) {
        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Profil Klonlayıcı (Kimlik Hırsızı) <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Sistem Nasıl Çalışır?**\n' +
                'Kurbanın ID\'sini girersiniz. Sistem **Hayalet Modunda (Anti-Captcha)** çalışarak saniyeler içinde profili kopyalar!\n\n' +
                '<a:uyari:1538527482007789648> **ÖNEMLİ BİLGİLER:**\n' +
                '**1.** **HAYALET MOD AKTİF:** Bot radara yakalanmamak için işlemi parçalara bölerek 3-4 saniyede tamamlar.\n' +
                '**2.** Hesabınızda Nitro yoksa, kurbanın GIF avatarı ve afişi otomatik atlanıp diğer kısımlar çalınır.\n\n' +
                '<a:emoji24:1537925080447717447> *Klonlamayı başlatmak için paneli kullanın.*'
            )
            .setColor('#2b2d31')
            .setThumbnail(serverIcon)
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const linkRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Yeni Token Ekle').setStyle(ButtonStyle.Link).setURL('https://discord.com/channels/1537608795876884642/1537974081461297162')
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
            if (!userAccounts || userAccounts.length === 0) return i.reply({ content: '<a:uyari:1538527482007789648> Sisteme kayıtlı tokenin yok!', flags: 64 });

            const options = userAccounts.map((acc, index) => ({
                label: acc.username || `Hesap ${index + 1}`,
                description: `Token: ${acc.token.substring(0, 15)}...`,
                value: acc.token
            }));

            const selectMenu = new StringSelectMenuBuilder().setCustomId('select_pro_token').setPlaceholder('Kılık değiştirecek hesabı seçin...').addOptions(options);
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await i.reply({ content: '<a:emoji109:1537925984882266212> Kılık değiştirecek hesabı seçin:', components: [row], flags: 64 });
        }

        if (id === 'select_pro_token') {
            global.profilTokens.set(i.user.id, i.values[0]);
            await i.update({ content: '<a:emoji110:1537925433763299418> Hesap başarıyla seçildi! Kurban ID girin.', components: [] });
        }

        if (id === 'btn_pro_kurban') {
            const modal = new ModalBuilder().setCustomId('modal_pro_kurban').setTitle('Kurban Bilgileri');
            const idInput = new TextInputBuilder().setCustomId('kurban_id').setLabel('Kurbanın Discord ID\'si').setPlaceholder('Örn: 345821033414262794').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(idInput));
            await i.showModal(modal);
        }

        if (id === 'modal_pro_kurban') {
            const kurbanId = i.fields.getTextInputValue('kurban_id');
            global.profilTargets.set(i.user.id, kurbanId);
            await i.reply({ content: `<a:emoji110:1537925433763299418> Kurban ID (\`${kurbanId}\`) kilitlendi! Başlatabilirsiniz.`, flags: 64 });
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

            if (!selectedToken) return i.reply({ content: '<a:uyari:1538527482007789648> Sisteme kayıtlı token bulunamadı!', flags: 64 });
            if (!targetId) return i.reply({ content: '<a:uyari:1538527482007789648> Kurban ID belirtilmemiş!', flags: 64 });

            await i.deferReply({ flags: 64 }).catch(() => {});

            try {
                // 1. Kurban verilerini çek
                const profileRes = await fetch(`https://discord.com/api/v9/users/${targetId}/profile?with_mutual_guilds=false`, {
                    headers: reqHeaders(selectedToken)
                });

                if (!profileRes.ok) return i.editReply(`<a:uyari:1538527482007789648> Kurban bulunamadı!`);
                const profileData = await profileRes.json();
                const user = profileData.user;
                
                await i.editReply('<a:emoji58:1537925046486433802> Kurban verileri çekildi, Hayalet Modunda işlem yapılıyor. Lütfen bekleyin...');

                // ===== HAYALET MOD: AŞAMA 1 (METİNLER) =====
                const textPayload = { global_name: user.global_name || user.username, bio: user.bio || "" };
                let tRes = await patchProfile(selectedToken, textPayload);
                if (!tRes.ok) {
                    let err = await tRes.json();
                    if (err.captcha_key) return i.editReply('<a:uyari:1538527482007789648> **HESAPTA CAPTCHA KİLİDİ VAR!**\nToken spamdan kilitlenmiş. Lütfen `v!giris` panelinden hesaba girip ayarları 1 kez manuel kaydederek Captcha\'yı çözün.');
                    return i.editReply(`<a:uyari:1538527482007789648> Metin güncellenirken hata: ${JSON.stringify(err)}`);
                }

                await delay(2000); // 2 saniye insan gibi bekle

                // ===== HAYALET MOD: AŞAMA 2 (AVATAR) =====
                let isAnimatedAvatar = user.avatar && user.avatar.startsWith('a_');
                if (user.avatar) {
                    let ext = isAnimatedAvatar ? 'gif' : 'png';
                    let avatarBase64 = await getBase64Image(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=1024`);
                    
                    let aRes = await patchProfile(selectedToken, { avatar: avatarBase64 });
                    if (!aRes.ok) {
                        let err = await aRes.json();
                        // Nitro hatası alırsa (GIF yüzünden), hareketsiz halini çal
                        if (JSON.stringify(err).includes('PREMIUM_ONLY') && isAnimatedAvatar) {
                            await delay(1000);
                            let staticAv = await getBase64Image(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=1024`);
                            await patchProfile(selectedToken, { avatar: staticAv });
                        }
                    }
                }

                await delay(2000); // 2 saniye insan gibi bekle

                // ===== HAYALET MOD: AŞAMA 3 (AFİŞ & RENK) =====
                let bannerPayload = {};
                if (user.accent_color !== undefined) bannerPayload.accent_color = user.accent_color;
                
                if (user.banner) {
                    let ext = user.banner.startsWith('a_') ? 'gif' : 'png';
                    let bannerBase64 = await getBase64Image(`https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=1024`);
                    if (bannerBase64) bannerPayload.banner = bannerBase64;
                }

                if (Object.keys(bannerPayload).length > 0) {
                    let bRes = await patchProfile(selectedToken, bannerPayload);
                    if (!bRes.ok) {
                        let err = await bRes.json();
                        // Nitro hatası alırsa Afişi at, sadece rengi yapıştır
                        if (JSON.stringify(err).includes('PREMIUM_ONLY')) {
                            delete bannerPayload.banner;
                            if (bannerPayload.accent_color !== undefined) {
                                await delay(1000);
                                await patchProfile(selectedToken, bannerPayload);
                            }
                        }
                    }
                }

                return i.editReply(`<a:emoji110:1537925433763299418> **Hayalet Klonlama Başarılı!**\n\nDiscord radarına yakalanmadan kurbanın (**${user.global_name || user.username}**) tüm profil özellikleri (Nitro destekli/desteksiz) başarıyla kopyalandı!`);

            } catch (err) {
                console.error("Profil Klonlama Hatası:", err);
                return i.editReply('<a:uyari:1538527482007789648> Klonlama sırasında sistemsel hata oluştu.');
            }
        }
    }
};