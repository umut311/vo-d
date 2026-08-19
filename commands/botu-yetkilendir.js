const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botu-yetkilendir')
        .setDescription('Void uygulamasını hesabınıza entegre etmek için yetkilendirme paneli.'),

    async execute(interaction) {
        const yetkilendirmeLinki = "https://discord.com/oauth2/authorize?client_id=1491071700715048970&integration_type=1&scope=applications.commands";

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji133:1539424360543293521> Void | Uygulama Yetkilendirme Paneli <a:emoji195:1539424442768424992>')
            .setDescription(
                '<a:emoji105:1539424496346206298> **Uygulama Nasıl Kullanılır ve Çalışır?**\n\n' +
                '<a:emoji105:1539424496346206298> `/spam` **Nasıl Kullanılır?**\n' +
                '• Komutu yazıp göndereceğiniz metni girersiniz, butona basarak ardışık ve hızlıca spam atabilirsiniz.\n\n' +
                '<a:emoji105:1539424496346206298> `/gmmesaj` **Nasıl Kullanılır?**\n' +
                '• Komuta görsel veya dosya yükleyerek metinle birlikte ardışık görsel spam gönderebilirsiniz.\n\n' +
                '<a:emoji6:1539424274983555112> **Önemli Kural:** Resmi sunucumuzda (`.gg/voido`) bulunmayan kullanıcılar bu komutları çalıştıramaz!\n\n' +
                '<a:emoji195:1539424442768424992> Aşağıdaki butona tıklayarak yetkilendirmeyi hemen tamamlayabilirsiniz!'
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