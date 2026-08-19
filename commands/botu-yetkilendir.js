const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botu-yetkilendir')
        .setDescription('Void uygulamasını hesabınıza entegre etmek için yetkilendirme paneli.'),

    async execute(interaction) {
        const yetkilendirmeLinki = "https://discord.com/oauth2/authorize?client_id=1491071700715048970&integration_type=1&scope=applications.commands";

        const embed = new EmbedBuilder()
            .setTitle('<:emoji133:1539424360543293521> Void | Uygulama Yetkilendirme Paneli <:emoji141:1539424556412829817>')
            .setDescription(
                '<:emoji105:1539424496346206298> **Uygulama Nasıl Kullanılır ve Çalışır?**\n\n' +
                '<:emoji105:1539424496346206298> `/spam` **Nasıl Kullanılır?**\n' +
                '• Komutu yazıp göndereceğiniz metni girersiniz, butona basarak ardışık ve hızlıca spam atabilirsiniz.\n\n' +
                '<:emoji105:1539424496346206298> `/gmmesaj` **Nasıl Kullanılır?**\n' +
                '• Komuta görsel veya dosya yükleyerek metinle birlikte ardışık görsel spam gönderebilirsiniz.\n\n' +
                '<:emoji6:1539424274983555112> **Önemli Kural:** Resmi sunucumuzda (`.gg/void`) bulunmayan kullanıcılar bu komutları çalıştıramaz!\n\n' +
                '<:emoji141:1539424556412829817> Aşağıdaki butona tıklayarak yetkilendirmeyi hemen tamamlayabilirsiniz!'
            )
            .setColor('#2b2d31')
            .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ 
                text: `Void Security System © 2026`, 
                iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Yetkilendir')
                    .setStyle(ButtonStyle.Link)
                    .setURL(yetkilendirmeLinki)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
};