const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const REQUIRED_GUILD_ID = "1537608795876884642"; 
const INVITE_LINK = "https://discord.gg/5xK468vGzg";
const LOG_CHANNEL_ID = "1537938887509278871";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spam')
        .setDescription('Kullanıcı uygulaması üzerinden pürüzsüz ardışık mesaj gönderir.')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Gönderilecek mesaj (örn: .gg/void)')
                .setRequired(true)),

    async execute(interaction) {
        // Kendi sunucumuzda denenirse spam atmasın, gülen yüzle deneme desin :)
        if (interaction.guildId === REQUIRED_GUILD_ID) {
            return interaction.reply({
                content: `<a:emoji58:1537925046486433802> Kimin Botuyla Kime Spam Atıyon Amk :D <a:emoji24:1537925080447717447>`,
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

        const spamMesaji = interaction.options.getString('mesaj');

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void İleti Sistemi <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> Kontrol paneli aktif. Butona bastığınızda mesajlar komut etiketi olmadan doğrudan kanala yansıtılır.\n\n' +
                '<a:emoji110:1537925433763299418> **İletilecek Metin:**\n```text\n' + spamMesaji + '\n```\n' +
                '<a:emoji24:1537925080447717447> *Butona seri seri basabilirsiniz, çökme yapmaz.*'
            )
            .setColor('#2b2d31');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('spami_baslat')
                    .setLabel('İletimi Başlat (5x)')
                    .setStyle(ButtonStyle.Danger)
            );

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral,
            fetchReply: true 
        });

        const filter = i => i.customId === 'spami_baslat';
        const collector = response.createMessageComponentCollector({ filter, time: 3600000 });

        collector.on('collect', async i => {
            await i.deferUpdate().catch(() => {});

            try {
                let logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
                if (!logChannel) {
                    logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
                }
                
                if (logChannel) {
                    // Güvenli kanal adı kontrolü (DM'de patlamasını önler)
                    const channelName = interaction.channel?.name ? '#' + interaction.channel.name : 'Özel Sohbet';

                    const logEmbed = new EmbedBuilder()
                        .setTitle('<a:emoji58:1537925046486433802> Void | Spam Log Raporu <a:emoji24:1537925080447717447>')
                        .setDescription(
                            `<a:emoji109:1537925984882266212> **Kullanıcı Bilgileri:**\n` +
                            `• İsim: \`${interaction.user.tag}\`\n` +
                            `• ID: \`${interaction.user.id}\`\n\n` +
                            `<a:emoji110:1537925433763299418> **Hedef Konum:**\n` +
                            `• Sunucu: \`${interaction.guild ? interaction.guild.name : 'Özel Mesaj (DM)'}\` (\`${interaction.guild ? interaction.guild.id : 'N/A'}\`)\n` +
                            `• Kanal: \`${channelName}\` (\`${interaction.channel?.id || 'N/A'}\`)\n\n` +
                            `<a:emoji24:1537925080447717447> **Gönderilen Metin:**\n\`\`\`text\n${spamMesaji}\n\`\`\``
                        )
                        .setColor('#2b2d31')
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (err) {
                console.error("Spam log hatası:", err);
            }

            for (let j = 0; j < 5; j++) {
                i.followUp({ 
                    content: spamMesaji,
                    flags: MessageFlags.SuppressNotifications 
                }).catch(err => console.log("Webhook atarken hata:", err));
            }
        });
    }
};