const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const Blacklist = mongoose.models.Blacklist || mongoose.model('Blacklist', new mongoose.Schema({ userId: String, expiresAt: Date }));
const LOG_CHANNEL = "1537976444851060777";

function parseTime(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    const val = parseInt(match[1]);
    const unit = match[2];
    let multiplier = 1000;
    if (unit === 'm') multiplier = 60 * 1000;
    if (unit === 'h') multiplier = 60 * 60 * 1000;
    if (unit === 'd') multiplier = 24 * 60 * 60 * 1000;
    return val * multiplier;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('karaliste')
        .setDescription('Bir kullanıcıyı bottan yasaklar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt => opt.setName('kullanici').setDescription('Yasaklanacak kullanıcı').setRequired(true))
        .addStringOption(opt => opt.setName('sure').setDescription('Süre (örn: 10m, 2h, 1d). Boş bırakılırsa sınırsız.').setRequired(false)),
        
    async execute(interaction) {
        const target = interaction.options.getUser('kullanici');
        const sureStr = interaction.options.getString('sure');
        let expiresAt = null;

        if (sureStr) {
            const ms = parseTime(sureStr);
            if (!ms) return interaction.reply({ content: 'Hatalı süre formatı! (Örn: 10m, 2h, 1d)', flags: 64 });
            expiresAt = new Date(Date.now() + ms);
        }

        await Blacklist.findOneAndUpdate(
            { userId: target.id }, 
            { userId: target.id, expiresAt: expiresAt }, 
            { upsert: true }
        );

        const timeText = expiresAt ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:R> bitecek` : 'Sınırsız';

        await interaction.reply({ content: `✅ ${target} başarıyla karalisteye eklendi. (Süre: ${timeText})`, flags: 64 });

        const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL) || await interaction.client.channels.fetch(LOG_CHANNEL).catch(()=>null);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('Void | Karalisteye Eklendi')
                .setColor('#2b2d31')
                .addFields(
                    { name: 'Yasaklanan', value: `${target} (\`${target.id}\`)`, inline: true },
                    { name: 'Yetkili', value: `${interaction.user}`, inline: true },
                    { name: 'Süre', value: timeText, inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(()=>{});
        }
    }
};