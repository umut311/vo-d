const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'sil', // v!sil veya vsil olarak çalışır
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('<:emoji235:1539424382332444732> Bu komutu kullanmak için Mesajları Yönet yetkin olmalı!');
        }

        const count = parseInt(args[0]);
        if (!count || isNaN(count) || count < 1 || count > 100) {
            return message.reply('<:emoji235:1539424382332444732> Lütfen geçerli bir sayı girin! (Örn: `v!sil 10` veya `vsil 5`, max: 100)').then(m => setTimeout(() => m.delete().catch(()=>{}), 4000));
        }

        try {
            // Komutun kendi yazdığı mesajı da silsin ki görüntü kirliliği olmasın
            await message.delete().catch(() => {});

            const deleted = await message.channel.bulkDelete(count, true);
            
            const replyMsg = await message.channel.send({ 
                content: `<:emoji133:1539424360543293521> Başarıyla **${deleted.size}** adet mesaj silindi! <:emoji141:1539424556412829817>` 
            });

            // Bilgi mesajı 4 saniye sonra otomatik uçsun
            setTimeout(() => replyMsg.delete().catch(() => {}), 4000);

        } catch (error) {
            console.error("Mesaj silme hatası:", error);
            message.channel.send({ 
                content: `<:emoji235:1539424382332444732> Mesajlar silinemedi! (14 günden eski mesajlar toplu silinemez).` 
            }).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
        }
    }
};