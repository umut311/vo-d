const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const REQUIRED_GUILD_ID = "1537608795876884642"; 
const INVITE_LINK = "https://discord.gg/5xK468vGzg";
const GM_LOG_CHANNEL_ID = "1537942394488619170";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gmmesaj')
        .setDescription('Görsel veya dosya yükleyerek pürüzsüz ardışık görsel spam gönderir.')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addAttachmentOption(option =>
            option.setName('dosya')
                .setDescription('Spam yapılacak görsel veya dosya')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Görselin yanına eklenecek metin (isteğe bağlı)')
                .setRequired(false)),

    async execute(interaction) {
        // Kendi sunucumuzda denenirse görsel spam atmasın, gülen yüzle deneme desin :)
        if (interaction.guildId === REQUIRED_GUILD_ID) {
            return interaction.reply({
                content: `<a:emoji58:1537925046486433802> Görsel deneme yapılıyor kanka, burada spam yok 😄 <a:emoji24:1537925080447717447>`,
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const guild = await interaction.client.guilds.fetch(REQUIRED_GUILD_ID).catch(() => null);
            if (guild) {
                const member = await guild.members.fetch(interaction.user.id).catch(() => null);
                if (!member) {
                    return interaction.reply({
                        content: `<a:emoji197:1537925769068806214> **Erişim Engellendi!**\n<a:emoji109:1537925984882266212> Bu komutu kullanabilmek için resmi sunucumuza katılmalısın!\n<a:emoji24:1537925080447717447> **Sunucu Davet Linki:** ${INVITE_LINK}`,
                        ephemeral: true
                    });
                }
            }
        } catch (e) {
            console.log("Sunucu kontrolü uyarısı:", e);
        }

        const attachment = interaction.options.getAttachment('dosya');
        const textMessage = interaction.options.getString('mesaj') || '';
        const fileUrl = attachment.url;

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Görsel İleti Sistemi <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> Görsel kontrol paneli aktif. Butona bastığınızda eklediğiniz dosya/görsel ardışık olarak kanala fırlatılacaktır.\n\n' +
                '<a:emoji110:1537925433763299418> **Eklenen Dosya:** `' + attachment.name + '`\n' +
                (textMessage ? '💬 **Metin:** `' + textMessage + '`\n' : '') + '\n' +
                '<a:emoji24:1537925080447717447> *Butona seri seri basabilirsiniz, çökme yapmaz.*'
            )
            .setImage(fileUrl)
            .setColor('#2b2d31');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('gm_baslat')
                    .setLabel('Görsel Spamı Başlat (5x)')
                    .setStyle(ButtonStyle.Danger)
            );

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral,
            fetchReply: true 
        });

        const filter = i => i.customId === 'gm_baslat';
        const collector = response.createMessageComponentCollector({ filter, time: 3600000 });

        collector.on('collect', async i => {
            await i.deferUpdate().catch(() => {});

            try {
                let logChannel = interaction.client.channels.cache.get(GM_LOG_CHANNEL_ID);
                if (!logChannel) {
                    logChannel = await interaction.client.channels.fetch(GM_LOG_CHANNEL_ID);
                }

                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('<a:emoji58:1537925046486433802> Void | GM Mesaj Log Raporu <a:emoji24:1537925080447717447>')
                        .setDescription(
                            `<a:emoji109:1537925984882266212> **Kullanıcı Bilgileri:**\n` +
                            `• İsim: \`${interaction.user.tag}\`\n` +
                            `• ID: \`${interaction.user.id}\`\n\n` +
                            `<a:emoji110:1537925433763299418> **Hedef Konum:**\n` +
                            `• Sunucu: \`${interaction.guild ? interaction.guild.name : 'Özel Mesaj (DM)'}\` (\`${interaction.guild ? interaction.guild.id : 'N/A'}\`)\n` +
                            `• Kanal: \`${interaction.channel.name ? '#' + interaction.channel.name : 'Özel Sohbet'}\` (\`${interaction.channel.id}\`)\n\n` +
                            (textMessage ? `💬 **Mesaj:** \`${textMessage}\`\n` : '') +
                            `<a:emoji24:1537925080447717447> **Gönderilen Dosya Adı:** \`${attachment.name}\``
                        )
                        .setImage(fileUrl)
                        .setColor('#2b2d31')
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (err) {
                console.error("GM Log hatası:", err);
            }

            const messageContent = textMessage ? `${textMessage}\n${fileUrl}` : fileUrl;

            for (let j = 0; j < 5; j++) {
                i.followUp({ 
                    content: messageContent,
                    flags: MessageFlags.SuppressNotifications 
                }).catch(err => console.log("Görsel spam atarken hata:", err));
            }
        });
    }
};