import { GuildMember, TextChannel, User } from "discord.js"
import Variables from "../../variables"
import Discord from "../discord"
import Bot from "../../bot"
import { ClanApplication } from "../../entities/clan-application"
import fetchOrNull from "../fetchOrNull"

export default class ApproveTrialistTask {
    public static main = async () => {
        const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
        if (!guild) {
            throw new Error(`Guild was not found.`)
        }
        const channels = {
            trialists: await guild.channels.fetch(Variables.var.TrialistsChannel) as TextChannel,
            newMembers: await guild.channels.fetch(Variables.var.NewMembersChannel) as TextChannel,
            expelAsap: await guild.channels.fetch(Variables.var.ExpelASAPChannel) as TextChannel
        }
        if (!channels.trialists) {
            throw new Error(`No trialists channel.`)
        }
        else if (!channels.newMembers) {
            throw new Error(`No new members channel.`)
        }
        else if (!channels.expelAsap) {
            throw new Error('No expel asap channel.')
        }
        const messages = await channels.trialists.messages.fetch({ limit: 100 })
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const apps = await repo.find()
        for (const application of apps) {
            if (!application.messageIdTrialists?.length) continue
            if (!application.trial) continue
            const member = await fetchOrNull('member', application.userId)
            if (!member) continue
            const channel = await member.guild.channels.fetch(Variables.var.TrialistsChannel) as TextChannel
            if (!channel) break
            const message = await channel.messages.fetch(application.messageIdTrialists)
            if (!message) continue
            if (new Date().getTime() - Variables.var.TrialDurationMs > message.createdTimestamp) {
                // Get the specific reactions by emoji
                const heartReaction = message.reactions.cache.get('❤️');
                const crossReaction = message.reactions.cache.get('❌');

                // Extract counts (default to 0 if not found)
                const heartCount = heartReaction ? heartReaction.count : 0;
                const crossCount = crossReaction ? crossReaction.count : 0;

                const passed = heartCount > crossCount || crossCount === 1
                if (passed) {
                    const newMessage = await channels.newMembers.send({
                        content: `Congratulations <@${application.userId}> (${application.rsn}) on passing the trial!\n\nVotes:\n❤️: ${heartCount}\n❌: ${crossCount}\n\nWelcome to our community! :)`,
                    })
                    await newMessage.react('❤️')
                    await newMessage.react('🔥')
                    // Update database
                    application.approved = true
                    application.trial = false
                    await repo.save(application)
                    // Delete message
                    await message.delete()
                }
                else {
                    const newMessage = await channels.expelAsap.send({
                        content: `Trialist <@${application.userId}> (${application.rsn}) must be expelled from the clan in game.\n\nVotes:\n❤️: ${heartCount}\n❌: ${crossCount}\n\nUse \`/applicant-confirm-deleted ${application.userId}\` when this is completed.`
                    })
                    // Update database
                    application.messageIdExpelAsap = newMessage.id
                    application.approved = false
                    application.trial = false
                    await repo.save(application)
                    // Update member
                    const applicantMember = await fetchOrNull('member', application.userId)
                    if (applicantMember) {
                        await applicantMember.roles.remove(Variables.var.ClanMemberRole)
                        await applicantMember.roles.remove(Variables.var.ClanFriendRole)
                        await applicantMember.roles.add(Variables.var.CommunityMemberRole)
                    }
                    // Delete message
                    await message.delete()
                }
            }
        }
    }
}