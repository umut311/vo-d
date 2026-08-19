const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'boost',
    data: new SlashCommandBuilder()
        .setName('boost')
        .setDescription('Boost log sistemini test eder.'),
        
    async execute(interaction) {
        await interaction.reply({ content: 'Lütfen bunu `v!boost` yazarak kullanın.', flags: 64 });
    },
    
    async executeText(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && message.author.id !== "345821033414262794") {
            return message.reply('<a:emoji6:1539424274983555112> **Bu komutu kullanmak için Yönetici olmalısın!**').then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
        }

        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji133:1539424360543293521> Void | Boost Log Sistemi Aktif! <a:emoji195:1539424442768424992>')
            .setDescription(
                '<a:emoji105:1539424496346206298> **Boost Log Sistemi Başarıyla Tanımlandı!**\n\n' +
                '<a:emoji105:1539424496346206298> Artık sunucuya basılan her takviye anında <#1538176283161403434> kanalına otomatik olarak düşecektir.\n\n' +
                '**Loglanacak Bilgiler:**\n' +
                '• Takviye basan kahraman\n' +
                '• Toplam takviye sayısı\n' +
                '• Güncel sunucu seviyesi'
            )
            .setColor('#f47fff') 
            .setThumbnail(serverIcon)
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();
        
        await message.channel.send({ embeds: [embed] });
    }
};