const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Bulunduğunuz kanalı üyelerin mesaj gönderimine kapatır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),

    async execute(interaction) {
        await interaction.reply({ content: 'İşleniyor...', flags: MessageFlags.Ephemeral });

        try {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
            await interaction.editReply({ 
                content: `<a:emoji58:1537925046486433802> Bu kanal başarıyla kilitlendi!` 
            });
        } catch (error) {
            console.error("Kanal kilitleme hatası:", error);
            await interaction.editReply({ 
                content: `<a:emoji197:1537925769068806214> Kanal kilitlenirken hata oluştu.` 
            });
        }
    }
};