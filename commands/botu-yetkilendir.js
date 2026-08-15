const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botu-yetkilendir')
        .setDescription('Void uygulamasını hesabınıza entegre etmek için yetkilendirme paneli.'),

    async execute(interaction) {
        const yetkilendirmeLinki = "https://discord.com/oauth2/authorize?client_id=1491071700715048970&integration_type=1&scope=applications.commands";

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Uygulama Yetkilendirme Paneli <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Uygulama Nasıl Kullanılır ve Çalışır?**\n\n' +
                '<a:emoji109:1537925984882266212> `/spam` **Nasıl Kullanılır?**\n' +
                '• Komutu yazıp göndereceğiniz metni girersiniz, butona basarak ardışık ve hızlıca spam atabilirsiniz.\n\n' +
                '<a:emoji109:1537925984882266212> `/gmmesaj` **Nasıl Kullanılır?**\n' +
                '• Komuta görsel veya dosya yükleyerek metinle birlikte ardışık görsel spam gönderebilirsiniz.\n\n' +
                '<a:emoji197:1537925769068806214> **Önemli Kural:** Resmi sunucumuzda (`.gg/void`) bulunmayan kullanıcılar bu komutları çalıştıramaz!\n\n' +
                '<a:emoji24:1537925080447717447> Aşağıdaki butona tıklayarak yetkilendirmeyi hemen tamamlayabilirsiniz!'
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

        // Komutu yazanın o gri yazısını kanal içinde bırakmamak için komut yanıtını doğrudan herkesin göreceği şekilde atıyoruz
        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
};