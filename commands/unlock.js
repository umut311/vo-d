const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'unlock',
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('<a:emoji197:1537925769068806214> Bu komutu kullanmak için Kanalı Yönet yetkiniz olmalı!');
        }

        try {
            await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null });
            await message.reply(`<a:emoji58:1537925046486433802> Kanalın kilidi açıldı, üyeler yeniden mesaj gönderebilir!`);
        } catch (error) {
            console.error("Kanal kilidi açma hatası:", error);
            await message.reply(`<a:emoji197:1537925769068806214> Kanalın kilidi açılırken bir hata oluştu. Yetkilerimi kontrol et.`);
        }
    }
};