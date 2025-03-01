import * as https from 'https'
import * as fs from 'fs'
import * as cfg from './cfg.js'
import * as wp from './web-properties.js'
import * as utility from './utility.js'

export var scheduledWriteData = []

var webPagesProperties = {
    "index.html": [wp.sendWebPage],
    "server-board.html": [wp.isAdmin, wp.sendWebPage],
    "game-board.html": [wp.isAdmin, wp.sendWebPage],
    "auth.html": [wp.authUserPrms, wp.sendWebPage],
    "user.html": [wp.isUserAuthorized, wp.sendWebPage]
}

var postRequestsProperties = {
    "game-servers": [wp.isAdmin, wp.sendAvailableServers],
    "game-properties": [wp.isAdmin, wp.sendGameProperties],
    "game-start": [wp.isAdmin, wp.startGame],
    "user-game-properties": [wp.isUserAuthorized, wp.sendUserGameProperties],
    "user-vote-request": [wp.isUserAuthorized, wp.setUserVote],
    "game-status": [wp.isAdmin, wp.setVoteStatus]
}

async function serverAccessHandle(req, res) {
    scheduledWriteData = []
    req.url = req.url.substring(1) // remove starting '/'
    if (req.method == 'GET') {
        if (req.url != "" && req.url != "/") {
            if (req.url.includes('..')) {
                console.log(`Detected security issue [ACCESS_FILE_REDIRECTED] from ip ${req.socket.remoteAddress}. URL is '${req.url}'`)
                res.writeHead(403)
            } else {
                const [page_path, query_prms] = utility.extractPagePrms(req)
                let fileLocation = 'web/' + page_path

                if (fs.existsSync(fileLocation) && page_path != "") {
                    let returnCode = 200
                    
                    if (webPagesProperties[page_path] === undefined) {
                        wp.sendWebPage(req, res)
                    } else {
                        for await (let el of webPagesProperties[page_path]) {
                            returnCode = await el(req, res)
                            if (returnCode > 300 || returnCode < 200) {
                                break
                            }
                        }
                    }

                    res.writeHead(returnCode)

                    try {
                        for await (let el of scheduledWriteData) {
                            res.write(await el())
                        }
                    } catch (error) {
                        console.log("[ERROR] Exception found during server handling:")
                        console.log(error)
                    }
                } else {
                    res.writeHead(404)
                }
            }
        } else {
            res.setHeader('location', '/index.html')
            res.writeHead(302)
        }
    } else if (req.method == 'POST') {
        const [page_path, query_prms] = utility.extractPagePrms(req)

        if(postRequestsProperties[page_path] !== undefined) {
            let returnCode = 200

            for await (let el of postRequestsProperties[page_path]) {
                returnCode = await el(req, res)
                if (returnCode > 300 || returnCode < 200) {
                    break
                }
            }

            res.writeHead(returnCode)

            try {
                for await (let el of scheduledWriteData) {
                    res.write(await el())
                }
            } catch (e) {
                console.log("[ERROR] Exception found during server handling:")
                console.log(e)
            }
        } else {
            res.writeHead(404)
        }
    } else {
        res.writeHead(400)
    }

    res.end()
}

console.log(`Web server admin password is: ${cfg.sec_pwd}`)
https.createServer({
        key: fs.readFileSync(cfg.sec_cfg.web.key),
        cert: fs.readFileSync(cfg.sec_cfg.web.cert)
    },
    async (req, rsp) => {
        try {
            await serverAccessHandle(req, rsp)
        } catch (e) {
            console.log("[ERROR] Exception found during server handling:")
            console.log(e)

            rsp.writeHead(500)
        }
    }
).listen(443)

export async function collectRequestData(req) {
    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    let bodyPromise = new Promise((resolve, reject) => {
        req.on('end', () => {
            resolve(body);
        });
    });

    return await bodyPromise;
}