const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'sil', // v!sil veya vsil olarak çalışır
    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('<a:emoji197:1537925769068806214> Bu komutu kullanmak için Mesajları Yönet yetkin olmalı!');
        }

        const count = parseInt(args[0]);
        if (!count || isNaN(count) || count < 1 || count > 100) {
            return message.reply('<a:emoji197:1537925769068806214> Lütfen geçerli bir sayı girin! (Örn: `v!sil 10` veya `vsil 5`, max: 100)').then(m => setTimeout(() => m.delete().catch(()=>{}), 4000));
        }

        try {
            // Komutun kendi yazdığı mesajı da silsin ki görüntü kirliliği olmasın
            await message.delete().catch(() => {});

            const deleted = await message.channel.bulkDelete(count, true);
            
            const replyMsg = await message.channel.send({ 
                content: `<a:emoji58:1537925046486433802> Başarıyla **${deleted.size}** adet mesaj silindi!` 
            });

            // Bilgi mesajı 4 saniye sonra otomatik uçsun
            setTimeout(() => replyMsg.delete().catch(() => {}), 4000);

        } catch (error) {
            console.error("Mesaj silme hatası:", error);
            message.channel.send({ 
                content: `<a:emoji197:1537925769068806214> Mesajlar silinemedi! (14 günden eski mesajlar toplu silinemez).` 
            }).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
        }
    }
};