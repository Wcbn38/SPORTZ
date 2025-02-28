import * as fs from 'fs'
import * as utility from './utility.js'

export const sec_cfg = JSON.parse(fs.readFileSync('./security.json', 'utf-8'))
export const sec_pwd = utility.makepasswd(4)