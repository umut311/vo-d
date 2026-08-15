const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');

const AiChannel = mongoose.models.AiChannel || mongoose.model('AiChannel', new mongoose.Schema({ 
    guildId: String, 
    channelId: String 
}));

module.exports = {
    name: 'ai', 
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Yapay zeka (Grok) kanalını ayarlar.'),

    async execute(interaction) {
        await interaction.reply({ content: 'Lütfen kanala `v!ai kur` veya `v!ai kapat` yazarak kullanın.', flags: 64 });
    },

    async executeText(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && message.author.id !== "345821033414262794") {
            return message.reply('⛔ **Bunu kurmak veya kapatmak için Yönetici olmalısın!**').then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
        }

        const altKomut = args[0];

        if (!altKomut) {
            return message.reply('<a:emoji197:1537925769068806214> Kanka ne yapacağımı söylemedin! Kanala **`v!ai kur`** veya **`v!ai kapat`** yazmalısın.');
        }

        if (altKomut.toLowerCase() === 'kur') {
            await AiChannel.updateOne({ guildId: message.guild.id }, { channelId: message.channel.id }, { upsert: true });
            
            const embed = new EmbedBuilder()
                .setTitle('<a:emoji58:1537925046486433802> Void AI (Grok) Aktif Edildi!')
                .setDescription(
                    '<a:emoji109:1537925984882266212> Bu kanal başarıyla **Yapay Zeka Sohbet Kanalı** olarak ayarlandı!\n\n' +
                    '<a:emoji110:1537925433763299418> Artık üyeler bu kanala normal bir şekilde mesaj atarak Grok yapay zekasıyla anında sohbet edebilir, kod yazdırabilir ve eğlenebilirler.\n\n' +
                    '<a:emoji24:1537925080447717447> Kapatmak için bu kanalda `v!ai kapat` yazabilirsiniz.'
                )
                .setColor('#2b2d31')
                .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();
                
            return message.channel.send({ embeds: [embed] });
        }

        if (altKomut.toLowerCase() === 'kapat') {
            await AiChannel.deleteOne({ guildId: message.guild.id, channelId: message.channel.id });
            return message.reply('<a:emoji110:1537925433763299418> Yapay zeka bu kanalda başarıyla deaktif edildi. Artık normal mesaja dönebilirsiniz.');
        }

        return message.reply('<a:emoji197:1537925769068806214> Yanlış kullanım kanka! Şunları yazabilirsin: `v!ai kur` veya `v!ai kapat`');
    }
};