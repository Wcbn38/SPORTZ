import * as utility from './utility.js'
import * as cfg from './cfg.js'
import * as fs from 'fs'
import * as webi from './web-interface.js'
import * as dsc from './discord-bot.js'

export function generateErrorPage(str) {
    return "<body style=\"font-family: Arial, Helvetica, sans-serif; color: red; font-weight: bold;\">" + str + "</body>"
}

export function isAdmin(req, res) {
    let cookieStr = req.headers
    if (cookieStr !== undefined) {
        let cookies = utility.mapWebPrms(cookieStr['cookie'])

        if (cookies['pwd'] == cfg.sec_pwd) {
            return 200
        } else {
            webi.scheduledWriteData.push(() => generateErrorPage("Administration privileges required."))
            return 401
        }
    } else {
        return 401
    }
}

export function authUserPrms(req, res) {
    const [page_path, query_prms] = utility.extractPagePrms(req)
    let prms = utility.mapWebPrms(query_prms)
    if (prms['pwd'] == cfg.sec_pwd) {
        res.setHeader('set-cookie', `pwd=${prms['pwd']}`)
        return 200
    } else {
        webi.scheduledWriteData.push(() => generateErrorPage("Invalid password."))
        return 401
    }
}

export function sendWebPage(req, res) {
    const [page_path, query_prms] = utility.extractPagePrms(req)

    let fileLocation = 'web/' + page_path
    
    webi.scheduledWriteData.push(() => fs.readFileSync(fileLocation))

    return 200
}

export async function sendAvailableServers(req, res) {
    webi.scheduledWriteData.push(async () => {
        let guilds = await dsc.getDiscordGuilds().fetch()
        return JSON.stringify(guilds.map(e => {
            let ret = {"name": e.name,"id": e.id}
            return ret
        }))
    })

    return 200
}

export async function sendGameProperties(req, res) {
    const [page_path, query_prms] = utility.extractPagePrms(req)
    let prms = utility.mapWebPrms(query_prms)

    if (prms["gameid"] === undefined) {
        webi.scheduledWriteData.push(() => generateErrorPage("No game id provided."))
        return 404
    }

    let guild = await dsc.getDiscordGuilds().fetch(prms["gameid"])

    if (guild === undefined) {
        webi.scheduledWriteData.push(() => generateErrorPage("No server found."))
        return 404
    }

    webi.scheduledWriteData.push(async () => {
        return JSON.stringify((await guild.members.fetch()).filter(e => e.id != dsc.discordClient.user.id).map(e => {
            return {
                "id": e.id,
                "username": e.displayName,
                "dead": false,
                "vote": null
            }
        }))
    })

    return 200
}