import { Client, Events, GatewayIntentBits, GuildScheduledEvent, Interaction, MessageReaction, MessageReactionEventDetails, PartialMessageReaction, Partials, PartialUser, REST, Routes, SlashCommandBuilder, SlashCommandStringOption, TextChannel, User, VoiceChannel } from "discord.js";
import Variables from "../variables";
import CreateTicket from "./apply/create-ticket";
import DeleteAllMessages from "./commands/admin/delete-all-messages";
import { ClanApplication } from "../entities/clan-application";
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
import Stats from "./commands/stats";
import StartTrial from "./commands/admin/applicant/start-trial";
import Archiver from "./commands/admin/relation/archiver";
import { AudioPlayer } from "@discordjs/voice";
import ObsMusic from "./commands/obs-music";

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
            .setName('obs-music')
            .setDescription('Invites the discord bot to this voice channel to play the audio from Lijk\'s obs with his stream key.'),
        new SlashCommandBuilder()
            .setName('set-stream-key')
            .setDescription('Sets your streamkey for OBS streaming to rtmp://hurx.io:8000/live')
            .addStringOption(string => string.setName('key').setDescription('Your stream key, it can be whatever.').setRequired(true))
    ]

    public static client: Client

    /**
     * Initialize the discord bot
     */
    public static main = async () => {
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
            
            this.client.on('ready', async() => {
                res()
            });
            
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
                    case 'obs-music': {
                        promise = ObsMusic.main(interaction)
                        break
                    }
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
                        promise = ObsMusic.setStreamKey(interaction)
                        break
                    }
                    case 'set-aaa': {
                        const repo = Bot.dataSource.getRepository(ClanApplication)
                        // const clanApp = new ClanApplication()
                        // const channel = await interaction.channel?.fetch(true) as TextChannel
                        // clanApp.rsn = channel.name
                        // clanApp.approved = true
                        // clanApp.trial = true
                        // clanApp.archived = false
                        // clanApp.userId = interaction.options.getUser('user')!.id
                        // await repo.save(clanApp)
                        const apps = await repo.find()
                        for (const app of apps) {
                            const channel = interaction.guild?.channels.cache.find(ch => ch.type === 0 && ch.name === app.rsn && ch.parentId === "1422417597265088532")
                            if (channel) {
                                app.channel = channel.id
                                await repo.save(app)
                            }
                        }
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
            
            this.client.login(Variables.env.DISCORD_TOKEN);
    
            const rest = new REST({ version: '10' }).setToken(Variables.env.DISCORD_TOKEN!)
            await rest.put(
                Routes.applicationGuildCommands(Variables.env.DISCORD_BOT_APP_ID!, Variables.env.DISCORD_GUILD_ID!),
                { body: Discord.commands }
            )
        })
    }
}