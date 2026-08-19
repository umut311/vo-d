const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function createRuleEmbed(client) {
    return new EmbedBuilder()
        .setTitle('<a:emoji133:1539424360543293521> VOİD ┊ SUNUCU KURALLARI <a:emoji195:1539424442768424992>')
        .setDescription(
            '<a:emoji235:1539424382332444732> **Sunucumuzun huzurunu ve düzenini korumak için uymanız gereken temel kurallar aşağıdadır:**\n\n' +
            '**1.** <a:emoji105:1539424496346206298> **Saygı ve Düzey:** Olabildiğince saygılı kalın; Adk, Ddk, Mdk gibi ağır hakaretler ve küfürler kesinlikle yasaktır.\n\n' +
            '**2.** <a:emoji105:1539424496346206298> **+18 ve Müstehcenlik:** Herhangi bir kanala +18 veya uygunsuz görsel, video ve medya atmak yasaktır.\n\n' +
            '**3.** <a:emoji105:1539424496346206298> **Spam ve Flood:** Sohbet kanallarında flood atmayın, kimseyi üst üste gereksiz yere etiketleyip (taglayıp) rahatsız etmeyin.\n\n' +
            '**4.** <a:emoji105:1539424496346206298> **Yetkili Kararları:** Yetkililerin almış olduğu kararlara, uyarılarına ve yönlendirmelerine karşı gelmek kesinlikle yasaktır.\n\n' +
            '**5.** <a:emoji105:1539424496346206298> **Reklam Yasağı:** Özel mesajlardan (DM) veya sunucu içerisindeki kanallardan her türlü sosyal medya/sunucu reklamı yapmak yasaktır.\n\n' +
            '**6.** <a:emoji105:1539424496346206298> **Hile ve Zararlı Yazılım:** Sunucu güvenliğini veya üyeleri tehlikeye atacak hile, zararlı link veya token paylaşımı yasaktır.\n\n' +
            '**7.** <a:emoji105:1539424496346206298> **Kişisel Gizlilik:** Hiçbir üyenin kişisel bilgilerini (ifşa, telefon, adres vb.) izinsiz paylaşmak kesinlikle yasaktır.\n\n' +
            '<a:emoji133:1539424360543293521> *Genel kurallar bunlardır. Kuralları okumuş sayılacaksınız, herkese iyi eğlenceler!*'
        )
        .setColor('#2b2d31')
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ 
            text: `Void Security & Rule System`, 
            iconURL: client.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();
}

module.exports = {
    name: 'kurallar', // v!kurallar için tetikleyici isim
    data: new SlashCommandBuilder()
        .setName('kurallar')
        .setDescription('VOİD sunucusunun güncel kurallarını görüntüler.')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2]),

    // Slash komutu (`/kurallar`) için çalışacak kısım
    async execute(interaction) {
        const embed = createRuleEmbed(interaction.client);
        await interaction.reply({ embeds: [embed] });
    },

    // Prefix komutu (`v!kurallar`) için çalışacak kısım
    async executeText(message) {
        const embed = createRuleEmbed(message.client);
        await message.channel.send({ embeds: [embed] }).catch(() => {});
    }
};