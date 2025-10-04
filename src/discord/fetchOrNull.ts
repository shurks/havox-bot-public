import { GuildMember } from "discord.js";
import Variables from "../variables";
import Discord from "./discord";

export default function fetchOrNull<T extends 'member'>(type: T, id: string) {
    return new Promise<
        T extends 'member'
            ? GuildMember | null
            : null
    >(async(res, rej) => {
        const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
        if (type === 'member') {
            try {
                return res(await guild.members.fetch(id) as any || null)
            }
            catch (err) {
                return res(null as any)
            }
        }
        return res(null as any)
    })
}