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
        await interaction.reply({ content: '<:emoji235:1539424382332444732> Şu an sadece metin (vunban) komutu ile çalışmaktadır.', flags: 64 });
    },

    async executeText(message, args) {
        if (args.length === 0) return message.reply('<:emoji235:1539424382332444732> Kullanımı: `vunban ID [sebep]`');
        
        const targetId = args[0];
        const reason = args.slice(1).join(' ') || 'Belirtilmedi.';
        
        try {
            await message.guild.members.unban(targetId, `${message.author.tag} - ${reason}`);
        } catch (e) {
            return message.reply('<:emoji235:1539424382332444732> Kullanıcı yasaklı değil veya ID yanlış!');
        }

        message.channel.send(`<:emoji144:1539424259552579604> **${targetId}** ID'li kullanıcının yasağı kaldırıldı.`);

        // Emojili Şık Log
        let logChannel = message.client.channels.cache.get(UNBAN_LOG_CHANNEL);
        if (!logChannel) {
            logChannel = await message.client.channels.fetch(UNBAN_LOG_CHANNEL).catch(() => null);
        }

        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('<:emoji133:1539424360543293521> Void | Unban Raporu <:emoji141:1539424556412829817>')
                .setColor('#00ff00')
                .setDescription(
                    `<:emoji105:1539424496346206298> **Kullanıcı ID:** \`${targetId}\`\n` +
                    `<:emoji144:1539424259552579604> **Yetkili:** ${message.author}\n` +
                    `<:emoji141:1539424556412829817> **Sebep:** \`${reason}\`\n\n` +
                    `📍 **İşlem Yapılan Kanal:** ${message.channel}`
                )
                .setTimestamp();
                
            logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
        }
    }
};