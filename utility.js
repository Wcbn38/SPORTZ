export function makepasswd(length) {
    var result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < length; i++)
        result += characters.charAt(Math.floor(Math.random() * characters.length))

    return result
}

export function mapWebPrms(prms) {
    if (prmArray != "") {
        var prmArray = prms.split('&')
        return prmArray.reduce((m, e) => {
            var splt = e.split('=')
            if (splt.length == 2) {
                m[splt[0]] = splt[1]
            }
            return m
        }, {})
    } else {
        return {}
    }
}

export function extractPagePrms(req) {
    var query_prms = req.url.indexOf('?') !== -1 ? req.url.substring(req.url.indexOf('?') + 1) : ""
    var page_path = req.url.indexOf('?') !== -1 ? req.url.substring(0, req.url.indexOf('?')) : req.url
    query_prms = query_prms.trim('\n').trim('\r')
    page_path = page_path.trim('\n').trim('\r')

    return [page_path, query_prms]
}