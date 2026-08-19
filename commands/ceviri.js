const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { Client: SelfbotClient } = require('discord.js-selfbot-v13');

const Account = mongoose.models.Account || mongoose.model('Account', new mongoose.Schema({ userId: String, token: String, username: String, status: { type: String, default: 'Beklemede' } }));
const TranslatorConfig = mongoose.models.TranslatorConfig || mongoose.model('TranslatorConfig', new mongoose.Schema({ userId: String, token: String, mode: { type: String, default: 'tr-en' } }));

const REQUIRED_GUILD_ID = "1537608795876884642"; 
const INVITE_LINK = "https://discord.gg/voido";

if (!global.activeTranslators) global.activeTranslators = new Map();
if (!global.translatorModes) global.translatorModes = new Map();

async function translateText(text, sl, tl) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        let translatedText = '';
        data[0].forEach(item => { if (item[0]) translatedText += item[0]; });
        return translatedText;
    } catch (err) {
        console.error("Çeviri API Hatası:", err);
        return null;
    }
}

module.exports = {
    name: 'ceviri', 
    data: new SlashCommandBuilder()
        .setName('cevirici')
        .setDescription('Mesajlarınızı otomatik çeviren sistem paneli.'),
        
    async executeText(message) {
        const serverIcon = message.guild?.iconURL({ dynamic: true }) || message.client.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle('<a:emoji133:1539424360543293521> Void | Otomatik Çevirmen Sistemi <a:emoji195:1539424442768424992>')
            .setDescription(
                '<a:emoji105:1539424496346206298> **Gelen Mesajları Okuma (Sağ Tık Menüsü):**\n' +
                'Başkasının yazdığı mesajı çevirmek için uygulamamızı profilinize kurun ve şunları yapın:\n' +
                '💻 **PC:** Mesaja **Sağ Tıkla** ➔ Uygulamalar ➔ Türkçeye/İngilizceye Çevir\n' +
                '📱 **Mobil:** Mesaja **Basılı Tut** ➔ Uygulamalar ➔ Türkçeye/İngilizceye Çevir\n\n' +
                '<a:emoji144:1539424259552579604> **Otomatik Yazma Nasıl Kullanılır?**\n' +
                '**1.** Kayıtlılardan Seç diyerek hesabınızı tanıtın.\n' +
                '**2.** Çeviri Modunu ayarlayın (Örn: Türkçe -> İngilizce).\n' +
                '**3.** **"Başlat"** butonuna basın.\n' +
                '**4.** Siz kendi dilinizde yazın, sistem mesajınızı anında çevirip düzenlesin!\n\n' +
                '<a:emoji235:1539424382332444732> *Not: Bu sistem yalnızca .gg/voido üyelerine özeldir.*'
            )
            .setColor('#2b2d31')
            .setThumbnail(serverIcon)
            .setFooter({ text: 'Project by noxy', iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Uygulamayı Kur')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/oauth2/authorize?client_id=1539404218023149598&integration_type=1&scope=applications.commands'),
            new ButtonBuilder()
                .setLabel('Yeni Token Ekle')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.com/channels/1537608795876884642/1537974081461297162'),
            new ButtonBuilder()
                .setCustomId('btn_cev_auth_saved')
                .setLabel('Kayıtlılardan Seç')
                .setStyle(ButtonStyle.Primary)
        );
        
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_cev_mode')
                .setLabel('Çeviri Modu')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('btn_cev_start')
                .setLabel('Başlat')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('btn_cev_stop')
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
                    if (!member) return i.reply({ content: `<a:emoji6:1539424274983555112> **Erişim Engellendi:** Bunu kullanabilmek için .gg/voido sunucusunda olmalısın!`, flags: 64 });
                }
            } catch(e) {}

            if (id === 'btn_cev_auth_saved') {
                const userAccounts = await Account.find({ userId: i.user.id });
                if (userAccounts.length === 0) {
                    return i.reply({ content: '<a:emoji235:1539424382332444732> Sisteme kayıtlı tokeniniz yok! Önce paneldeki "Yeni Token Ekle" butonunu kullanıp kanala gidin.', flags: 64 });
                }

                const options = userAccounts.map((acc, index) => ({
                    label: acc.username || `Hesap ${index + 1}`,
                    description: `Token: ${acc.token.substring(0, 15)}...`,
                    value: acc.token
                }));

                const selectMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('select_cev_token').setPlaceholder('Çevirmen hesabı seçin').addOptions(options)
                );

                await i.reply({ content: '<a:emoji105:1539424496346206298> Lütfen çeviri yapacak hesabınızı (tokeninizi) seçin:', components: [selectMenu], flags: 64 });
            }

            if (i.isStringSelectMenu() && id === 'select_cev_token') {
                await i.deferUpdate().catch(()=>{});
                await TranslatorConfig.updateOne({ userId: i.user.id }, { token: i.values[0] }, { upsert: true });
                await i.editReply({ content: '<a:emoji105:1539424496346206298> Seçtiğiniz hesap başarıyla Çevirmen olarak ayarlandı!', components: [] });
            }

            if (id === 'btn_cev_mode') {
                const options = [
                    { label: 'Türkçe ➔ İngilizce', value: 'tr-en' },
                    { label: 'İngilizce ➔ Türkçe', value: 'en-tr' },
                    { label: 'Türkçe ➔ Kürtçe', value: 'tr-ku' }
                ];
                
                const selectMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('select_cev_mode').setPlaceholder('Lütfen çeviri yönünü seçin').addOptions(options)
                );
                
                await i.reply({ content: '<a:emoji105:1539424496346206298> Lütfen hangi dilden hangi dile çeviri yapmak istediğinizi seçin:', components: [selectMenu], flags: 64 });
            }

            if (i.isStringSelectMenu() && id === 'select_cev_mode') {
                await i.deferUpdate().catch(()=>{});
                const selectedMode = i.values[0];
                await TranslatorConfig.updateOne({ userId: i.user.id }, { mode: selectedMode }, { upsert: true });
                global.translatorModes.set(i.user.id, selectedMode);
                
                const modeNames = { 'tr-en': 'Türkçe -> İngilizce', 'en-tr': 'İngilizce -> Türkçe', 'tr-ku': 'Türkçe -> Kürtçe' };
                await i.editReply({ content: `<a:emoji195:1539424442768424992> Çeviri modunuz başarıyla **${modeNames[selectedMode]}** olarak ayarlandı! (Sistem açıksa anında güncellendi)`, components: [] });
            }

            if (id === 'btn_cev_start') {
                await i.deferReply({ flags: 64 }).catch(()=>{});

                if (global.activeTranslators.has(i.user.id)) {
                    return i.editReply({ content: '<a:emoji235:1539424382332444732> Çevirmen sisteminiz halihazırda çalışıyor kanka!' });
                }

                const config = await TranslatorConfig.findOne({ userId: i.user.id });
                if (!config || !config.token) return i.editReply({ content: '<a:emoji235:1539424382332444732> Önce Kayıtlılardan seçmelisiniz!' });

                const startMode = config.mode || 'tr-en';
                global.translatorModes.set(i.user.id, startMode);

                const selfBot = new SelfbotClient({ checkUpdate: false });

                selfBot.on('ready', async () => {
                    global.activeTranslators.set(i.user.id, selfBot);
                    const modeNames = { 'tr-en': 'Türkçe -> İngilizce', 'en-tr': 'İngilizce -> Türkçe', 'tr-ku': 'Türkçe -> Kürtçe' };
                    await i.editReply({ content: `<a:emoji133:1539424360543293521> **Sistem Başlatıldı!**\n<a:emoji105:1539424496346206298> Hesabınız arkada pusuda bekliyor.\n<a:emoji144:1539424259552579604> \`Mod:\` **${modeNames[startMode]}**\n<a:emoji195:1539424442768424992> Siz mesaj attığınız an otomatik çevrilip düzenlenecektir.` });
                });

                selfBot.on('messageCreate', async (msg) => {
                    if (msg.author.id !== selfBot.user.id) return;
                    if (!msg.content) return;
                    if (msg.content.startsWith('/') || msg.content.startsWith('v!')) return;

                    try {
                        const currentMode = global.translatorModes.get(i.user.id) || startMode;
                        const [sourceLang, targetLang] = currentMode.split('-');
                        const translated = await translateText(msg.content, sourceLang, targetLang);
                        if (translated && translated.toLowerCase() !== msg.content.toLowerCase()) {
                            await msg.edit(translated).catch(()=>{});
                        }
                    } catch (e) { console.error("Mesaj düzenleme hatası:", e); }
                });

                selfBot.login(config.token).catch(() => {
                    i.editReply({ content: '<a:emoji235:1539424382332444732> Tokeniniz geçersiz, sistem başlatılamadı.' });
                });
            }

            if (id === 'btn_cev_stop') {
                const bot = global.activeTranslators.get(i.user.id);
                if (bot) {
                    try { bot.destroy(); } catch(e){}
                    global.activeTranslators.delete(i.user.id);
                    global.translatorModes.delete(i.user.id);
                    return i.reply({ content: '<a:emoji105:1539424496346206298> Çevirmen sistemi başarıyla durduruldu. Artık mesajlarınız orijinal kalacak.', flags: 64 });
                } else {
                    return i.reply({ content: '<a:emoji235:1539424382332444732> Halihazırda çalışan bir Çevirmen botunuz bulunmuyor.', flags: 64 });
                }
            }

        } catch (err) { console.error("Buton hatası:", err); }
    }
};