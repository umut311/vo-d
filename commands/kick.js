const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const KICK_LOG_CHANNEL = "1537983422079963146";

// ModStat veritabanı modelini çökmemesi için güvenli tanımlıyoruz
const ModStat = mongoose.models.ModStat || mongoose.model('ModStat', new mongoose.Schema({ 
    userId: String, 
    kicks: { type: Number, default: 0 } 
}));

module.exports = {
    name: 'kick', // "vkick" ve "v!kick" için
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kullanıcıyı sunucudan atar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Sebep').setRequired(false)),

    async execute(interaction) {
        await interaction.reply({ content: '<a:emoji235:1539424382332444732> Şu an sadece metin (vkick) komutu ile çalışmaktadır.', flags: 64 });
    },

    async executeText(message, args) {
        if (args.length === 0) return message.reply('<a:emoji6:1539424274983555112> Kullanımı: `vkick @kullanici/ID [sebep]`');
        
        const targetId = args[0].replace(/[<@!>]/g, '');
        const reason = args.slice(1).join(' ') || 'Belirtilmedi.';
        const targetMember = await message.guild.members.fetch(targetId).catch(()=>null);

        if (!targetMember) return message.reply('<a:emoji6:1539424274983555112> Kullanıcı bulunamadı veya sunucuda değil!');

        // Kullanıcıya DM At
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('<a:emoji133:1539424360543293521> Sunucudan Atıldınız!')
                .setDescription(`**${message.guild.name}** sunucusundan atıldınız.\n\n**Sebep:** ${reason}\n**Atan Yetkili:** ${message.author.tag}`)
                .setColor('#ffaa00');
            await targetMember.user.send({ embeds: [dmEmbed] });
        } catch (e) {}

        // Kick İşlemi
        await targetMember.kick(`${message.author.tag} - ${reason}`).catch(e => {
            return message.reply('<a:emoji6:1539424274983555112> Bu kullanıcıyı atamıyorum, yetkim veya rol sıram yetmiyor olabilir.');
        });

        // ModStat (Yetkili Kick Sayısını) Güncelle
        const modStat = await ModStat.findOneAndUpdate(
            { userId: message.author.id }, 
            { $inc: { kicks: 1 } }, 
            { upsert: true, new: true }
        );

        message.channel.send(`<a:emoji105:1539424496346206298> **${targetMember.user.tag}** sunucudan atıldı.`);

        // Emojili Şık Log
        let logChannel = message.client.channels.cache.get(KICK_LOG_CHANNEL);
        if (!logChannel) {
            logChannel = await message.client.channels.fetch(KICK_LOG_CHANNEL).catch(() => null);
        }

        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('<a:emoji133:1539424360543293521> Void | Kick Raporu <a:emoji195:1539424442768424992>')
                .setColor('#ffaa00')
                .setDescription(
                    `<a:emoji105:1539424496346206298> **Atılan Kişi:** ${targetMember.user} (\`${targetMember.id}\`)\n` +
                    `<a:emoji105:1539424496346206298> **Yetkili:** ${message.author} (\`Toplam Kick: ${modStat.kicks}\`)\n` +
                    `<a:emoji195:1539424442768424992> **Sebep:** \`${reason}\`\n\n` +
                    `📍 **İşlem Yapılan Kanal:** ${message.channel}`
                )
                .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();
                
            logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
        }
    }
};