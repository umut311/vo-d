const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'ticket', 
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Destek paneli oluşturur (Yalnızca Yetkili).')
        .setIntegrationTypes([0])
        .setContexts([0]),
        
    async execute(interaction) {
        await interaction.reply({ content: '<a:emoji235:1539424382332444732> Bu komut şu anlık metin (v!ticket) olarak ayarlandı.', flags: 64 });
    },

    async executeText(message) {
        if (!message.member.permissions.has('Administrator')) return;

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji133:1539424360543293521> Void ┊ İletişim & Destek Merkezi <a:emoji141:1539424556412829817>')
            .setDescription(
                '<a:emoji105:1539424496346206298> **Bir sorun mu yaşıyorsunuz veya iletişime mi geçmek istiyorsunuz?**\n\n' +
                '<a:emoji144:1539424259552579604> Aşağıdaki menüyü kullanarak ihtiyacınıza uygun departmanı seçebilir ve yetkililerimizle hızlıca iletişime geçebilirsiniz.\n\n' +
                '<a:emoji144:1539424259552579604> **Kurallar & İşleyiş:**\n' +
                '• Lütfen formu açık, anlaşılır ve eksiksiz doldurunuz.\n' +
                '• Gereksiz yere talep açan kullanıcılar sistemden uzaklaştırılacaktır.\n\n' +
                '<a:emoji141:1539424556412829817> *Aşağıdan bir seçenek belirleyiniz.*'
            )
            .setColor('#2b2d31')
            .setFooter({ text: 'Void Destek Sistemi', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_cheategory_select')
                .setPlaceholder('Lütfen departman seçiniz...')
                .addOptions([
                    { label: 'İşbirliği', description: 'Sponsorluk, reklam ve işbirliği talepleri.', value: 'isbirligi', emoji: '🤝' },
                    { label: 'Destek Talebi', description: 'Bot veya sistemler hakkında yardım alın.', value: 'destek', emoji: '🛠️' },
                    { label: 'Hata Bildirimi', description: 'Sistemdeki bir hatayı veya açığı bildirin.', value: 'hata', emoji: '🐛' }
                ])
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {}); // Yetkilinin yazdığı v!ticket mesajını temizler
    }
};