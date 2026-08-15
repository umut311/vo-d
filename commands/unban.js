const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const UNBAN_LOG_CHANNEL = "1537983387200127006";

module.exports = {
    name: 'unban', // "vunban" ve "v!unban" için
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Kullanıcının yasağını kaldırır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(opt => opt.setName('id').setDescription('Kullanıcı ID').setRequired(true)),

    async execute(interaction) {
        await interaction.reply({ content: 'Şu an sadece metin (vunban) komutu ile çalışmaktadır.', flags: 64 });
    },

    async executeText(message, args) {
        if (args.length === 0) return message.reply('⛔ Kullanımı: `vunban ID [sebep]`');
        
        const targetId = args[0];
        const reason = args.slice(1).join(' ') || 'Belirtilmedi.';
        
        try {
            await message.guild.members.unban(targetId, `${message.author.tag} - ${reason}`);
        } catch (e) {
            return message.reply('⛔ Kullanıcı yasaklı değil veya ID yanlış!');
        }

        message.channel.send(`<a:emoji110:1537925433763299418> **${targetId}** ID'li kullanıcının yasağı kaldırıldı.`);

        // Emojili Şık Log
        const logChannel = message.client.channels.cache.get(UNBAN_LOG_CHANNEL);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🔓 Üye Yasağı Kaldırıldı (Unban)')
                .setColor('#00ff00')
                .addFields(
                    { name: 'Kullanıcı ID', value: `\`${targetId}\``, inline: true },
                    { name: 'Yetkili', value: `${message.author}`, inline: true },
                    { name: 'Sebep', value: reason, inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
        }
    }
};