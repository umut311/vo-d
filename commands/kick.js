const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const KICK_LOG_CHANNEL = "1537983422079963146";

module.exports = {
    name: 'kick', // "vkick" ve "v!kick" için
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kullanıcıyı sunucudan atar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(false)),

    async execute(interaction) {
        await interaction.reply({ content: 'Şu an sadece metin (vkick) komutu ile çalışmaktadır.', flags: 64 });
    },

    async executeText(message, args) {
        if (args.length === 0) return message.reply('⛔ Kullanımı: `vkick @kullanici/ID [sebep]`');
        
        const targetId = args[0].replace(/[<@!>]/g, '');
        const reason = args.slice(1).join(' ') || 'Belirtilmedi.';
        const targetMember = await message.guild.members.fetch(targetId).catch(()=>null);

        if (!targetMember) return message.reply('⛔ Kullanıcı bulunamadı veya sunucuda değil!');

        // Kullanıcıya DM At
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('👢 Sunucudan Atıldınız!')
                .setDescription(`**${message.guild.name}** sunucusundan atıldınız.\n\n**Sebep:** ${reason}\n**Atan Yetkili:** ${message.author.tag}`)
                .setColor('#ffaa00');
            await targetMember.user.send({ embeds: [dmEmbed] });
        } catch (e) {}

        // Kick İşlemi
        await targetMember.kick(`${message.author.tag} - ${reason}`).catch(e => {
            return message.reply('⛔ Bu kullanıcıyı atamıyorum, yetkim veya rol sıram yetmiyor olabilir.');
        });

        // ModStat (Yetkili Kick Sayısını) Güncelle
        const ModStat = mongoose.model('ModStat');
        const modStat = await ModStat.findOneAndUpdate(
            { userId: message.author.id }, 
            { $inc: { kicks: 1 } }, 
            { upsert: true, new: true }
        );

        message.channel.send(`<a:emoji110:1537925433763299418> **${targetMember.user.tag}** sunucudan atıldı.`);

        // Emojili Şık Log
        const logChannel = message.client.channels.cache.get(KICK_LOG_CHANNEL);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('👢 Üye Sunucudan Atıldı (Kick)')
                .setColor('#ffaa00')
                .addFields(
                    { name: 'Atılan Kişi', value: `${targetMember.user} (\`${targetMember.id}\`)`, inline: true },
                    { name: 'Yetkili', value: `${message.author}`, inline: true },
                    { name: 'Sebep', value: reason, inline: true },
                    { name: 'Yetkilinin Toplam Kicki', value: `\`${modStat.kicks}\``, inline: true },
                    { name: 'Kanal', value: `${message.channel}`, inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
        }
    }
};