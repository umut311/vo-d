const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const BAN_LOG_CHANNEL = "1537983368375828610";

// ModStat veritabanı modelini çökmemesi için güvenli tanımlıyoruz
const ModStat = mongoose.models.ModStat || mongoose.model('ModStat', new mongoose.Schema({ 
    userId: String, 
    bans: { type: Number, default: 0 } 
}));

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
        if (args.length === 0) return message.reply('<:emoji6:1539424274983555112> Kullanımı: `vban @kullanici/ID [sebep]`');
        
        const targetId = args[0].replace(/[<@!>]/g, '');
        const reason = args.slice(1).join(' ') || 'Belirtilmedi.';
        
        const targetMember = await message.guild.members.fetch(targetId).catch(()=>null);
        const targetUser = targetMember ? targetMember.user : await message.client.users.fetch(targetId).catch(()=>null);

        if (!targetUser) return message.reply('<:emoji6:1539424274983555112> Kullanıcı bulunamadı!');

        // Kullanıcıya DM At
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('<:emoji133:1539424360543293521> Sunucudan Yasaklandınız!')
                .setDescription(`**${message.guild.name}** sunucusundan yasaklandınız.\n\n**Sebep:** ${reason}\n**Yasaklayan:** ${message.author.tag}`)
                .setColor('#2b2d31');
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (e) {}

        // Ban İşlemi
        await message.guild.members.ban(targetId, { reason: `${message.author.tag} - ${reason}` }).catch(e => {
            return message.reply('<:emoji6:1539424274983555112> Bu kullanıcıyı banlayamıyorum, yetkim veya rol sıram yetmiyor olabilir.');
        });

        // ModStat (Yetkili Ban Sayısını) Güncelle
        const modStat = await ModStat.findOneAndUpdate(
            { userId: message.author.id }, 
            { $inc: { bans: 1 } }, 
            { upsert: true, new: true }
        );

        message.channel.send(`<:emoji144:1539424259552579604> **${targetUser.tag}** başarıyla sunucudan yasaklandı.`);

        // Kendi Temana Uygun Emojili Şık Log
        let logChannel = message.client.channels.cache.get(BAN_LOG_CHANNEL);
        if (!logChannel) {
            logChannel = await message.client.channels.fetch(BAN_LOG_CHANNEL).catch(() => null);
        }

        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('<:emoji133:1539424360543293521> Void | Ban Raporu <:emoji141:1539424556412829817>')
                .setColor('#2b2d31')
                .setDescription(
                    `<:emoji105:1539424496346206298> **Yasaklanan:** ${targetUser} (\`${targetUser.id}\`)\n` +
                    `<:emoji144:1539424259552579604> **Yetkili:** ${message.author} (\`Toplam Ban: ${modStat.bans}\`)\n` +
                    `<:emoji141:1539424556412829817> **Sebep:** \`${reason}\`\n\n` +
                    `📍 **İşlem Yapılan Kanal:** ${message.channel}`
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setTimestamp();
            
            await logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
        }
    }
};