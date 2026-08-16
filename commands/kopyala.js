const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ 
    userId: String, 
    token: String, 
    username: String, 
    status: String 
}));

if (!global.kopyalaTokens) global.kopyalaTokens = new Map();

async function getValidToken(userId) {
    let token = global.kopyalaTokens.get(userId);
    if (!token) {
        const userAccs = await Account.find({ userId: userId });
        if (userAccs && userAccs.length > 0) {
            token = userAccs[0].token;
            global.kopyalaTokens.set(userId, token);
        }
    }
    return token;
}

module.exports = {
    name: 'kopyala', 
    async executeText(message, args) {
        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Sunucu Şablon Çıkarıcı <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Sistem Nasıl Çalışır?**\n' +
                'Kayıtlı **Selfbot hesabınız** üzerinden kaynak sunucuya sızılır ve o sunucunun resmi **Discord Şablon Linki** (`discord.new/...`) çıkarılır.\n\n' +
                '<a:uyari:1538527482007789648> **ÖNEMLİ BİLGİLER:**\n' +
                '**1.** Sisteme kayıtlı hesabınız **otomatik olarak seçilir**, dilerseniz **Hesap Seç** ile değiştirebilirsiniz.\n' +
                '**2.** İşlem yapılan hesabın hedef sunucuda **"Sunucuyu Yönet"** yetkisi olması ŞARTTIR.\n' +
                '**3.** Linke tıkladığınızda Discord size kanalları hazır yepyeni bir sunucu açar!\n\n' +
                '<a:emoji24:1537925080447717447> *Aşağıdan hesabınızı seçip işlemi başlatın.*'
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

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_kop_sec').setLabel('Hesap Seç').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_kop_baslat').setLabel('Başlat').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_kop_durdur').setLabel('Sıfırla').setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({ embeds: [embed], components: [linkRow, actionRow] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        if (id === 'btn_kop_sec') {
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
                .setCustomId('select_kop_token')
                .setPlaceholder('Şablon çekilecek hesabı seçin...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await i.reply({ content: '<a:emoji109:1537925984882266212> Şablonu hangi hesapla çekeceksin? Lütfen seç:', components: [row], flags: 64 });
        }

        if (id === 'select_kop_token') {
            const selectedToken = i.values[0];
            global.kopyalaTokens.set(i.user.id, selectedToken);
            await i.update({ content: '<a:emoji110:1537925433763299418> Hesap başarıyla seçildi! Artık **Başlat** butonuna basabilirsin.', components: [] });
        }

        if (id === 'btn_kop_durdur') {
            global.kopyalaTokens.delete(i.user.id);
            await i.reply({ content: '<a:uyari:1538527482007789648> İşlem durduruldu ve hesap seçimi temizlendi.', flags: 64 });
        }

        if (id === 'btn_kop_baslat') {
            const selectedToken = await getValidToken(i.user.id);
            if (!selectedToken) {
                return i.reply({ content: '<a:uyari:1538527482007789648> Sisteme kayıtlı token bulunamadı! Önce Yeni Token Ekle butonundan hesap ekle.', flags: 64 });
            }

            const modal = new ModalBuilder()
                .setCustomId('modal_sunucu_kopyala')
                .setTitle('Şablonu Çıkarılacak Sunucu');

            const kaynakInput = new TextInputBuilder()
                .setCustomId('kaynak_id')
                .setLabel('Kaynak Sunucu ID')
                .setPlaceholder('Örn: 111111111111111111')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(kaynakInput));
            await i.showModal(modal);
        }

        if (id === 'modal_sunucu_kopyala') {
            await i.deferReply({ flags: 64 }).catch(() => {});

            const kaynakId = i.fields.getTextInputValue('kaynak_id');
            const selectedToken = await getValidToken(i.user.id);

            if (!selectedToken) {
                return i.editReply('<a:uyari:1538527482007789648> Seçili hesabın hafızadan silinmiş, tekrar hesap seçimi yap.');
            }

            try {
                const getRes = await fetch(`https://discord.com/api/v9/guilds/${kaynakId}/templates`, {
                    headers: { 
                        'Authorization': selectedToken,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (getRes.status === 401 || getRes.status === 403) {
                    return i.editReply('<a:uyari:1538527482007789648> Bu token geçersiz veya bu sunucuda **"Sunucuyu Yönet"** yetkisi yok!');
                }
                
                const data = await getRes.json();
                let templateCode = null;

                if (data && data.length > 0) {
                    templateCode = data[0].code;
                    await fetch(`https://discord.com/api/v9/guilds/${kaynakId}/templates/${templateCode}`, {
                        method: 'PUT',
                        headers: { 
                            'Authorization': selectedToken,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                } else {
                    const createRes = await fetch(`https://discord.com/api/v9/guilds/${kaynakId}/templates`, {
                        method: 'POST',
                        headers: {
                            'Authorization': selectedToken,
                            'Content-Type': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        body: JSON.stringify({ name: 'Void Şablon', description: 'Void tarafından sızdırıldı.' })
                    });
                    
                    const createData = await createRes.json();
                    if (createData.code) {
                        templateCode = createData.code;
                    } else {
                        return i.editReply('<a:uyari:1538527482007789648> Şablon oluşturulamadı. Sunucuda yeterli yetkiniz olmayabilir.');
                    }
                }

                return i.editReply({ 
                    content: `<a:emoji110:1537925433763299418> **Şablon Başarıyla Çalındı!**\n\nAşağıdaki linke tıklayarak sıfırdan, kanalları dizili yepyeni bir sunucu açabilirsin:\n**https://discord.new/${templateCode}**` 
                });

            } catch (err) {
                console.error("REST Şablon Çekme Hatası:", err);
                return i.editReply('<a:uyari:1538527482007789648> Şablon linki çıkarılamadı! Bir hata oluştu.');
            }
        }
    }
};