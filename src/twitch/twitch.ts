import tmi from 'tmi.js'
import Variables from '../variables';
import Discord from '../discord/discord';
import { TextChannel } from 'discord.js';

export default class Twitch {
    public static twitchClient: tmi.Client

    public static main = async () => {
        return new Promise<void>((res, rej) => {
            try {
                this.twitchClient = new tmi.Client({
                    options: { debug: true },
                    connection: {
                        reconnect: true,
                        secure: true
                    },
                    identity: {
                        username: Variables.env.TWITCH_USERNAME,
                        password: Variables.env.TWITCH_OAUTH
                    },
                    channels: [Variables.env.TWITCH_CHANNEL!]
                });
        
                this.twitchClient.connect();

                this.twitchClient.on('message', async(channel, tags, message, self) => {
                    if (self) return;
        
                    if (message.toLowerCase() === '!discord') {
                        this.twitchClient.say(channel, `You can join Havox (and Lijkcord) on https://discord.gg/UaUNZvQNBH`);
                    }

                    // Sends to discord voice channel
                    const guild = await Discord.client.guilds.fetch(Variables.var.Guild)
                    if (guild) {
                        const voice = await guild.channels.fetch("1419097763286880449") as TextChannel
                        if (voice) {
                            await voice.send(tags.username + ': ' + message)
                        }
                        else {
                            console.log('No voice channel for twitch found.')
                        }
                    } 
                    else {
                        console.log('No guild found for twitch')
                    }
                });

                res()
            }
            catch (err) {
                rej(err)
            }
        })
    }
}