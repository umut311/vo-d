const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    name: 'kopyala', 
    async executeText(message, args) {
        // Paneli sadece yöneticiler kurabilsin
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('<a:emoji197:1537925769068806214> Bu paneli oluşturmak için Yönetici yetkisine sahip olmalısın!');
        }

        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Sunucu Klonlama Sistemi <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Sistem Nedir?**\n' +
                'Bu sistem, belirttiğiniz kaynak sunucunun kanallarını ve kategorilerini, hedef sunucuya birebir kopyalar.\n\n' +
                '⚠️ **ÖNEMLİ UYARILAR:**\n' +
                '**1.** Hedef sunucudaki **MEVCUT TÜM KANALLAR SİLİNİR**.\n' +
                '**2.** Botun her iki sunucuda da yönetici olması şarttır.\n' +
                '**3.** Kopyalama işlemi sunucu büyüklüğüne göre biraz zaman alabilir.\n\n' +
                '<a:emoji24:1537925080447717447> *İşlemi başlatmak için aşağıdaki butona tıklayıp formu doldurun.*'
            )
            .setColor('#2b2d31')
            .setThumbnail(serverIcon)
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_kopyala_ac')
                .setLabel('Klonlamayı Başlat')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('1537925046486433802')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        // Butona basıldığında yetki kontrolü
        if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return i.reply({ content: '<a:emoji197:1537925769068806214> Bu işlemi yapmak için Yönetici yetkisine sahip olmalısınız!', flags: 64 });
        }

        // 1. Butona basıldığında Modal (Form) açtır
        if (id === 'btn_kopyala_ac') {
            const modal = new ModalBuilder()
                .setCustomId('modal_sunucu_kopyala')
                .setTitle('Sunucu Klonlama Ayarları');

            const kaynakInput = new TextInputBuilder()
                .setCustomId('kaynak_id')
                .setLabel('Kaynak Sunucu ID (Kopyalanacak)')
                .setPlaceholder('Örn: 111111111111111111')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const hedefInput = new TextInputBuilder()
                .setCustomId('hedef_id')
                .setLabel('Hedef Sunucu ID (Üzerine Yazılacak)')
                .setPlaceholder('Örn: 222222222222222222')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(kaynakInput),
                new ActionRowBuilder().addComponents(hedefInput)
            );

            await i.showModal(modal);
        }

        // 2. Form doldurulup gönderildiğinde kopyalama işlemini başlat
        if (id === 'modal_sunucu_kopyala') {
            const kaynakId = i.fields.getTextInputValue('kaynak_id');
            const hedefId = i.fields.getTextInputValue('hedef_id');

            const kaynakSunucu = i.client.guilds.cache.get(kaynakId);
            const hedefSunucu = i.client.guilds.cache.get(hedefId);

            if (!kaynakSunucu) return i.reply({ content: '<a:emoji197:1537925769068806214> Kaynak sunucu bulunamadı! Botun o sunucuda olduğundan emin misin?', flags: 64 });
            if (!hedefSunucu) return i.reply({ content: '<a:emoji197:1537925769068806214> Hedef sunucu bulunamadı! Botun hedef sunucuda olduğundan emin misin?', flags: 64 });

            await i.reply({ content: '<a:emoji58:1537925046486433802> **İşlem başladı!** Eski kanallar silinip, yeni kanallar inşa ediliyor. Lütfen bekleyin...', flags: 64 });

            try {
                // 1. Hedef sunucudaki tüm kanalları temizle
                for (const channel of hedefSunucu.channels.cache.values()) {
                    await channel.delete().catch(() => {});
                }

                // 2. Kaynak sunucudaki Kategorileri kopyala
                const categoryMap = new Map();
                const categories = kaynakSunucu.channels.cache
                    .filter(c => c.type === ChannelType.GuildCategory)
                    .sort((a, b) => a.position - b.position);
                
                for (const category of categories.values()) {
                    const createdCategory = await hedefSunucu.channels.create({
                        name: category.name,
                        type: ChannelType.GuildCategory,
                        position: category.position
                    }).catch(() => null);

                    if (createdCategory) {
                        categoryMap.set(category.id, createdCategory.id);
                    }
                }

                // 3. Diğer tüm kanalları kopyala
                const otherChannels = kaynakSunucu.channels.cache
                    .filter(c => c.type !== ChannelType.GuildCategory)
                    .sort((a, b) => a.position - b.position);

                for (const channel of otherChannels.values()) {
                    await hedefSunucu.channels.create({
                        name: channel.name,
                        type: channel.type,
                        position: channel.position,
                        parent: channel.parentId ? categoryMap.get(channel.parentId) : null,
                        topic: channel.topic || null,
                        nsfw: channel.nsfw || false,
                        bitrate: channel.bitrate || 64000,
                        userLimit: channel.userLimit || 0
                    }).catch(() => {});
                }

                await i.editReply({ content: '<a:emoji110:1537925433763299418> **İşlem Başarılı!** Sunucu birebir kopyalandı.' });
            } catch (error) {
                console.error("Kopyalama Hatası:", error);
                await i.editReply({ content: '<a:emoji197:1537925769068806214> Kopyalama sırasında bir hata oluştu. Konsolu kontrol et.' });
            }
        }
    }
};