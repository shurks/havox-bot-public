import { readFileSync } from "fs"
import Bot from "../../bot"
import { ClanApplication } from "../../entities/clan-application"
import Discord from "../discord"
import path from "path"
import Variables from "../../variables"
import { GuildMember, MembershipScreeningFieldType, messageLink, PermissionsBitField, TextChannel, User } from "discord.js"
import Stats from "../commands/stats"
import fetchOrNull from "../fetchOrNull"

export default class ProcessAllMembersTask {
    public static main = async() => {
        const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
        const repo = Bot.dataSource.getRepository(ClanApplication)
        const allUserInformation: Record<string, ReturnType<typeof Stats['calculateForUser']> extends Promise<infer A> ? A : null> = JSON.parse(readFileSync(path.join(__dirname, '../../../assets/all-user-information.json')).toString('utf8')) as any
        
        // Rank up notification
        const apps = await repo.find()
        const usersNotified: string[] = []
        
        // Archive + remove old channels
        for (let app of apps) {
            // No user assigned yet
            if (!app.userId) continue
            // Channel could not be found
            if (!app.channel) {
                await repo.delete(app.id)
                continue
            }
            let channel = await guild.channels.fetch(app.channel) as TextChannel
            if (!channel) {
                await guild.channels.delete(app.channel)
                await repo.delete(app.id)
                continue
            }
            let member = await fetchOrNull('member', app.userId)
            if (!member) {
                // Member left the discord
                // Archive
                // TODO: archive should influence hall of fame
                if (!app.archived) {
                    for (const a of apps.filter((v) => v.userId === app.userId)) {
                        a.userLeft = true
                        a.archived = false
                        a.trial = false
                        a.approved = false
                        await repo.save(app)
                    }
                    await channel.setParent(Variables.var.ArchiveCategory, { lockPermissions: false })
                    await channel.send(`This conversation has been archived, the user left.`)
                }
                continue
            }
            // User came back
            if (app.userLeft) {
                if (!app.archived) {
                    for (const a of apps.filter((v) => v.userId === app.userId)) {
                        a.userLeft = false
                        await repo.save(a)
                        if (!a.channel) continue
                        let channel = await guild.channels.fetch(a.channel) as TextChannel
                        if (!channel) continue
                        await channel.send(`Welcome back to Havox, <@${member.id}>!`)
                        channel = await channel.permissionOverwrites.create(app.userId, {
                            ViewChannel: true
                        }) as TextChannel
                        channel = await channel.setParent("1422235439300870174", { lockPermissions: false }) as TextChannel
                    }
                }
                else {
                    for (const a of apps.filter((v) => v.userId === app.userId)) {
                        a.userLeft = false
                        await repo.save(a)
                        if (!a.channel) continue
                        let channel = await guild.channels.fetch(a.channel) as TextChannel
                        if (!channel) continue
                        await channel.send(`Welcome back to Havox, <@${member.id}>. Please keep in mind that we kicked you out for a reason, so why would things be different this time?`)
                        channel = await channel.permissionOverwrites.create(app.userId, {
                            ViewChannel: true
                        }) as TextChannel
                    }
                }
            }
            // Update stats if none available or when its over a week not updated
            // if (
            //     !allUserInformation[app.userId]
            //     || (
            //         allUserInformation[app.userId].updated
            //         &&
            //         new Date().getTime() - allUserInformation[app.userId].updated >= 1000 * 3600 * 24 * 7
            //     )
            //  ) {
            //     allUserInformation[app.userId] = await Stats.calculateForUser(member.user)
            // }
            // Check for rank ups (account-wide)
            const deservedRank = await this.getDeservedRank(member.user, allUserInformation[app.userId])
            const currentRank = await this.getCurrentRank(member)
            const needsRankUp = await this.isLowerRankThan(currentRank, deservedRank)
            const alreadyNotified = app.notifiedAboutRank?.length
                ? app.notifiedAboutRank === deservedRank
                : false
            if (needsRankUp && !alreadyNotified && !app.archived && !usersNotified.includes(member.user.id)) {
                await channel.send(`Hey <@&${Variables.var.StaffRole}>, we have checked and our member <@${member.user.id}> is applicable to be ranked up to ${Variables.var.Emojis[deservedRank].label} <:aaa:${Variables.var.Emojis[deservedRank].id}>. Please use the \`/set-rank\` command to do so ASAP.`)
                usersNotified.push(member.user.id)
            }
            if (deservedRank === app.notifiedAboutRank) {
                usersNotified.push(member.user.id)
            }
            if (usersNotified.includes(member.user.id)) {
                app.notifiedAboutRank = deservedRank
                await repo.save(app)
            }
            // Check for rank-ups (per account) // TODO: later
            // const deservedRankRSN = await this.getDeservedRankRSN
        }
    }

    public static getCurrentRank = async (member: GuildMember): Promise<keyof typeof Variables.var.Emojis> => {
        if (!member) return 'ClanFriend'
        for (const [k, {role}] of Object.entries(Variables.var.Emojis).reverse()) {
            if (member.roles.cache.has(role)) {
                return k as any
            }
        }
        return 'ClanFriend'
    }

    public static getDeservedRank = async (user: User, data: ReturnType<typeof Stats['calculateForUser']> extends Promise<infer A> ? A : null): Promise<keyof typeof Variables.var.Emojis> => {
        const maxClogs = Number(readFileSync(path.join(__dirname, '../../../assets/max-clogs.txt')).toString('utf8'))
        for (const [rank, { req }] of Object.entries(Variables.var.Emojis).reverse()) {
            if (req.clogs) {
                if (typeof req.clogs === 'string') {
                    const percentage = Number(req.clogs.replace('%', '').trim()) / 100
                    if (data?.highestClogs >= Math.ceil(percentage * maxClogs)) {
                        return rank as any
                    }
                }
                else {
                    if (data?.highestClogs >= req.clogs) {
                        return rank as any
                    }
                }
            }
            if (req.ehp) {
                if (typeof req.ehp === 'string') {
                    const percentage = Number(req.ehp.replace('%', '').trim())
                    if (data?.percentageMaxXP >= percentage) {
                        return rank as any
                    }
                }
                else if (typeof req.ehp === 'number') {
                    if (data?.ehpMax >= req.ehp) {
                        return rank as any
                    }
                }
            }
            if (req.total) {
                if (data?.total >= req.total) {
                    return rank as any
                }
            }
        }
        return 'ClanFriend'
    }

    public static isLowerRankThan = async (rankCurrent: keyof typeof Variables.var.Emojis, rankDeserved: keyof typeof Variables.var.Emojis): Promise<boolean> => {
        for (const [rank] of Object.entries(Variables.var.Emojis).reverse()) {
            if (rankDeserved === rank) {
                if (rankCurrent === rank) {
                    return false
                }
                return true
            }
            if (rankCurrent === rank) {
                return false
            }
        }
        return false
    }
}