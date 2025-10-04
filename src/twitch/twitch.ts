import tmi from 'tmi.js'
import Variables from '../variables';

export default class Twitch {
    public static main = async () => {
        return new Promise<void>((res, rej) => {
            try {
                const twitchClient = new tmi.Client({
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
        
                twitchClient.connect();

                twitchClient.on('message', (channel, tags, message, self) => {
                    if (self) return;
        
                    if (message.toLowerCase() === '!hello') {
                        twitchClient.say(channel, `Hello @${tags.username}!`);
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