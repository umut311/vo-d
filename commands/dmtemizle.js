const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { Client: SelfbotClient } = require('discord.js-selfbot-v13');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ userId: String, token: String, username: String, status: { type: String, default: 'Beklemede' } }));
const UserConfig = mongoose.models.UserConfig || mongoose.model('UserConfig', new mongoose.Schema({ userId: String, dmToken: String }));

const REQUIRED_GUILD_ID = "1537608795876884642"; 
const INVITE_LINK = "https://discord.gg/voido";
const DM_LOG_CHANNEL_ID = "1538203074823331991"; 

if (!global.activeDmClears) global.activeDmClears = new Map();

module.exports = {
    name: 'dm', 
    data: new SlashCommandBuilder()
        .setName('dmtemizle')
        .setDescription('Sadece DM: O anki özel sohbetinizdeki kendi mesajlarınızı tamamen temizler.')
        .setIntegrationTypes([0, 1]) 
        .setContexts([0, 1, 2]), 
        
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 }).catch(() => {});

        if (interaction.guildId) {
            return interaction.editReply({ content: '<a:emoji197:1537925769068806214> Bu komut sadece **Özel Mesajlarda (DM)** kullanılabilir!' });
        }

        try {
            const guild = await interaction.client.guilds.fetch(REQUIRED_GUILD_ID).catch(() => null);
            if (guild) {
                const member = await guild.members.fetch(interaction.user.id).catch(() => null);
                if (!member) {
                    return interaction.editReply({ content: `<a:emoji197:1537925769068806214> **Erişim Engellendi:** Bu özelliği kullanmak için resmi sunucumuzda olmalısın!\nKatılmak için: ${INVITE_LINK}` });
                }
            }
        } catch (e) {}

        if (global.activeDmClears.has(interaction.user.id)) {
            return interaction.editReply({ content: '<a:emoji197:1537925769068806214> Zaten şu anda devam eden bir mesaj temizleme işleminiz var! Durdurmak isterseniz sunucudaki paneli kullanın.' });
        }

        const config = await UserConfig.findOne({ userId: interaction.user.id });
        let tokenToUse = null;

        if (config && config.dmToken) {
            tokenToUse = config.dmToken;
        } else {
            const acc = await Account.findOne({ userId: interaction.user.id });
            if (acc) tokenToUse = acc.token;
        }

        if (!tokenToUse) {
            return interaction.editReply({ content: '<a:emoji197:1537925769068806214> Önce sunucudaki **v!dm** panelinden Token girmeli veya Kayıtlılardan seçmelisin.' });
        }

        const selfBot = new SelfbotClient({ checkUpdate: false });
        
        selfBot.on('ready', async () => {
            try {
                const channel = selfBot.channels.cache.get(interaction.channelId) || await selfBot.channels.fetch(interaction.channelId).catch(() => null);
                
                if (!channel) {
                    selfBot.destroy();
                    return interaction.editReply({ content: '<a:emoji197:1537925769068806214> Kanal bulunamadı. Lütfen doğru DM kutusunda olduğundan emin ol.' });
                }

                await interaction.editReply({ content: '<a:emoji58:1537925046486433802> Hedef kilitlendi! Tüm mesaj geçmişin taranıyor ve **TURBO** hızda siliniyor... (Durdurmak için sunucudaki paneli kullanabilirsin)' });

                global.activeDmClears.set(interaction.user.id, { stop: false });

                let deletedCount = 0;
                let lastMessageId;
                let keepFetching = true;
                let isStopped = false;

                while (keepFetching && !isStopped) {
                    const fetchOptions = { limit: 100 };
                    if (lastMessageId) fetchOptions.before = lastMessageId;

                    const messages = await channel.messages.fetch(fetchOptions).catch(() => null);
                    
                    if (!messages || messages.size === 0) {
                        keepFetching = false;
                        break;
                    }

                    const userMessages = messages.filter(m => m.author.id === selfBot.user.id);
                    
                    for (const msg of userMessages.values()) {
                        const state = global.activeDmClears.get(interaction.user.id);
                        if (state && state.stop) {
                            isStopped = true;
                            break;
                        }

                        await msg.delete().catch(() => {});
                        deletedCount++;
                        
                        await new Promise(r => setTimeout(r, 150));
                    }

                    lastMessageId = messages.last().id;
                }

                selfBot.destroy();
                global.activeDmClears.delete(interaction.user.id);
                
                const bitisMesaji = isStopped 
                    ? `<a:emoji197:1537925769068806214> İşlem panelden durduruldu! O ana kadar **${deletedCount}** mesaj başarıyla silindi.` 
                    : `<a:emoji110:1537925433763299418> Şov tamamlandı! Sana ait olan tam **${deletedCount}** mesaj başarıyla tarihe gömüldü.`;

                await interaction.editReply({ content: bitisMesaji }).catch(()=>{});

                if (deletedCount > 0) {
                    try {
                        let logChannel = interaction.client.channels.cache.get(DM_LOG_CHANNEL_ID);
                        if (!logChannel) logChannel = await interaction.client.channels.fetch(DM_LOG_CHANNEL_ID).catch(() => null);
                        
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle(isStopped ? '<a:emoji197:1537925769068806214> DM Temizliği Durduruldu' : '<a:emoji58:1537925046486433802> Void | Yeni DM Temizliği')
                                .setColor(isStopped ? '#ff0000' : '#2b2d31')
                                .addFields(
                                    { name: 'Kullanıcı', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: true },
                                    { name: 'Silinen Mesaj', value: `**${deletedCount}** Adet`, inline: true },
                                    { name: 'DM Kanal ID', value: `\`${interaction.channelId}\``, inline: true }
                                )
                                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                                .setTimestamp();
                                
                            await logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
                        }
                    } catch (e) {}
                }

            } catch (e) {
                selfBot.destroy();
                global.activeDmClears.delete(interaction.user.id);
                await interaction.editReply({ content: '<a:emoji197:1537925769068806214> Mesajları silerken beklenmedik bir hata oluştu.' }).catch(()=>{});
            }
        });

        selfBot.login(tokenToUse).catch(() => {
            interaction.editReply({ content: '<a:emoji197:1537925769068806214> Token geçersiz veya hesap kilitlenmiş. Lütfen paneli kullanarak tokenini güncelle.' });
        });
    },

    async executeText(message) {
        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji58:1537925046486433802> Void | Özel Mesaj (DM) Temizleyici <a:emoji24:1537925080447717447>')
            .setDescription(
                '<a:emoji109:1537925984882266212> **DM Temizleme Sistemi Nedir?**\n' +
                'Özel sohbetlerinizdeki (DM) kendi gönderdiğiniz mesajları **tek bir tuşla** tamamen silebilirsiniz!\n\n' +
                '<a:emoji110:1537925433763299418> **Nasıl Kullanılır?**\n' +
                '**1.** Uygulamamızı profilinize kurmak için aşağıdaki link butonuna basın.\n' +
                '**2.** Sistemin mesajlarınızı silebilmesi için Kayıtlı hesabı seçin.\n' +
                '**3.** Mesajları silmek istediğiniz DM kutusuna girip `/dmtemizle` yazın.\n\n' +
                '<a:emoji24:1537925080447717447> *Not: Bu sistem yalnızca .gg/voido üyelerine özeldir.*'
            )
            .setColor('#2b2d31')
            .setThumbnail(serverIcon)
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        // Yeni Token Gir butonu yerine doğrudan Token Kanalına yönlendiren Link butonu eklendi.
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Uygulamayı Kur')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/oauth2/authorize?client_id=1491071700715048970&integration_type=1&scope=applications.commands'),
            new ButtonBuilder()
                .setLabel('Yeni Token Ekle')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/channels/1537608795876884642/1537974081461297162')
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_dm_auth_saved')
                .setLabel('Kayıtlılardan Seç')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('btn_dm_stop')
                .setLabel('Durdur')
                .setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({ embeds: [embed], components: [row1, row2] });
    },

    async handleInteraction(i) {
        const id = i.customId;

        try {
            try {
                const guild = await i.client.guilds.fetch(REQUIRED_GUILD_ID).catch(() => null);
                if (guild) {
                    const member = await guild.members.fetch(i.user.id).catch(() => null);
                    if (!member) {
                        return i.reply({ content: `<a:emoji197:1537925769068806214> **Erişim Engellendi:** Bunu kullanabilmek için .gg/voido sunucusunda olmalısın!`, flags: 64 });
                    }
                }
            } catch(e) {}

            if (id === 'btn_dm_stop') {
                const state = global.activeDmClears.get(i.user.id);
                
                if (!state) {
                    return i.reply({ content: '<a:emoji197:1537925769068806214> Henüz DM silmeye başlanmadı, tekrar deneyiniz.', flags: 64 });
                }
                
                state.stop = true;
                return i.reply({ content: '<a:emoji197:1537925769068806214> Durdurma sinyali gönderildi, silme işlemi kesiliyor...', flags: 64 });
            }

            if (id === 'btn_dm_auth_saved') {
                const userAccounts = await Account.find({ userId: i.user.id });
                if (userAccounts.length === 0) {
                    return i.reply({ content: '<a:emoji197:1537925769068806214> Sisteme kayıtlı hiçbir tokeniniz bulunmuyor! Lütfen paneldeki "Yeni Token Ekle" butonuna basarak kanala gidin.', flags: 64 });
                }

                const options = userAccounts.map((acc, index) => ({
                    label: acc.username || `Hesap ${index + 1}`,
                    description: `Token: ${acc.token.substring(0, 15)}...`,
                    value: acc.token
                }));

                const selectMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_dm_token')
                        .setPlaceholder('Temizlik yapılacak hesabı seçin')
                        .addOptions(options)
                );

                await i.reply({ 
                    content: '<a:emoji109:1537925984882266212> Lütfen DM kutusunu temizleyecek olan hesabınızı (tokeninizi) seçin:', 
                    components: [selectMenu], 
                    flags: 64 
                });
            }

            if (i.isStringSelectMenu() && id === 'select_dm_token') {
                await i.deferUpdate().catch(()=>{});
                const selectedToken = i.values[0];
                await UserConfig.updateOne({ userId: i.user.id }, { dmToken: selectedToken }, { upsert: true });
                
                await i.editReply({ content: '<a:emoji110:1537925433763299418> Seçtiğiniz hesap başarıyla DM Temizleyici olarak ayarlandı! Artık `/dmtemizle` kullanabilirsiniz.', components: [] });
            }
        } catch (err) { console.error("Buton hatası:", err); }
    }
};