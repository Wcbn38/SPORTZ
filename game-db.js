export var game_list = {}

export function createGameDb(gameid) {
    game_list[gameid] = {
        "members": {},
        "vote-ongoing": false
    }
}