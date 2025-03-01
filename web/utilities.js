function mapWebPrms(prms) {
    if (prmArray != "") {
        var prmArray = prms.split("&")
        return prmArray.reduce((m, e) => {
            var splt = e.split("=")
            if (splt.length == 2) {
                m[splt[0]] = splt[1]
            }
            return m
        }, {})
    } else {
        return {}
    }
}