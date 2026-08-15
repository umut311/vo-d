const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const BAN_LOG_CHANNEL = "1537983368375828610";

module.exports = {
    name: 'ban', // "vban" ve "v!ban" için
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Kullanıcıyı sunucudan yasaklar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(false)),

    async execute(interaction) {
        await interaction.reply({ content: 'Şu an sadece metin (vban) komutu ile çalışmaktadır.', flags: 64 });
    },

    async executeText(message, args) {
        if (args.length === 0) return message.reply('⛔ Kullanımı: `vban @kullanici/ID [sebep]`');
        
        const targetId = args[0].replace(/[<@!>]/g, '');
        const reason = args.slice(1).join(' ') || 'Belirtilmedi.';
        
        const targetMember = await message.guild.members.fetch(targetId).catch(()=>null);
        const targetUser = targetMember ? targetMember.user : await message.client.users.fetch(targetId).catch(()=>null);

        if (!targetUser) return message.reply('⛔ Kullanıcı bulunamadı!');

        // Kullanıcıya DM At
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('🔨 Sunucudan Yasaklandınız!')
                .setDescription(`**${message.guild.name}** sunucusundan yasaklandınız.\n\n**Sebep:** ${reason}\n**Yasaklayan:** ${message.author.tag}`)
                .setColor('#ff0000');
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (e) {}

        // Ban İşlemi
        await message.guild.members.ban(targetId, { reason: `${message.author.tag} - ${reason}` }).catch(e => {
            return message.reply('⛔ Bu kullanıcıyı banlayamıyorum, yetkim veya rol sıram yetmiyor olabilir.');
        });

        // ModStat (Yetkili Ban Sayısını) Güncelle
        const ModStat = mongoose.model('ModStat');
        const modStat = await ModStat.findOneAndUpdate(
            { userId: message.author.id }, 
            { $inc: { bans: 1 } }, 
            { upsert: true, new: true }
        );

        message.channel.send(`<a:emoji110:1537925433763299418> **${targetUser.tag}** başarıyla sunucudan yasaklandı.`);

        // Emojili Şık Log
        const logChannel = message.client.channels.cache.get(BAN_LOG_CHANNEL);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🔨 Üye Yasaklandı (Ban)')
                .setColor('#ff0000')
                .addFields(
                    { name: 'Yasaklanan', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
                    { name: 'Yetkili', value: `${message.author}`, inline: true },
                    { name: 'Sebep', value: reason, inline: true },
                    { name: 'Yetkilinin Toplam Banı', value: `\`${modStat.bans}\``, inline: true },
                    { name: 'Kanal', value: `${message.channel}`, inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
        }
    }
};