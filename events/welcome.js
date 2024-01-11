const { Events, AttachmentBuilder } = require("discord.js");
const Guild = require("../schemas/Guild");
const {
    parseStringTemplate,
    evaluateParsedString,
    evaluateStringTemplate
} = require("string-template-parser");
const { parse } = require("dotenv");
const PopcatGenerator = require("../modules/PopcatGenerator");

module.exports = {
    name: Events.GuildMemberAdd,
    async listener(client, member) {
        let guildData = await Guild.findOne({
            guildId: member.guild.id
        });

        if (!guildData) {
            guildData = new Guild({
                guildId: member.guild.id
            });
        }

        if (!guildData.config.welcome.enabled) {
            return;
        }

        const channel = client.channels.cache.get(
            guildData.config.welcome.channelId
        );

        if (!channel) {
            return;
        }

        await channel.send({
            content: evaluateStringTemplate(guildData.config.welcome.message, {
                user: `${member.user}`,
                server: member.guild.name
            }),
            files: [
                {
                    attachment: PopcatGenerator.generateWelcomeCard(
                        guildData.config.welcome.image.background,
                        member,
                        guildData.config.welcome.image.text,
                        guildData.config.welcome.image.subtext
                    ),
                    name: "card.png"
                }
            ]
        });
    }
};

// https://api.popcat.xyz/welcomecard?background=https://cdn.discordapp.com/attachments/793764483037528065/998626477648138330/unknown.jpeg&text1=blazedev&text2=Welcome+To+The+Femboy+Party!+:3&text3=We+dont+bite+hard+;3&avatar=https://cdn.discordapp.com/avatars/780997710635335710/3eb407326d93817e76c0434bf51efa59.png
