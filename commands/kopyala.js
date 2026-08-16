const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');

// Selfbot hesabımızı veritabanından çekebilmek için Modeli tanımlıyoruz
const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ 
    userId: String, 
    token: String, 
    username: String, 
    status: String 
}));

// Kullanıcının seçtiği tokeni anlık olarak hafızada tutmak için
if (!global.kopyalaTokens) global.kopyalaTokens = new Map();

module.exports = {
    name: 'kopyala', 
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('<a:emoji197:1537925769068806214> Bu paneli kurmak için Yönetici yetkisine sahip olmalısın!');
        }

        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Sunucu Şablon Çıkarıcı <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Sistem Nasıl Çalışır?**\n' +
                'Kayıtlı **Selfbot hesabınız** üzerinden kaynak sunucuya sızılır ve o sunucunun resmi **Discord Şablon Linki** (`discord.new/...`) çıkarılır.\n\n' +
                '⚠️ **ÖNEMLİ BİLGİLER:**\n' +
                '**1.** Önce **Kayıtlılardan Seç** butonuna basarak şablonu hangi hesabınızla çıkaracağınızı belirleyin.\n' +
                '**2.** Seçtiğiniz hesabın hedef sunucuda **"Sunucuyu Yönet"** yetkisi olması ŞARTTIR.\n' +
                '**3.** Linke tıkladığınızda Discord size kanalları hazır yepyeni bir sunucu açar!\n\n' +
                '<a:emoji24:1537925080447717447> *Aşağıdan hesabınızı seçip işlemi başlatın.*'
            )
            .setColor('#2b2d31')
            .setThumbnail(serverIcon)
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        // 1. SATIR: Yeni Token Ekle (Link Butonu)
        const linkRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Yeni Token Ekle')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/channels/1537608795876884642/1537974081461297162')
        );

        // 2. SATIR: İşlem Butonları
        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_kop_sec').setLabel('Kayıtlılardan Seç').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_kop_baslat').setLabel('Başlat').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_kop_durdur').setLabel('Durdur').setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({ embeds: [embed], components: [linkRow, actionRow] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return i.reply({ content: '<a:emoji197:1537925769068806214> Bu işlemi yapmak için Yönetici yetkisine sahip olmalısın!', flags: 64 });
        }

        // 1. KAYITLILARDAN SEÇ BUTONU
        if (id === 'btn_kop_sec') {
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
                .setCustomId('select_kop_token')
                .setPlaceholder('Şablon çekilecek hesabı seçin...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await i.reply({ content: '<a:emoji109:1537925984882266212> Şablonu hangi hesapla çekeceksin? Lütfen seç:', components: [row], flags: 64 });
        }

        // 2. MENÜDEN HESAP SEÇİLDİĞİNDE
        if (id === 'select_kop_token') {
            const selectedToken = i.values[0];
            global.kopyalaTokens.set(i.user.id, selectedToken);
            await i.update({ content: '<a:emoji110:1537925433763299418> Hesap başarıyla seçildi! Artık **Başlat** butonuna basabilirsin.', components: [] });
        }

        // 3. DURDUR BUTONU
        if (id === 'btn_kop_durdur') {
            global.kopyalaTokens.delete(i.user.id);
            await i.reply({ content: '<a:emoji197:1537925769068806214> İşlem durduruldu ve hesap seçimi temizlendi.', flags: 64 });
        }

        // 4. BAŞLAT BUTONU (FORMU AÇAR)
        if (id === 'btn_kop_baslat') {
            const selectedToken = global.kopyalaTokens.get(i.user.id);
            if (!selectedToken) {
                return i.reply({ content: '<a:emoji197:1537925769068806214> Önce **Kayıtlılardan Seç** butonuna basarak bir hesap belirlemelisin!', flags: 64 });
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

        // 5. FORM DOLDURULUNCA ÇALIŞACAK KISIM (AKTİF OLMASINA GEREK YOK)
        if (id === 'modal_sunucu_kopyala') {
            await i.deferReply({ flags: 64 });

            const kaynakId = i.fields.getTextInputValue('kaynak_id');
            const selectedToken = global.kopyalaTokens.get(i.user.id);

            if (!selectedToken) {
                return i.editReply('<a:emoji197:1537925769068806214> Seçili hesabın hafızadan silinmiş, tekrar hesap seçimi yap.');
            }

            try {
                // Discord API'sine ajan gibi doğrudan istek (fetch) atıyoruz
                const getRes = await fetch(`https://discord.com/api/v9/guilds/${kaynakId}/templates`, {
                    headers: { 'Authorization': selectedToken }
                });
                
                if (getRes.status === 401 || getRes.status === 403) {
                    return i.editReply('<a:emoji197:1537925769068806214> Bu token geçersiz veya bu sunucuda **"Sunucuyu Yönet"** yetkisi yok!');
                }
                
                const data = await getRes.json();
                let templateCode = null;

                if (data && data.length > 0) {
                    // Şablon zaten varsa, en güncel haline senkronize et
                    templateCode = data[0].code;
                    await fetch(`https://discord.com/api/v9/guilds/${kaynakId}/templates/${templateCode}`, {
                        method: 'PUT',
                        headers: { 'Authorization': selectedToken }
                    });
                } else {
                    // Şablon yoksa sıfırdan oluştur
                    const createRes = await fetch(`https://discord.com/api/v9/guilds/${kaynakId}/templates`, {
                        method: 'POST',
                        headers: {
                            'Authorization': selectedToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name: 'Void Şablon', description: 'Void tarafından sızdırıldı.' })
                    });
                    
                    const createData = await createRes.json();
                    if (createData.code) {
                        templateCode = createData.code;
                    } else {
                        return i.editReply('<a:emoji197:1537925769068806214> Şablon oluşturulamadı. Sunucuda yeterli yetkiniz olmayabilir.');
                    }
                }

                return i.editReply({ 
                    content: `<a:emoji110:1537925433763299418> **Şablon Başarıyla Çalındı!**\n\nAşağıdaki linke tıklayarak sıfırdan, kanalları dizili yepyeni bir sunucu açabilirsin:\n**https://discord.new/${templateCode}**` 
                });

            } catch (err) {
                console.error("REST Şablon Çekme Hatası:", err);
                return i.editReply('<a:emoji197:1537925769068806214> Şablon linki çıkarılamadı! Bir hata oluştu.');
            }
        }
    }
};