const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'lock',
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('<a:emoji197:1537925769068806214> Bu komutu kullanmak için Kanalı Yönet yetkiniz olmalı!');
        }

        try {
            await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
            await message.reply(`<a:emoji58:1537925046486433802> Bu kanal başarıyla mesaj gönderimine kapatıldı (Kilitlendi)!`);
        } catch (error) {
            console.error("Kanal kilitleme hatası:", error);
            await message.reply(`<a:emoji197:1537925769068806214> Kanal kilitlenirken bir hata oluştu. Yetkilerimi kontrol et.`);
        }
    }
};