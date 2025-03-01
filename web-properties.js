import * as utility from './utility.js'
import * as cfg from './cfg.js'
import * as fs from 'fs'
import * as webi from './web-interface.js'
import * as dsc from './discord-bot.js'
import * as db from './game-db.js'

export function generateErrorPage(str) {
    return "<body style=\"font-family: Arial, Helvetica, sans-serif; color: red; font-weight: bold;\">" + str + "</body>"
}

export function isAdmin(req, res) {
    let rqHeaders = req.headers
    if (rqHeaders !== undefined && rqHeaders['cookie'] !== undefined) {
        let cookies = utility.mapWebPrms(rqHeaders['cookie'])

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

export function isUserAuthorized(req, res) {
    const [page_path, query_prms] = utility.extractPagePrms(req)
    let prms = utility.mapWebPrms(query_prms)

    if (db.game_list[prms["gameid"]] === undefined) {
        webi.scheduledWriteData.push(() => generateErrorPage("Failed to find game."))
        return 404
    }

    if (prms['pwd'] !== undefined && prms['userid'] !== undefined && prms["gameid"] !== undefined) {
        if (prms['pwd'] == db.game_list[prms["gameid"]]["members"][prms['userid']]["pass"]) {
            return 200
        } else {
            webi.scheduledWriteData.push(() => generateErrorPage("Invalid credentials."))
            return 401
        }
    } else {
        webi.scheduledWriteData.push(() => generateErrorPage("Failed to authentificated."))
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
                "vote": db.game_list[prms["gameid"]] !== undefined ? 
                    (db.game_list[prms["gameid"]]["members"][e.id] !== undefined ? db.game_list[prms["gameid"]]["members"][e.id]["vote"] : "N/A")
                    : "N/A"
            }
        }))
    })

    return 200
}

export async function startGame(req, res) {
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

    db.createGameDb(prms["gameid"]);

    (await guild.members.fetch()).filter(e => e.id != dsc.discordClient.user.id).forEach(mem => {
        try {
            let userpass = utility.makepasswd(20)
            db.game_list[prms["gameid"]]["members"][mem.id] = {
                "pass": userpass,
                "vote": null
            }

            mem.send(`A game has started for you in server *${guild.name}*. You can connect to your voting page [here](${cfg.sec_cfg.domain.nameserver}/user.html?gameid=${prms["gameid"]}&userid=${mem.id}&pwd=${userpass}).`)
        } catch (error) {
            console.log(`Failed to send private message to user ${mem.id} member of guild ${guild.name}`)
        }
    })

    return 200
}

export async function sendUserGameProperties(req, res) {
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
            if (db.game_list[prms["gameid"]]["members"][e.id] === undefined) return

            return {
                "id": e.id,
                "username": e.displayName,
                "dead": false
            }
        }))
    })

    return 200
}

export async function setUserVote(req, res) {
    const [page_path, query_prms] = utility.extractPagePrms(req)
    let prms = utility.mapWebPrms(query_prms)

    if (db.game_list[prms["gameid"]]["members"][prms['userid']] === undefined) return 404

    let body = await webi.collectRequestData(req)

    if (db.game_list[prms["gameid"]]["vote-ongoing"] == true) {
        if (body == "null") 
            db.game_list[prms["gameid"]]["members"][prms['userid']]["vote"] = null
        else {
            try {
                db.game_list[prms["gameid"]]["members"][prms['userid']]["vote"] = (await (await dsc.getDiscordGuilds().fetch(prms["gameid"])).members.fetch(body)).id
            } catch (err) {
                console.log("[CRITICAL] Failed to fetch guild member. This could be a breach tentative.")
                console.log(err)
                return 500
            }
        }
    }
    
    return 200;
}

export async function setVoteStatus(req, res) {
    const [page_path, query_prms] = utility.extractPagePrms(req)
    let prms = utility.mapWebPrms(query_prms)

    if (prms["enabled"] == "true" || prms["enabled"] == "false" && db.game_list[prms["gameid"]] !== undefined) {
        db.game_list[prms["gameid"]]["vote-ongoing"] = prms["enabled"] == "true"
        return 200
    }

    return 401
}