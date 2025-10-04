import { Message } from "discord.js";
import Variables from "../../../variables";
import fetchOrNull from "../../fetchOrNull";

export default class DeleteAllMessages {
    public static run = async (message: Message) => {
        const member = await fetchOrNull('member', message.author.id)
        if (!member) {
            console.log({message})
            throw new Error('No member')
        }
        if (member.roles.cache.has(Variables.var.OwnerRole)) {
            let fetched
            do {
                fetched = await message.channel.messages.fetch({ limit: 100 });
                await (message.channel as any).bulkDelete(fetched, true);
            } while (fetched.size >= 2); // loop until no more messages
        }
    }
}