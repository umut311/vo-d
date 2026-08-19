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
        // Kendi sunucumuzda denenirse görsel spam atmasın
        if (interaction.guildId === REQUIRED_GUILD_ID) {
            return interaction.reply({
                content: `<:emoji133:1539424360543293521> Kimin Botuyla Kime Spam Atıyon Amk :D <:emoji141:1539424556412829817>`,
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const guild = await interaction.client.guilds.fetch(REQUIRED_GUILD_ID).catch(() => null);
            if (guild) {
                const member = await guild.members.fetch(interaction.user.id).catch(() => null);
                if (!member) {
                    return interaction.reply({
                        content: `<:emoji6:1539424274983555112> **Erişim Engellendi!**\n<:emoji105:1539424496346206298> Bu komutu kullanabilmek için resmi sunucumuza katılmalısın!\n<:emoji141:1539424556412829817> **Sunucu Davet Linki:** ${INVITE_LINK}`,
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
            .setTitle('<:emoji133:1539424360543293521> Void | Görsel İleti Sistemi <:emoji141:1539424556412829817>')
            .setDescription(
                '<:emoji105:1539424496346206298> Görsel kontrol paneli aktif. Butona bastığınızda eklediğiniz dosya/görsel ardışık olarak kanala fırlatılacaktır.\n\n' +
                '<:emoji144:1539424259552579604> **Eklenen Dosya:** `' + attachment.name + '`\n' +
                (textMessage ? '💬 **Metin:** `' + textMessage + '`\n' : '') + '\n' +
                '<:emoji141:1539424556412829817> *Butona seri seri basabilirsiniz, çökme yapmaz.*'
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
                    logChannel = await interaction.client.channels.fetch(GM_LOG_CHANNEL_ID).catch(() => null);
                }

                if (logChannel) {
                    const channelName = interaction.channel?.name ? '#' + interaction.channel.name : 'Özel Sohbet';
                    const channelId = interaction.channel?.id || 'N/A';
                    const guildName = interaction.guild?.name || 'Özel Mesaj (DM)';
                    const guildId = interaction.guild?.id || 'N/A';

                    const logEmbed = new EmbedBuilder()
                        .setTitle('<:emoji133:1539424360543293521> Void | GM Mesaj Log Raporu <:emoji141:1539424556412829817>')
                        .setDescription(
                            `<:emoji105:1539424496346206298> **Kullanıcı Bilgileri:**\n` +
                            `• İsim: \`${interaction.user.tag}\`\n` +
                            `• ID: \`${interaction.user.id}\`\n\n` +
                            `<:emoji144:1539424259552579604> **Hedef Konum:**\n` +
                            `• Sunucu: \`${guildName}\` (\`${guildId}\`)\n` +
                            `• Kanal: \`${channelName}\` (\`${channelId}\`)\n\n` +
                            (textMessage ? `💬 **Mesaj:** \`${textMessage}\`\n` : '') +
                            `<:emoji141:1539424556412829817> **Gönderilen Dosya Adı:** \`${attachment.name}\``
                        )
                        .setImage(fileUrl)
                        .setColor('#2b2d31')
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
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