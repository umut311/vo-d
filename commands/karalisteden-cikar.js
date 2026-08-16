const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const Blacklist = mongoose.models.Blacklist || mongoose.model('Blacklist', new mongoose.Schema({ userId: String, expiresAt: Date }));
const LOG_CHANNEL = "1537976544851525674";

module.exports = {
    name: 'karalistedencikar',
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('<a:emoji197:1537925769068806214> Bu komutu kullanmak için yetkiniz yok!');
        }

        if (args.length === 0) {
            return message.reply('<a:emoji197:1537925769068806214> Kullanımı: `v!karalistedencikar @kullanici/ID`');
        }

        const targetId = args[0].replace(/[<@!>]/g, '');
        const targetUser = await message.client.users.fetch(targetId).catch(() => null);
        if (!targetUser) return message.reply('<a:emoji197:1537925769068806214> Kullanıcı bulunamadı!');

        const deleted = await Blacklist.findOneAndDelete({ userId: targetUser.id });

        if (!deleted) {
            return message.reply('<a:emoji197:1537925769068806214> Bu kullanıcı zaten karalistede değil.');
        }

        await message.reply(`<a:emoji110:1537925433763299418> ${targetUser} kullanıcısının karaliste cezası kaldırıldı.`);

        const logChannel = message.client.channels.cache.get(LOG_CHANNEL) || await message.client.channels.fetch(LOG_CHANNEL).catch(()=>null);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('<a:emoji58:1537925046486433802> Void | Karaliste Cezası Kaldırıldı')
                .setColor('#2b2d31')
                .addFields(
                    { name: 'Affedilen', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
                    { name: 'Yetkili', value: `${message.author}`, inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(()=>{});
        }
    }
};