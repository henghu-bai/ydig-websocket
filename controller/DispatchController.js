const MessageService = {
    chat (data) {
      this.sendToSameRoom({
        type: 'chat',
        data: data
      })
    }
}

export default class DispatchController {
  constructor (ws, globelMap, sessionMap) {
    this.currentUser = {}
    this.sessionMap = sessionMap
    this.globelMap = globelMap
    ws.on('message', (message) => {
      let msg = JSON.parse(message)
      let type = msg.type
      let header = msg.header
      let token = header.token
      let data = msg.data
      let currentUser = login(token, sessionMap, ws)
      if (currentUser) {
        this.currentUser = currentUser
        MessageService[type].call(this, data)
      }
    })

    ws.on('close', () => {
      this.currentUser.online = false
      console.log('websocket close', this.currentUser)
    })

    ws.on('error', () => {
      console.log('websocket error')
    })
    this.ws = ws
  }

  function getRoomUsers (excludeId = '') {
    return Object.values(sessionMap).filter(user => {
      return this.currentUser.room === user.room && user.id !== excludeId
    })
  }

  function sendToSameRoom(message, excludeSelf = false) {
    let excludeId = excludeSelf ? this.currentUser.id : ''
    let users = this.getRoomUsers(excludeId)
    message.from = {id: this.currentUser.id, nickname: this.currentUser.nickname}
    sendToUsers(users, message)
  }
}

function sendToUsers (users, message) {
  users.forEach(u => {
    sendToUser(u, message)
  })
}

function sendToUser (u) {
  if (u.online) {
    message._id = new Date().getTime()
    u.client.send(JSON.stringify(message))
  }
}

function login (token, sessionMap, client) {
  let user = sessionMap[token]
  if (!user) {
    // 暂时自己构建user, 后面获取redis里面的数据或者其他方式
    user = {
      id: 'userId - ' + new Date().getTime(),
      nickname: 'player-' + Object.keys(sessionMap).length,
      online: true,
      expired: 72000,
      room: 10,
      client: client
    }
    sessionMap[token] = user
  } else {
    user.client = client
    user.online = true
    user.expired = 72000
  }
  return user
}