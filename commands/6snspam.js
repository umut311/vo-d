const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');

const REQUIRED_GUILD_ID = "1537608795876884642"; 
const INVITE_LINK = "https://discord.gg/5xK468vGzg";
const LOG_CHANNEL_ID = "1537938887509278871"; 
const OAUTH_LINK = "https://discord.com/oauth2/authorize?client_id=1491071700715048970&integration_type=1&scope=applications.commands";

module.exports = {
    name: '6sn', // v!6sn yazınca çalışacak (PANEL KURULUMU)

    // 1. AŞAMA: KANALA PANELİ KURMA
    async executeText(message, args) {
        const isOwner = message.author.id === "345821033414262794";
        const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
        const hasModRole = message.member?.roles.cache.has("1537938887509278871");

        // Sadece yetkililer paneli kurabilir
        if (!isOwner && !isAdmin && !hasModRole) return;

        const embed = new EmbedBuilder()
            .setTitle('<:emoji133:1539424360543293521> Void | Yavaş İleti Sistemi (6 Saniye)')
            .setDescription(
                '<:emoji105:1539424496346206298> Bu sistem, belirlediğiniz bir metni **her 6 saniyede bir** otomatik olarak göndermenizi sağlar. Flood/Spam korumasına takılmaz!\n\n' +
                '<:emoji235:1539424382332444732> **Nasıl Kullanılır?**\n' +
                '**1.** Aşağıdaki butona tıklayarak Void uygulamasını kendi hesabınıza ekleyin (Yetkilendirin).\n' +
                '**2.** Ekleme tamamlandıktan sonra, Discord\'da herhangi bir sohbette (DM dahil) **`/6snspam`** komutunu yazın.\n' +
                '**3.** Açılan özel kontrol panelinden mesajınızı başlatıp durdurabilirsiniz.'
            )
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Sistemi Hesabına Ekle')
                .setStyle(ButtonStyle.Link)
                .setURL(OAUTH_LINK)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
    },

    // 2. AŞAMA: YETKİ VERENİN HESABINA DÜŞECEK SLASH KOMUTU (/6snspam)
    data: new SlashCommandBuilder()
        .setName('6snspam')
        .setDescription('Belirlenen mesajı her 6 saniyede bir otomatik olarak gönderir.')
        .setIntegrationTypes([0, 1]) // 1 numara "User Install" (Kullanıcı Hesabına Ekleme) demek
        .setContexts([0, 1, 2]) // Tüm sohbetlerde kullanılabilir
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Gönderilecek mesaj (örn: .gg/void)')
                .setRequired(true)),

    async execute(interaction) {
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
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        } catch (e) {}

        const spamMesaji = interaction.options.getString('mesaj');

        const embed = new EmbedBuilder()
            .setTitle('<:emoji133:1539424360543293521> Void | Yavaş İleti Paneli <:emoji141:1539424556412829817>')
            .setDescription(
                '<:emoji105:1539424496346206298> Başlat butonuna bastığınızda mesajınız bulunduğunuz sohbete her **6 saniyede bir** gönderilir.\n\n' +
                '<:emoji144:1539424259552579604> **İletilecek Metin:**\n```text\n' + spamMesaji + '\n```\n' +
                '<:emoji141:1539424556412829817> *Durdur butonuna basana kadar işlem arka planda devam eder.*'
            )
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_strt_6sn').setLabel('Başlat').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_stp_6sn').setLabel('Durdur').setStyle(ButtonStyle.Danger)
        );

        const response = await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral, fetchReply: true });

        const filter = i => i.customId === 'btn_strt_6sn' || i.customId === 'btn_stp_6sn';
        const collector = response.createMessageComponentCollector({ filter, time: 3600000 }); // Panel 1 saat aktif kalır

        let spamInterval = null;

        collector.on('collect', async i => {
            await i.deferUpdate().catch(() => {});

            if (i.customId === 'btn_strt_6sn') {
                if (spamInterval) return; // Zaten çalışıyorsa engelle

                try {
                    let logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
                    if (!logChannel) logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
                    
                    if (logChannel) {
                        const channelName = interaction.channel?.name ? '#' + interaction.channel.name : 'DM / Özel Sohbet';
                        const logEmbed = new EmbedBuilder()
                            .setTitle('<:emoji133:1539424360543293521> Void | 6 Saniye Spam Log <:emoji141:1539424556412829817>')
                            .setDescription(
                                `<:emoji105:1539424496346206298> **Kullanıcı:** \`${interaction.user.tag}\` (${interaction.user.id})\n` +
                                `<:emoji144:1539424259552579604> **Hedef:** \`${interaction.guild ? interaction.guild.name : 'DM'}\` - \`${channelName}\`\n\n` +
                                `<:emoji141:1539424556412829817> **Metin:**\n\`\`\`text\n${spamMesaji}\n\`\`\``
                            )
                            .setColor('#2b2d31')
                            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
                    }
                } catch (err) {}

                // İlk mesajı hemen at, sonrasını 6 saniyeye kur
                i.followUp({ content: spamMesaji, flags: MessageFlags.SuppressNotifications }).catch(() => {});
                spamInterval = setInterval(() => {
                    i.followUp({ content: spamMesaji, flags: MessageFlags.SuppressNotifications }).catch(() => {
                        clearInterval(spamInterval);
                        spamInterval = null;
                    });
                }, 6000);
            }

            if (i.customId === 'btn_stp_6sn') {
                if (spamInterval) {
                    clearInterval(spamInterval);
                    spamInterval = null;
                }
            }
        });

        collector.on('end', () => { if (spamInterval) clearInterval(spamInterval); });
    }
};