import { Guild, Message, MessageFlagsBitField, PermissionsBitField, TextChannel } from "discord.js"
import { ClanApplication } from "../../entities/clan-application"
import Variables from "../../variables"
import Bot from "../../bot"
import ProcessAllMembersTask from "../tasks/process-all-members-task"

/**
 * Creates a ticket by applying.
 */
export default class CreateTicket {
    /**
     * Runs the functionality
     */
    public static run = async(message: Message) => {
        const guild = message.guild
        if (!guild) {
            throw new Error(`Message has no guild`)
        }
        await this.createTicketChannel(message, guild)
    }

    /**
     * Creates the ticket channel and copies message
     */
    private static createTicketChannel = async(message: Message, guild: Guild): Promise<ClanApplication> => {
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const apps = await repo.find({
            where: {
                userId: message.member?.user.id
            }
        })

        let channel: TextChannel
        let clanApplication: ClanApplication

        if (!apps?.length) {
            clanApplication = new ClanApplication()
            clanApplication.userId = message.author.id
            clanApplication = await repo.save(clanApplication)
    
            // Create the channel
            channel = await guild.channels.create({
                name: `application-${clanApplication.id}`,
                type: 0,
                parent: Variables.var.ClanApplicationsCategory,
                permissionOverwrites: [
                    {
                        id: Variables.var.AppRole,
                        allow: [PermissionsBitField.Flags.MentionEveryone, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    },
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel], // deny @everyone
                    },
                    {
                        id: Variables.var.StaffRole,
                        allow: [PermissionsBitField.Flags.ViewChannel], // allow role
                    },
                    {
                        id: message.author.id,
                        allow: [PermissionsBitField.Flags.ViewChannel], // allow user
                    },
                ],
            })
    
            // Attach channel to clan application
            clanApplication.channel = channel.id
            clanApplication = await repo.save(clanApplication)
        }

        // Deletes all messages except the first
        let fetched
        do {
            fetched = (await message.channel.messages.fetch({ limit: 100 })).filter((v) => v.id !== "1422306587455914167");
            await (message.channel as any).bulkDelete(fetched, true);
        } while (fetched.size >= 2); // loop until no more messages

        if (!apps?.length) {
            // Creates initial message
            await channel!.send({
                content: `Hello, <@&${Variables.var.StaffRole}>, there's a new application from <@${message.author.id}>:\n\n${message.content}`,
                files: message.attachments.map(att => att.url)
            })
    
            return clanApplication!
        }

        for (const app of apps) {
            if (!app.channel) continue
            let channel = await guild.channels.fetch(app.channel) as TextChannel
            if (!channel) continue
            channel = await channel.permissionOverwrites.create(app.userId, {
                ViewChannel: true
            }) as TextChannel
            await channel!.send({
                content: `Hello, <@&${Variables.var.StaffRole}>, there's a request for a ban to be appealed by <@${message.author.id}>. See chat history for more details:\n\n${message.content}`,
                files: message.attachments.map(att => att.url)
            })
            break
        }
        // Link the banned applicant to his former ticket
        await ProcessAllMembersTask.main()
        throw new Error('Could not create ticket, there is already one for this user.')
    }
}