import * as djs from 'discord.js'
import * as cfg from './cfg.js'

export const discordClient = new djs.Client({ intents: [djs.GatewayIntentBits.Guilds, djs.GatewayIntentBits.GuildMembers] })

discordClient.on(djs.Events.ClientReady, readyClient => {
  console.log(`Discord bot is up and running (uid=${readyClient.user.id})`);
});

export function getDiscordGuilds() {
  return discordClient.guilds
}

discordClient.login(cfg.sec_cfg.discord.api_key_prv)