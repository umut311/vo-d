const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');

const REQUIRED_GUILD_ID = "1537608795876884642"; 
const INVITE_LINK = "https://discord.gg/voido"; 
const LOG_CHANNEL_ID = "1537938887509278871"; 

module.exports = {
    // =========================================================================
    // 1. SLASH KOMUT KISMI (Kullanıcıların başka sunucularda spam atacağı yer)
    // =========================================================================
    data: new SlashCommandBuilder()
        .setName('spam')
        .setDescription('Kullanıcı uygulaması üzerinden pürüzsüz ardışık mesaj gönderir.')
        .setIntegrationTypes([0, 1]) // 1 = User Install (Hesaba Kurulum)
        .setContexts([0, 1, 2])
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Gönderilecek mesaj (örn: .gg/void)')
                .setRequired(true)),

    async execute(interaction) {
        if (interaction.guildId === REQUIRED_GUILD_ID) {
            return interaction.reply({
                content: `<a:emoji133:1539424360543293521> Kimin Botuyla Kime Spam Atıyon Amk :D <a:emoji195:1539424442768424992>`,
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const guild = await interaction.client.guilds.fetch(REQUIRED_GUILD_ID).catch(() => null);
            if (guild) {
                const member = await guild.members.fetch(interaction.user.id).catch(() => null);
                if (!member) {
                    return interaction.reply({
                        content: `<a:emoji6:1539424274983555112> **Erişim Engellendi!**\n<a:emoji105:1539424496346206298> Bu komutu kullanabilmek için resmi sunucumuza katılmalısın!\n<a:emoji195:1539424442768424992> **Sunucu Davet Linki:** ${INVITE_LINK}`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        } catch (e) {
            console.log("Sunucu kontrolü uyarısı:", e);
        }

        const spamMesaji = interaction.options.getString('mesaj');

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji133:1539424360543293521> Void İleti Sistemi <a:emoji195:1539424442768424992>')
            .setDescription(
                '<a:emoji105:1539424496346206298> Kontrol paneli aktif. Butona bastığınızda mesajlar komut etiketi olmadan doğrudan kanala yansıtılır.\n\n' +
                '<a:emoji105:1539424496346206298> **İletilecek Metin:**\n```text\n' + spamMesaji + '\n```\n' +
                '<a:emoji235:1539424382332444732> *Butona seri seri basabilirsiniz, çökme yapmaz.*'
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
                    logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
                }
                
                if (logChannel) {
                    const channelName = interaction.channel?.name ? '#' + interaction.channel.name : 'Özel Sohbet';

                    const logEmbed = new EmbedBuilder()
                        .setTitle('<a:emoji133:1539424360543293521> Void | Spam Log Raporu <a:emoji195:1539424442768424992>')
                        .setDescription(
                            `<a:emoji105:1539424496346206298> **Kullanıcı Bilgileri:**\n` +
                            `• İsim: \`${interaction.user.tag}\`\n` +
                            `• ID: \`${interaction.user.id}\`\n\n` +
                            `<a:emoji105:1539424496346206298> **Hedef Konum:**\n` +
                            `• Sunucu: \`${interaction.guild ? interaction.guild.name : 'Özel Mesaj (DM)'}\` (\`${interaction.guild ? interaction.guild.id : 'N/A'}\`)\n` +
                            `• Kanal: \`${channelName}\` (\`${interaction.channel?.id || 'N/A'}\`)\n\n` +
                            `<a:emoji195:1539424442768424992> **Gönderilen Metin:**\n\`\`\`text\n${spamMesaji}\n\`\`\``
                        )
                        .setColor('#2b2d31')
                        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
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
    },

    // =========================================================================
    // 2. TEXT KOMUT KISMI (Yetkilinin v!spam yazıp paneli kuracağı yer)
    // =========================================================================
    name: 'spam', 
    async executeText(message, args) {
        // Sadece Yönetici yetkisi olanlar veya Sunucu Sahibi paneli kurabilsin
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator) && message.author.id !== "345821033414262794") return;

        // Doğrudan yeni botun OAuth linki tanımlandı
        const authLink = "https://discord.com/oauth2/authorize?client_id=1539404218023149598&integration_type=1&scope=applications.commands";

        const embed = new EmbedBuilder()
            .setAuthor({ name: '👑 Void | Uygulama Yetkilendirme Paneli', iconURL: message.client.user.displayAvatarURL() })
            .setDescription(
                '➡️ **Uygulama Nasıl Kullanılır ve Çalışır?**\n\n' +
                '➡️ `/spam` **Nasıl Kullanılır?**\n' +
                '• Komutu yazıp göndereceğiniz metni girersiniz, butona basarak ardışık ve hızlıca spam atabilirsiniz.\n\n' +
                '➡️ `/gmmesaj` **Nasıl Kullanılır?**\n' +
                '• Komuta görsel veya dosya yükleyerek metinle birlikte ardışık görsel spam gönderebilirsiniz.\n\n' +
                '💀 **Önemli Kural:** Resmi sunucumuzda ( `.gg/voido` ) bulunmayan kullanıcılar bu komutları çalıştıramaz!\n\n' +
                '⬇️ Aşağıdaki butona tıklayarak yetkilendirmeyi hemen tamamlayabilirsiniz!'
            )
            .setColor('#2b2d31')
            .setThumbnail(message.client.user.displayAvatarURL({ size: 1024 }))
            .setFooter({ text: 'Void Security System © 2026', iconURL: message.client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Yetkilendir 🚀')
                    .setURL(authLink)
                    .setStyle(ButtonStyle.Link)
            );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {}); // Yazan kişinin "v!spam" mesajını siler, ortalık temiz kalır.
    }
};