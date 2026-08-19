const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'lock',
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('<:emoji235:1539424382332444732> Bu komutu kullanmak için Kanalı Yönet yetkiniz olmalı!');
        }

        try {
            await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
            await message.reply(`<:emoji133:1539424360543293521> Bu kanal başarıyla mesaj gönderimine kapatıldı (Kilitlendi)! <:emoji141:1539424556412829817>`);
        } catch (error) {
            console.error("Kanal kilitleme hatası:", error);
            await message.reply(`<:emoji235:1539424382332444732> Kanal kilitlenirken bir hata oluştu. Yetkilerimi kontrol et.`);
        }
    }
};