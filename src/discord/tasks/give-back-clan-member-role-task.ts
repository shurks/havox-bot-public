import { GuildMember, TextChannel, User } from "discord.js"
import Variables from "../../variables"
import Discord from "../discord"
import Bot from "../../bot"
import { ClanApplication } from "../../entities/clan-application"

export default class GiveBackClanMemberRoleTask {
    public static main = async () => {
        const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
        if (!guild) {
            console.error(`No guild cant give back clan member role.`)
            return
        }
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const apps = await repo.find()
        for (const app of apps) {
            if (app.archived || app.userLeft) continue
            if (app.approved || app.trial) {
                try {
                    const member = await guild.members.fetch(app.userId)
                    if (member && !member?.roles.cache.has(Variables.var.ClanMemberRole)) {
                        await member.roles.add(Variables.var.ClanMemberRole)
                        if (app.channel) {
                            const channel = await guild.channels.fetch(app.channel) as TextChannel
                            if (channel) {
                                await channel.send(`Our systems have detected that you lost access to the discord, so we fixed that automatically. We are uncertain whether it's a bug in the discord bot, or an accidental role removal by an admin. We check this every minute, if it happens often reach out to a <@&${Variables.var.StaffRole}> member.`)
                            }
                        }
                    }
                }
                catch (err) {
                    console.error(err)
                }
            }
        }
    }
}