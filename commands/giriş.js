const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ 
    userId: String, 
    token: String, 
    username: String, 
    status: String 
}));

if (!global.girisTokens) global.girisTokens = new Map();

module.exports = {
    name: 'giris', 
    async executeText(message, args) {
        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Token Giriş Paneli <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **Hızlı Giriş Nasıl Yapılır?**\n' +
                'Aşağıdan hesabı seçin. Bot size özel kodu verecek. `discord.com` u açıp klavyeden **F12 -> Console** sekmesine o kodu yapıştırıp Enter\'a basın. Şifresiz içeridesiniz!\n\n' +
                '<a:uyari:1538527482007789648> *Sistem direkt site yönlendirmesi yapmaz, tarayıcı üzerinden Console (F12) işlemi gerektirir.*'
            )
            .setColor('#2b2d31')
            .setThumbnail(serverIcon)
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const actionRow1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_giris_sec').setLabel('Kayıtlılardan Seç').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_giris_manuel').setLabel('Manuel Token Gir').setStyle(ButtonStyle.Secondary)
        );

        const actionRow2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_giris_kod_al').setLabel('Giriş Kodunu Al').setStyle(ButtonStyle.Success)
        );

        await message.channel.send({ embeds: [embed], components: [actionRow1, actionRow2] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        // KAYITLI HESAPLARDAN SEÇME
        if (id === 'btn_giris_sec') {
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
                .setCustomId('select_giris_token')
                .setPlaceholder('Giriş yapılacak hesabı seçin...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await i.reply({ content: '<a:emoji109:1537925984882266212> Hangi hesaba giriş yapacaksın? Lütfen seç:', components: [row], flags: 64 });
        }

        // SEÇİLEN TOKENİ HAFIZAYA ALMA
        if (id === 'select_giris_token') {
            const selectedToken = i.values[0];
            global.girisTokens.set(i.user.id, selectedToken);
            await i.update({ content: '<a:emoji110:1537925433763299418> Hesap başarıyla seçildi! Şimdi **Giriş Kodunu Al** butonuna basabilirsin.', components: [] });
        }

        // MANUEL TOKEN GİRİŞİ
        if (id === 'btn_giris_manuel') {
            const modal = new ModalBuilder()
                .setCustomId('modal_giris_manuel')
                .setTitle('Manuel Token Girişi');

            const tokenInput = new TextInputBuilder()
                .setCustomId('manuel_token')
                .setLabel('Giriş yapılacak tokeni yapıştırın:')
                .setPlaceholder('Örn: MTAxM...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(tokenInput));
            await i.showModal(modal);
        }

        // MANUEL TOKENİ KAYDETME
        if (id === 'modal_giris_manuel') {
            const token = i.fields.getTextInputValue('manuel_token').replace(/['"]/g, '');
            global.girisTokens.set(i.user.id, token);
            await i.reply({ content: '<a:emoji110:1537925433763299418> Token belleğe alındı! Şimdi **Giriş Kodunu Al** butonuna basabilirsin.', flags: 64 });
        }

        // GİRİŞ KODUNU ÜRETME
        if (id === 'btn_giris_kod_al') {
            let token = global.girisTokens.get(i.user.id);
            
            if (!token) {
                const userAccs = await Account.find({ userId: i.user.id });
                if (userAccs && userAccs.length > 0) {
                    token = userAccs[0].token;
                    global.girisTokens.set(i.user.id, token);
                }
            }

            if (!token) {
                return i.reply({ content: '<a:uyari:1538527482007789648> Önce bir hesap seçmeli veya manuel token girmelisin!', flags: 64 });
            }

            const loginScript = `
function login(token) {
    setInterval(() => {
        document.body.appendChild(document.createElement('iframe')).contentWindow.localStorage.token = \`"\${token}"\`;
    }, 50);
    setTimeout(() => {
        location.reload();
    }, 2500);
}
login('${token}');
            `.trim();

            const embed = new EmbedBuilder()
                .setTitle('🔑 Kod Hazır!')
                .setColor('#2b2d31')
                .setDescription(
                    `Aşağıdaki kodu kopyalayın, \`discord.com/login\` sayfasına girip F12 (Console) ekranına yapıştırıp Enter'a basın.\n\n` +
                    `\`\`\`javascript\n${loginScript}\n\`\`\``
                );

            await i.reply({ embeds: [embed], flags: 64 }); 
        }
    }
};