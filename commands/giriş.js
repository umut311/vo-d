const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ 
    userId: String, 
    token: String, 
    username: String, 
    status: String 
}));

module.exports = {
    name: 'giris',
    async executeText(message, args) {
        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void Token Giriş Sistemi')
            .setColor('#2b2d31')
            .setDescription(
                '**Sistem Açıklaması**\n' +
                'Elindeki token ile hedef hesaba **tek tıkla** giriş yapmanı sağlar.\n' +
                'Token\'ı gir, sistem sana özel bir web linki üretsin. Linke tıkla, hesaba giriş yap.\n\n' +
                '**Nasıl Çalışır?**\n' +
                '» **1.** Aşağıdaki butona tıkla\n' +
                '» **2.** Açılan pencereye token\'ı yapıştır veya kayıtlı hesabı seç\n' +
                '» **3.** Sistem sana özel güvenli giriş linki versin\n' +
                '» **4.** Linke tıkla — hesaba giriş yapılsın\n\n' +
                '**Güvenlik**\n' +
                '🔒 **Gizli:** Üretilen link sadece sana görünür (ephemeral)\n' +
                '<a:uyari:1538527482007789648> **Uyarı:** Sadece PC için geçerlidir. Telefondan denemeyiniz.'
            )
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_void_giris_panel').setLabel('Token ile Giriş Yap').setStyle(ButtonStyle.Success).setEmoji('1537925433763299418'),
            new ButtonBuilder().setCustomId('btn_void_kayitli').setLabel('Kayıtlılardan Seç').setStyle(ButtonStyle.Secondary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    },
    
    async handleInteraction(i) {
        const id = i.customId;

        // 1. MANUEL GİRİŞ MODALINI AÇ
        if (id === 'btn_void_giris_panel') {
            const modal = new ModalBuilder()
                .setCustomId('modal_void_giris')
                .setTitle('Token Giriş Paneli');

            const tokenInput = new TextInputBuilder()
                .setCustomId('token_input')
                .setLabel('Giriş yapılacak tokeni yapıştırın:')
                .setPlaceholder('Örn: MTAxM...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(tokenInput));
            await i.showModal(modal);
        }

        // 2. KAYITLI HESAPLARI LİSTELE
        if (id === 'btn_void_kayitli') {
            const userAccounts = await Account.find({ userId: i.user.id });
            if (!userAccounts || userAccounts.length === 0) {
                return i.reply({ content: '<a:uyari:1538527482007789648> Sisteme kayıtlı tokenin yok!', flags: 64 });
            }

            const options = userAccounts.map((acc, index) => ({
                label: acc.username || `Hesap ${index + 1}`,
                description: `Token: ${acc.token.substring(0, 15)}...`,
                value: acc.token
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_void_kayitli')
                .setPlaceholder('Giriş yapılacak hesabı seçin...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await i.reply({ content: '<a:emoji109:1537925984882266212> Hangi hesaba giriş yapacaksın?', components: [row], flags: 64 });
        }

        // 3. LİNKİ ÜRETİP GÖNDERME FONKSİYONU (Ortak)
        const sendLoginLink = async (interaction, token) => {
            const url = `https://void-project-d59p.onrender.com/giris?token=${token}`;

            const embed = new EmbedBuilder()
                .setTitle('🔑 Giriş Bağlantınız Hazır!')
                .setColor('#2b2d31')
                .setDescription(
                    `Bağlantınız size özel olarak oluşturuldu.\nAşağıdaki butona tıklayarak **tarayıcı üzerinden** tek tıkla giriş işlemini tamamlayabilirsiniz.\n\n` +
                    `<a:uyari:1538527482007789648> *Sadece PC için geçerlidir. Telefondan denemeyin.*`
                );

            const linkRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('🚀 Hesaba Giriş Yap').setStyle(ButtonStyle.Link).setURL(url)
            );

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: '', embeds: [embed], components: [linkRow] });
            } else {
                await interaction.reply({ embeds: [embed], components: [linkRow], flags: 64 });
            }
        };

        // Modal Doldurulunca (Manuel Token)
        if (id === 'modal_void_giris') {
            const token = i.fields.getTextInputValue('token_input').replace(/['"]/g, '');
            await sendLoginLink(i, token);
        }

        // Menüden Seçilince (Kayıtlı Token)
        if (id === 'select_void_kayitli') {
            await i.deferUpdate(); // Menüyü kapat
            const token = i.values[0];
            await sendLoginLink(i, token);
        }
    }
}