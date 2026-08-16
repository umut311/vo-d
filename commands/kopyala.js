const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

// Selfbot hesabımızı veritabanından çekebilmek için Modeli tanımlıyoruz
const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ 
    userId: String, 
    token: String, 
    username: String, 
    status: String 
}));

module.exports = {
    name: 'kopyala', 
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('<:emoji197:1537925769068806214> Bu paneli kurmak için Yönetici yetkisine sahip olmalısın!');
        }

        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Sunucu Şablon Çıkarıcı <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Sistem Nasıl Çalışır?**\n' +
                'Sisteme eklediğiniz **Selfbot hesabınız** üzerinden kaynak sunucuya sızılır ve o sunucunun resmi **Discord Şablon Linki** (`discord.new/...`) çıkarılır.\n\n' +
                '⚠️ **ÖNEMLİ BİLGİLER:**\n' +
                '**1.** Ana botun (Void) hiçbir sunucuda olmasına gerek yoktur.\n' +
                '**2.** Sisteme eklediğiniz hesabınızın (tokenin) şablonu alınacak sunucuda **"Sunucuyu Yönet"** yetkisi olması ŞARTTIR.\n' +
                '**3.** Linke tıkladığınızda Discord size kanalları hazır yepyeni bir sunucu açar!\n\n' +
                '<a:emoji24:1537925080447717447> *İşlemi başlatmak için butona tıklayın.*'
            )
            .setColor('#2b2d31')
            .setThumbnail(serverIcon)
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_kopyala_ac')
                .setLabel('Şablon Linki Çıkar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('1537925046486433802')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return i.reply({ content: '<:emoji197:1537925769068806214> Bu işlemi yapmak için Yönetici yetkisine sahip olmalısın!', flags: 64 });
        }

        if (id === 'btn_kopyala_ac') {
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
            await i.reply({ content: '<a:emoji58:1537925046486433802> **Sisteme sızılıyor, veritabanı kontrol ediliyor...**', flags: 64 });

            const kaynakId = i.fields.getTextInputValue('kaynak_id');

            // 1. SELF BOT HESABINI BUL
            const userAccounts = await Account.find({ userId: i.user.id });
            if (!userAccounts || userAccounts.length === 0) {
                return i.editReply('<:emoji197:1537925769068806214> Sisteme kayıtlı tokenin (hesabın) yok! Önce `v!hesap` ile hesabını ekle.');
            }

            let targetBot = null;
            for (const acc of userAccounts) {
                if (global.activeTokens?.has(acc.token)) {
                    targetBot = global.activeTokens.get(acc.token);
                    break;
                }
            }

            if (!targetBot) {
                return i.editReply('<:emoji197:1537925769068806214> Sisteme eklediğin hesabın şu an aktif değil! Önce tokenini bir ses kanalına falan sokarak aktif et.');
            }

            // 2. SUNUCUYU SELFBOT İLE ÇEK
            const kaynakSunucu = targetBot.guilds.cache.get(kaynakId) || await targetBot.guilds.fetch(kaynakId).catch(() => null);
            if (!kaynakSunucu) {
                return i.editReply('<:emoji197:1537925769068806214> Senin hesabın (Selfbot) bu sunucuda bulunamadı! O sunucuda olduğundan emin ol.');
            }

            // 3. ŞABLON ÇIKARMA İŞLEMİ
            try {
                let templates = await kaynakSunucu.fetchTemplates();
                let template = templates.first();
                
                if (!template) {
                    template = await kaynakSunucu.createTemplate('Void Şablon', 'Void tarafından sızdırıldı.');
                } else {
                    template = await template.sync();
                }

                return i.editReply({ 
                    content: `<a:emoji110:1537925433763299418> **Şablon Başarıyla Çalındı!**\n\nAşağıdaki linke tıklayarak sıfırdan, kanalları dizili yepyeni bir sunucu açabilirsin:\n**https://discord.new/${template.code}**` 
                });

            } catch (err) {
                console.error("Şablon Çekme Hatası:", err);
                return i.editReply('<:emoji197:1537925769068806214> Şablon linki çıkarılamadı! Senin hesabının (selfbot) o sunucuda **"Sunucuyu Yönet"** yetkisine sahip olması ŞART. Aksi halde Discord link vermez.');
            }
        }
    }
};