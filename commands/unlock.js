const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'unlock',
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('<a:emoji235:1539424382332444732> Bu komutu kullanmak için Kanalı Yönet yetkiniz olmalı!');
        }

        try {
            await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null });
            await message.reply(`<a:emoji133:1539424360543293521> Kanalın kilidi açıldı, üyeler yeniden mesaj gönderebilir! <a:emoji141:1539424556412829817>`);
        } catch (error) {
            console.error("Kanal kilidi açma hatası:", error);
            await message.reply(`<a:emoji235:1539424382332444732> Kanalın kilidi açılırken bir hata oluştu. Yetkilerimi kontrol et.`);
        }
    }
};