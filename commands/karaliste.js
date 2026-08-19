const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
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
    name: 'karaliste',
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('<a:emoji235:1539424382332444732> Bu komutu kullanmak için yetkiniz yok!');
        }

        if (args.length === 0) {
            return message.reply('<a:emoji235:1539424382332444732> Kullanımı: `v!karaliste @kullanici/ID [süre (örn: 10m, 2h)]`');
        }

        const targetId = args[0].replace(/[<@!>]/g, '');
        const sureStr = args[1]; // İkinci argüman (süreyi) alır
        
        const targetUser = await message.client.users.fetch(targetId).catch(() => null);
        if (!targetUser) return message.reply('<a:emoji235:1539424382332444732> Kullanıcı bulunamadı!');

        let expiresAt = null;
        if (sureStr) {
            const ms = parseTime(sureStr);
            if (!ms) return message.reply('<a:emoji235:1539424382332444732> Hatalı süre formatı girdiniz! (Geçerli Örn: 10m, 2h, 1d)');
            expiresAt = new Date(Date.now() + ms);
        }

        await Blacklist.findOneAndUpdate(
            { userId: targetUser.id }, 
            { userId: targetUser.id, expiresAt: expiresAt }, 
            { upsert: true }
        );

        const timeText = expiresAt ? `<t:${Math.floor(expiresAt.getTime() / 1000)}:R> bitecek` : 'Sınırsız';

        await message.reply(`<a:emoji6:1539424274983555112> ${targetUser} başarıyla karalisteye eklendi. (Süre: ${timeText})`);

        const logChannel = message.client.channels.cache.get(LOG_CHANNEL) || await message.client.channels.fetch(LOG_CHANNEL).catch(()=>null);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('<a:emoji133:1539424360543293521> Void | Karalisteye Eklendi <a:emoji195:1539424442768424992>')
                .setColor('#2b2d31')
                .addFields(
                    { name: 'Yasaklanan', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
                    { name: 'Yetkili', value: `${message.author}`, inline: true },
                    { name: 'Süre', value: timeText, inline: true }
                )
                .setTimestamp();
            logChannel.send({ embeds: [embed] }).catch(()=>{});
        }
    }
};