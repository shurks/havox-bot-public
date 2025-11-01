import { Client, Events, GatewayIntentBits, GuildScheduledEvent, Interaction, MessageReaction, MessageReactionEventDetails, PartialMessageReaction, Partials, PartialUser, REST, Routes, SlashCommandBuilder, SlashCommandStringOption, TextChannel, User, VoiceChannel } from "discord.js";
import Variables from "../variables";
import CreateTicket from "./apply/create-ticket";
import DeleteAllMessages from "./commands/admin/delete-all-messages";
import Bot from "../bot";
import ApplicantConfirmDeleted from "./commands/admin/applicant/applicant-confirm-deleted";
import AddRSN from "./commands/admin/relation/add-rsn";
import SetTwitter from "./commands/relation/set-twitter";
import Twitter from "./commands/twitter";
import Twitters from "./commands/twitters";
import RelationSetRSN from "./commands/relation/relation-set-rsn";
import RelationSetRank from "./commands/admin/relation/set-rank";
import RelationRequestRank from "./commands/relation/relation-request-rank";
import RSN from "./commands/rsn";
import StartTrial from "./commands/admin/applicant/start-trial";
import Archiver from "./commands/admin/relation/archiver";
import { AudioPlayer } from "@discordjs/voice";
import InitializeTicket from "./commands/admin/initialize-ticket";
import DeleteRSN from "./commands/admin/delete-rsn";
import { RadioBot } from "../entities/radio-bot";
import Voice from "./voice";
import SetStreamKey from "./commands/set-stream-key";
import { ClanApplication } from "../entities/clan-application";
import Twitch from "../twitch/twitch";
import Stats from "./commands/stats";

const rankChoices = Object.entries(Variables.var.Emojis).map(([k, v]) => {
    // TODO: calculate
    let suffix = ` `
    if (v.req.total) {
        suffix += `${v.req.total} TTL `
    }
    if (v.req.ehp) {
        suffix += `${v.req.ehp} EHP `
    }
    if (v.req.ca) {
        suffix += `${v.req.ca} CA `
    }
    if (v.req.clogs) {
        suffix += `${v.req.clogs} Clog `
    }
    return {
        name: suffix.trim().length
            ? `${v.label} (${suffix.trim()})`
            : v.label,
        value: k
    }
})

export default class Discord {
    /** Player */
    public static player: AudioPlayer

