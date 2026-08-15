const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sil')
        .setDescription('Kanaldaki belirtilen miktardaki mesajı toplu olarak siler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addIntegerOption(option =>
            option.setName('sayi')
                .setDescription('Silinecek mesaj sayısı (1-100 arası)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),

    async execute(interaction) {
        const count = interaction.options.getInteger('sayi');
        await interaction.reply({ content: 'İşleniyor...', flags: MessageFlags.Ephemeral });

        try {
            const deleted = await interaction.channel.bulkDelete(count, true);
            await interaction.editReply({ 
                content: `<a:emoji58:1537925046486433802> Başarıyla **${deleted.size}** adet mesaj silindi!` 
            });
        } catch (error) {
            console.error("Mesaj silme hatası:", error);
            await interaction.editReply({ 
                content: `<a:emoji197:1537925769068806214> Mesajlar silinemedi! (14 günden eski mesajlar silinemez).` 
            });
        }
    }
};