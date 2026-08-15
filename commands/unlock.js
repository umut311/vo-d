const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Kilitli olan kanalı tekrar mesaj gönderimine açar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),

    async execute(interaction) {
        await interaction.reply({ content: 'İşleniyor...', flags: MessageFlags.Ephemeral });

        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null });
            await interaction.editReply({ 
                content: `<a:emoji58:1537925046486433802> Kanalın kilidi açıldı!` 
            });
        } catch (error) {
            console.error("Kanal kilidi açma hatası:", error);
            await interaction.editReply({ 
                content: `<a:emoji197:1537925769068806214> Kanalın kilidi açılırken bir hata oluştu.` 
            });
        }
    }
};