    /**
     * All the commands
     */
    public static readonly commands = [
        new SlashCommandBuilder()
            .setName('start-trial')
            .setDescription('Admin: Marks an applicant as approved, starts trial, and links the rsn to his/her discord.')
            .addStringOption(option =>
                option.setName("rsn")
                    .setDescription("RSN of the applicant")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName("rank")
                    .setDescription("What rank does the player get according to #havox-ranks?")
                    .setRequired(true)
                    .addChoices(rankChoices)
            ),
        new SlashCommandBuilder()
            .setName('initialize-ticket')
            .setDescription('Admin: Creates a ticket for an applicant, and approves them without trial.')
            .addUserOption(option =>
                option
                    .setName('user')
                    .setRequired(true)
                    .setDescription('The user to create a ticket for')
            )
            .addStringOption(rsn =>
                rsn
                    .setName('rsn')
                    .setRequired(true)
                    .setDescription('The RSN of the user (more can be added later)')
            ),
        new SlashCommandBuilder()
            .setName('delete-rsn')
            .setDescription('Admin: Delete a RSN for a user within a ticket')
            .addStringOption(rsn => rsn.setRequired(true).setName('rsn').setDescription('The RSN to delete'))
        ,
        new SlashCommandBuilder()
            .setName('applicant-confirm-deleted')
            .setDescription('Admin: Confirms that an applicant is deleted from the clan in game, after failing the trial.')
            .addStringOption(option =>
                option.setName('user-id')
                    .setDescription('The Discord User ID of the applicant, can be seen in develop mode and right clicking the user.')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('add-rsn')
            .setDescription('Admin: Creates a nwe ticket for a discord user for another one of their rsn\'s.')
            .addStringOption(rsn => rsn.setName('rsn').setDescription('The RSN of the user.').setRequired(true)),
        new SlashCommandBuilder()
            .setName('set-twitter')
            .setDescription('Sets your twitter hook for others to see, must start with @')
            .addStringOption(twitter =>
                twitter.setName('username')
                    .setDescription('Your @username')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('set-rsn')
            .setDescription('Changes your rsn for one of your accounts in the clan. To be used in Relation Manager Ticket.')
            .addStringOption(
                rsn =>
                    rsn.setName('rsn')
                        .setDescription('Your RSN')
                        .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('set-rank')
            .setDescription('Admin: Use in a ticket, sets rank for user.')
            .addStringOption(option =>
                option.setName("rank")
                    .setDescription("What rank does the player get according to #havox-ranks?")
                    .setRequired(true)
                    .addChoices(rankChoices)
            ),
        new SlashCommandBuilder()
            .setName('request-rank')
            .setDescription('Requests a rank-up in the clan')
            .addStringOption(option =>
                option.setName("rank")
                    .setDescription("What rank are you applying for")
                    .setRequired(true)
                    .addChoices(rankChoices)
            )
            .addStringOption(reason => reason.setName('reason').setRequired(true).setDescription('Describe what caused the rank up.')),
        new SlashCommandBuilder()
            .setName('twitter')
            .setDescription('Checks the twitter of someone in the discord, if they set it.')
            .addUserOption(user =>
                user.setName('user')
                    .setDescription('The user in the discord.')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('twitters')
            .setDescription('Lists all the twitter hooks of clan members, so you can follow. Only you can see it.'),
        new SlashCommandBuilder()
            .setName('rsn')
            .setDescription('Checks the rsn(s) of someone in the discord')
            .addUserOption(user =>
                user.setName('user')
                    .setDescription('The user in the discord.')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('stats')
            .setDescription('Shows the OSRS stats for a user')
            .addUserOption(user =>
                user.setName('user')
                    .setDescription('The user to check stats for.')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('archive')
            .setDescription('Archives the user in this ticket and removes him/her from the clan.'),
        new SlashCommandBuilder()
            .setName('unarchive')
            .setDescription('Unarchives the user in this ticket and puts him/her back in the clan.'),
        new SlashCommandBuilder()
            .setName('set-stream-key')
            .setDescription('Sets your streamkey for OBS streaming to rtmp://hurx.io:8000/live')
            .addStringOption(string => string.setName('key').setDescription('Your stream key, it can be whatever.').setRequired(true))
    ]

    public static client: Client

    public static radios: Record<string, Client> = {}

    public static radioBot = async (appId: string, token: string) => {
        return new Promise<void>(async (res, rej) => {
            const radio = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent,
                    GatewayIntentBits.GuildMessageReactions,
                    GatewayIntentBits.GuildMembers,
                    GatewayIntentBits.GuildVoiceStates
                ],
                partials: [
                    Partials.Message,
                    Partials.Channel,
                    Partials.Reaction,
                    Partials.User,
                ]
            });

            try {
                await radio.login(token);
            }
            catch (err) {
                if (err instanceof Error && err.message.includes("Not enough sessions remaining")) {
                    console.warn("Rate-limited by Discord. Retrying after cooldown...");
                    setTimeout(() => process.exit(1), 60 * 1000); // exit and let PM2 restart later
                } else {
                    throw err;
                }
            }

            this.radios[token] = radio

            return res()
        })
    }

    /**
     * Initialize the discord bot
     */
    public static main = async (cron = false) => {
        return new Promise<void>(async (res, rej) => {
            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent,
                    GatewayIntentBits.GuildMessageReactions,
                    GatewayIntentBits.GuildMembers,
                    GatewayIntentBits.GuildVoiceStates
                ],
                partials: [
                    Partials.Message,
                    Partials.Channel,
                    Partials.Reaction,
                    Partials.User,
                ]
            });

            this.client.on(Events.ClientReady, async () => {
                res()
            });

            if (!cron) {
                this.client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
                    if (oldState.channel && oldState.channel.id !== newState.channel?.id && oldState.channelId) {
                        const repo = Bot.dataSource.getRepository(RadioBot)
                        const discordRadio = await repo.findOne({
                            where: {
                                channel: oldState.channelId
                            }
                        })
                        if (!discordRadio?.userId) return
                        const appRepo = Bot.dataSource.getRepository(ClanApplication)
                        const app = await appRepo.findOne({
                            where: {
                                userId: discordRadio.userId
                            }
                        })
                        if (!app) return
                        if (oldState.member?.user?.id === app.userId) {
                            await Voice.closeStream(discordRadio.token)
                            discordRadio.userId = null
                            await repo.save(discordRadio)
                        }
                    }
                })

                this.client.on(Events.MessageCreate, async (message) => {
                    if (message.author.bot) return;
                    if (message.content === '!delete-all-messages') {
                        await DeleteAllMessages.run(message)
                    }
                    else if (message.channel.id === Variables.var.ApplyChannel) {
                        await CreateTicket.run(message)
                    }
                    else if ([
                        Variables.var.NewMembersChannel,
                        Variables.var.RareDropsChannel,
                        Variables.var.AchievementsChannel,
                        Variables.var.RankupsChannel,
                        Variables.var.AllroundIronmanChannel,
                        "1423868344070836325" //Music
                    ].includes(message.channelId)) {
                        await message.react('❤️')
                        await message.react('🔥')
                    }
                    else if (message.channelId === Variables.var.MemesChannel) {
                        await message.react('😂')
                        await message.react('🔥')
                    }
                    if (Twitch.twitchClient && message.channelId === '1419097763286880449') {
                        await Twitch.twitchClient.say('lijk1337', `${message.author.displayName}: ${message.content}`)
                    }
                });

                this.client.on(Events.MessageReactionAdd, async (
                    reaction: MessageReaction | PartialMessageReaction,
                    user: User | PartialUser
                ) => {
                    if (user.bot) return
                    // When a reaction is received, check if the structure is partial
                    if (reaction.partial) {
                        // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
                        try {
                            await reaction.fetch();
                        } catch (error) {
                            console.error('Something went wrong when fetching the message:', error);
                            // Return as `reaction.message.author` may be undefined/null
                            return;
                        }
                    }
                })

                this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
                    if (!interaction.isChatInputCommand()) return

                    await interaction.deferReply()

                    let promise: Promise<any> = Promise.resolve()

                    switch (interaction.commandName) {
                        case 'start-trial': {
                            promise = StartTrial.main(interaction)
                            break
                        }
                        case 'applicant-confirm-deleted': {
                            promise = ApplicantConfirmDeleted.main(interaction)
                            break
                        }
                        case 'add-rsn': {
                            promise = AddRSN.main(interaction)
                            break
                        }
                        case 'set-twitter': {
                            promise = SetTwitter.main(interaction)
                            break
                        }
                        case 'set-rsn': {
                            promise = RelationSetRSN.main(interaction)
                            break
                        }
                        case 'set-rank': {
                            promise = RelationSetRank.main(interaction)
                            break
                        }
                        case 'request-rank': {
                            promise = RelationRequestRank.main(interaction)
                            break
                        }
                        case 'twitter': {
                            promise = Twitter.main(interaction)
                            break
                        }
                        case 'rsn': {
                            promise = RSN.main(interaction)
                            break
                        }
                        case 'stats': {
                            promise = Stats.main(interaction)
                            break
                        }
                        case 'twitters': {
                            promise = Twitters.main(interaction)
                            break
                        }
                        case 'archive': {
                            // TODO: threads for crons
                            promise = Archiver.archive(interaction)
                            break
                        }
                        case 'unarchive': {
                            promise = Archiver.unarchive(interaction)
                            break
                        }
                        case 'set-stream-key': {
                            promise = SetStreamKey.main(interaction)
                            break
                        }
                        case 'initialize-ticket': {
                            promise = InitializeTicket.main(interaction)
                            break
                        }
                        case 'delete-rsn': {
                            promise = DeleteRSN.main(interaction)
                            break
                        }
                    }

                    try {
                        await promise
                    }
                    catch (err) {
                        console.error(err)
                        await interaction.editReply("❌ Something went wrong with a request to discord, please try again in 30 minutes.");
                    }
                })
            }

            try {
                await this.client.login(Variables.env.DISCORD_TOKEN);
            }
            catch (err) {
                if (err instanceof Error && err.message.includes("Not enough sessions remaining")) {
                    console.warn("Rate-limited by Discord. Retrying after cooldown...");
                    setTimeout(() => process.exit(1), 60 * 1000); // exit and let PM2 restart later
                } else {
                    throw err;
                }
            }

            const rest = new REST({ version: '10' }).setToken(Variables.env.DISCORD_TOKEN!)
            await rest.put(
                Routes.applicationGuildCommands(Variables.env.DISCORD_BOT_APP_ID!, Variables.env.DISCORD_GUILD_ID!),
                { body: Discord.commands }
            )
        })
    }
}
