const {
    ActivityType,
    Events,
    Client,
    GatewayIntentBits,
    Collection,
    EmbedBuilder,
    time
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const package = require("./package.json");

require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

client.commands = new Collection();
client.version = package.version;

const commandsFolder = path.join(__dirname, "commands");
const subFolders = fs.readdirSync(commandsFolder);

for (const folder of subFolders) {
    const folderPath = path.join(commandsFolder, folder);
    const commands = fs.readdirSync(folderPath);

    for (const commandFile of commands) {
        const commandPath = path.join(folderPath, commandFile);
        const command = require(commandPath);

        if (
            "data" in command &&
            "execute" in command &&
            "category" in command
        ) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(
                `[WARNING] The command at ${commandPath} is missing a required \"data\", \"execute\", or \"category\" property.`
            );
        }
    }
}

// Event Reading init

const eventsFolder = path.join(__dirname, "events");
const events = fs
    .readdirSync(eventsFolder)
    .filter((file) => file.endsWith(".js"));

for (const eventFile of events) {
    const eventPath = path.join(eventsFolder, eventFile);
    const event = require(eventPath);

    if (event.enabled == false) {
        console.log(`${eventFile} event is disabled.`);
        continue;
    }

    if (event.name && event.listener) {
        client.on(event.name, async (...args) => {
            try {
                await event.listener(client, ...args);
            } catch (error) {
                console.error(error);
                const channel = client.channels.cache.get(
                    "1194467447705718856"
                );

                channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Event Error!")
                            .setColor(process.env.BOT_COLOR)
                            .setDescription(
                                `Error for event ${eventFile} at ${time(
                                    Date.now()
                                )}\n\n\`\`\`\n${error.stack}\n\`\`\``
                            )
                    ]
                });
            }
        });
    } else {
        console.log("One or more fields missing from event " + eventPath);
    }
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName}`);
        return;
    }

    if (command.enabled == false) {
        await interaction.reply({
            content: "This command is disabled.",
            ephemeral: true
        });
        return;
    }

    if (command.devOnly && interaction.guildId != process.env.GUILD_ID) {
        await interaction.reply({
            content:
                "This command is only enabled in development servers at this time. Sorry :p",
            ephemeral: true
        });
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);

        const channel = client.channels.cache.get("1194467447705718856");

        channel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Command Error!")
                    .setColor(process.env.BOT_COLOR)
                    .setDescription(
                        `Error for command ${interaction.commandName} in ${
                            interaction.guild.name
                        } at ${time(Date.now())}\n\n\`\`\`\n${
                            error.stack
                        }\n\`\`\``
                    )
            ]
        });

        let errorMessage = {
            content: "There was an error with this command!",
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log("Mongoose Connected!");
    client.login(process.env.TOKEN);
});
