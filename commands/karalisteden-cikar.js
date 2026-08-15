const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const Blacklist = mongoose.models.Blacklist || mongoose.model('Blacklist', new mongoose.Schema({ userId: String, expiresAt: Date }));
const LOG_CHANNEL = "1537976544851525674";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('karalisteden-cikar')
        .setDescription('Bir kullanıcının karaliste cezasını kaldırır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt => opt.setName('kullanici').setDescription('Cezası kaldırılacak kullanıcı').setRequired(true)),
        
    async execute(interaction) {
        const target = interaction.options.getUser('kullanici');

        const deleted = await Blacklist.findOneAndDelete({ userId: target.id });

        if (!deleted) {
            return interaction.reply({ content: 'Bu kullanıcı zaten karalistede değil.', flags: 64 });
        }

        await interaction.reply({ content: `✅ ${target} kullanıcısının karaliste cezası kaldırıldı.`, flags: 64 });

        const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL) || await interaction.client.channels.fetch(LOG_CHANNEL).catch(()=>null);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('Void | Karaliste Cezası Kaldırıldı')
                .setColor('#2b2d31')
                .addFields(
                    { name: 'Affedilen', value: `${target} (\`${target.id}\`)`, inline: true },
                    { name: 'Yetkili', value: `${interaction.user}`, inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(()=>{});
        }
    }
};