const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mongoose = require('mongoose');
const { Client: SelfbotClient, RichPresence } = require('discord.js-selfbot-v13');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ userId: String, token: String, username: String }));

async function handleAFKPanel(interaction) {
    await interaction.deferReply({ flags: 64 }).catch(() => {});
    const userAccounts = await Account.find({ userId: interaction.user.id });
    
    const embed = new EmbedBuilder()
        .setTitle('<a:emoji185:1539424050881761440> Void | AFK Yönetim Merkezi <a:emoji195:1539424442768424992>')
        .setColor('#2b2d31')
        .setThumbnail(interaction.guild?.iconURL({ dynamic: true }) || interaction.client.user.displayAvatarURL({ dynamic: true }))
        .setDescription(`<a:emoji105:1539424496346206298> Kayıtlı hesap sayınız: **${userAccounts.length}**\n\n<a:emoji105:1539424496346206298> *Aşağıdaki buton ile tüm hesaplarınızı AFK (Oynuyor) moduna alabilirsiniz.*`);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('afk_baslat').setLabel('Tümünü AFK Bırak (Oynuyor)').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('afk_durdur').setLabel('Tümünü AFK\'dan Çıkar').setStyle(ButtonStyle.Danger)
    );

    const res = await interaction.editReply({ embeds: [embed], components: [row] });
    const col = res.createMessageComponentCollector({ time: 60000 });

    col.on('collect', async i => {
        if (i.customId === 'afk_baslat') {
            await i.deferUpdate();
            for (const acc of userAccounts) {
                if (global.activeTokens?.has(acc.token)) continue;

                const bot = new SelfbotClient({ checkUpdate: false });
                bot.on('ready', () => {
                    const status = new RichPresence(bot).setApplicationId('1491071700715048970').setName('.gg/voido | AFK').setType('PLAYING');
                    bot.user.setActivity(status);
                    global.activeTokens.set(acc.token, bot);
                });
                bot.login(acc.token).catch(()=>{});
            }
            await interaction.followUp({ content: '<a:emoji133:1539424360543293521> Tüm hesaplar AFK (Oynuyor) moduna alındı.', flags: 64 });
        } 
        
        else if (i.customId === 'afk_durdur') {
            await i.deferUpdate().catch(()=>{});
            await interaction.followUp({ content: '<a:emoji235:1539424382332444732> AFK modundan çıkılıyor ve yazılar temizleniyor... Lütfen bekleyin.', flags: 64 });

            for (const acc of userAccounts) {
                let targetBot = global.activeTokens?.get(acc.token);
                
                if (targetBot) { 
                    try {
                        targetBot.user.setActivity(null);
                        targetBot.user.setPresence({ status: 'invisible', activities: [] });
                    } catch(e){}
                    
                    setTimeout(() => {
                        try { targetBot.destroy(); } catch(e){}
                        global.activeTokens.delete(acc.token); 
                    }, 2500);
                } else {
                    try {
                        const tempBot = new SelfbotClient({ checkUpdate: false });
                        tempBot.on('ready', () => { 
                            try {
                                tempBot.user.setActivity(null);
                                tempBot.user.setPresence({ status: 'invisible', activities: [] });
                            } catch(e){}

                            setTimeout(() => { try { tempBot.destroy(); } catch(e){} }, 2500); 
                        });
                        tempBot.login(acc.token).catch(()=>{});
                    } catch(e) {}
                }
            }
        }
    });
}

module.exports = {
    name: 'afk',
    data: new SlashCommandBuilder().setName('afk').setDescription('Hesapları AFK bırakır.'),
    async execute(interaction) { await handleAFKPanel(interaction); },
    async executeText(message) {
        const embed = new EmbedBuilder()
            .setTitle('<a:emoji185:1539424050881761440> Void | AFK Sistemi <a:emoji195:1539424442768424992>')
            .setDescription('<a:emoji105:1539424496346206298> Kayıtlı hesaplarınızı 7/24 çevrimiçi tutmak ve durumunda sunucu reklamı sergilemek için tıklayın.')
            .setColor('#2b2d31')
            .setThumbnail(message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true }));
        
        // Buraya panel açma butonu eklendi:
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_afk_ac').setLabel('AFK Panelini Aç').setStyle(ButtonStyle.Secondary)
        );
        
        const msg = await message.channel.send({ embeds: [embed], components: [row] });
        msg.createMessageComponentCollector().on('collect', async i => { if (i.customId === 'btn_afk_ac') await handleAFKPanel(i); });
    }
};