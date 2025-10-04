import { TextChannel } from "discord.js"
import { ClanApplication } from "../../entities/clan-application"
import Bot from "../../bot"
import Discord from "../discord"
import Variables from "../../variables"

export default class SortRelationManager {
    public static main = async () => {
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
        if (!guild) return

        // Filter text channels in this category and sort by name ascending
        const allChannelsUnarchived: TextChannel[] = []
        const allChannelsArchived: TextChannel[] = []
        const allClanApplications: ClanApplication[] = await repo.find()
        const allClanApplicationsUnarchived = allClanApplications.filter((v) => !v.archived && !v.userLeft && v.rsn?.length)
        const allClanApplicationsArchived = allClanApplications.filter((v) => (v.archived || v.userLeft) && v.rsn?.length)
        for (const b of [allClanApplicationsUnarchived, allClanApplicationsArchived]) {
            for (const c of b) {
                if (!c.channel) continue
                try {
                    const channel = await guild.channels.fetch(c.channel)
                    if (!channel) continue
                    if (b === allClanApplicationsArchived) {
                        allChannelsArchived.push(channel as TextChannel)
                    }
                    else {
                        allChannelsUnarchived.push(channel as TextChannel)
                    }
                }
                catch (err) {
                    continue
                }
            }
        };
        // Move unarchived back to unarchived
        for (let i = 0; i < allChannelsUnarchived.length; i++) {
            const channel = allChannelsUnarchived[i]
            if (channel.parentId !== Variables.var.MembersCategory) {
                await channel.setParent(Variables.var.MembersCategory, { lockPermissions: false })
            }
        }
        // Move archived back to archived
        for (let i = 0; i < allChannelsArchived.length; i++) {
            const channel = allChannelsArchived[i]
            if (channel.parentId !== Variables.var.ArchiveCategory) {
                await channel.setParent(Variables.var.ArchiveCategory, { lockPermissions: false })
            }
        }
        // Order by a-z
        for (const channels of [allChannelsArchived, allChannelsUnarchived]) {
            const sortedChannels = channels.sort((a, b) => a.name.localeCompare(b.name))
            await guild.channels.setPositions(
                sortedChannels.map((ch, index) => ({
                    channel: ch.id,
                    position: index
                }))
            )
        }
    }
}