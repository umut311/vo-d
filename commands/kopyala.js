const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'kopyala', 
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('<a:emoji197:1537925769068806214> Bu paneli kurmak için Yönetici yetkisine sahip olmalısın!');
        }

        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Sunucu Şablonu Çıkarma <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Sistem Nedir?**\n' +
                'Bu panel üzerinden belirttiğiniz sunucunun birebir kopyasını (şablonunu) Discord linki olarak alabilirsiniz.\n\n' +
                '⚠️ **ÖNEMLİ UYARI:**\n' +
                'Botun kopyası alınacak sunucuda ekli olması ve **Sunucuyu Yönet** yetkisine sahip olması şarttır.\n\n' +
                '<a:emoji24:1537925080447717447> *İşlemi başlatmak için aşağıdaki butona tıklayın.*'
            )
            .setColor('#2b2d31')
            .setThumbnail(serverIcon)
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_kopyala_ac') // index.js dokunulmasın diye ID aynı bırakıldı
                .setLabel('Şablon Çıkart')
                .setStyle(ButtonStyle.Success)
                .setEmoji('1537925046486433802')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return i.reply({ content: '<a:emoji197:1537925769068806214> Bu işlemi yapmak için Yönetici yetkisine sahip olmalısın!', flags: 64 });
        }

        if (id === 'btn_kopyala_ac') {
            const modal = new ModalBuilder()
                .setCustomId('modal_sunucu_kopyala') // index.js dokunulmasın diye ID aynı bırakıldı
                .setTitle('Sunucu Şablonu Çıkar');

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
            const kaynakId = i.fields.getTextInputValue('kaynak_id');
            const kaynakSunucu = i.client.guilds.cache.get(kaynakId);

            if (!kaynakSunucu) {
                return i.reply({ content: '<a:emoji197:1537925769068806214> Sunucu bulunamadı! Botun o sunucuda olduğundan emin misin?', flags: 64 });
            }

            await i.reply({ content: '<a:emoji58:1537925046486433802> **Şablon oluşturuluyor, lütfen bekle...**', flags: 64 });

            try {
                // Sunucuda var olan şablonu arıyoruz
                let templates = await kaynakSunucu.fetchTemplates();
                let template = templates.first();

                // Eğer sunucunun şablonu daha önce hiç oluşturulmamışsa sıfırdan oluştur
                if (!template) {
                    template = await kaynakSunucu.createTemplate('Void Şablon', 'Void botu tarafından otomatik oluşturuldu.');
                } else {
                    // Eğer önceden varsa, en güncel kanalları alması için senkronize et
                    template = await template.sync();
                }

                // Ekrana linki basıyoruz
                const templateLink = `https://discord.new/${template.code}`;

                await i.editReply({ 
                    content: `<a:emoji110:1537925433763299418> **Şablon Başarıyla Çıkarıldı!**\n\nAşağıdaki linke tıklayarak veya kopyalayarak sunucuyu kurabilirsin:\n${templateLink}` 
                });
            } catch (error) {
                console.error("Şablon Çıkarma Hatası:", error);
                await i.editReply({ content: '<a:emoji197:1537925769068806214> Şablon çıkarılırken hata oluştu. Botun o sunucuda **"Sunucuyu Yönet"** yetkisi olduğundan emin ol.' });
            }
        }
    }
};