const { driver } = require('@rocket.chat/sdk');
const moment = require('moment')
const respmap  = require('./reply');
const jira = require('./jira')
const timedLog = require('./log.js')
const getRecentlyUpdated = require('./jira.js').getRecentlyUpdated
const getRecentlyCreated = require('./jira.js').getRecentlyCreated
const fetchTicket = require('./jira.js').fetchTicket
var env = require('node-env-file')
env(__dirname + '/.env')

// var botOptions = {
//   debug: true,
//   rocketchat_host: process.env.ROCKETCHAT_URL,
//   rocketchat_bot_user: process.env.ROCKETCHAT_USER,
//   rocketchat_bot_pass: process.env.ROCKETCHAT_PASSWORD,
//   rocketchat_ssl: process.env.ROCKETCHAT_USE_SSL,
//   rocketchat_bot_rooms: process.env.ROCKETCHAT_ROOM,
//   rocketchat_bot_mention_rooms: process.env.MENTION_ROOMS,
//   rocketchat_bot_direct_messages: process.env.RESPOND_TO_DM,
//   rocketchat_bot_live_chat: process.env.RESPOND_TO_LIVECHAT,
//   rocketchat_bot_edited: process.env.RESPOND_TO_EDITED
// }

// Environment Setup
const HOST = process.env.ROCKETCHAT_URL;
const USER = process.env.ROCKETCHAT_USER;
const PASS = process.env.ROCKETCHAT_PASSWORD;
const BOTNAME = 'Klemming-Bot';
const SSL = process.env.ROCKETCHAT_USE_SSL;
const ROOMS = ['klemming-bot-testroom'];
var myUserId;

// Bot configuration
const runbot = async () => {
    const conn = await driver.connect({ host: HOST, useSsl: SSL })
    myUserId = await driver.login({ username: USER, password: PASS });
    const roomsJoined = await driver.joinRooms( ROOMS );
    console.log('joined rooms');

    const subscribed = await driver.subscribeToMessages();
    console.log('subscribed');

    const msgloop = await driver.reactToMessages( processMessages );
    console.log('connected and waiting for messages');

    const sent = await driver.sendToRoom('I just came online...', ROOMS[0]);
    console.log('Greeting message sent');

    const jiraInterval = 5000 // Seconds
    setInterval(() => {
      postStatusUpdates(driver, jiraInterval)
    }, jiraInterval)
}

let reportBuffer = {
  status: {},
  created: {}
}
function resetBuffer (key) {
  if (reportBuffer.hasOwnProperty(key)) {
    timedLog('[JIRA]', 'Resetting buffer for key:', key)
    reportBuffer[key] = {}
  } else {
    throw new Error('Key not available in reportBuffer')
  }
}


let lastStatusUpdate = null;
const postStatusUpdates = (driver, interval) => {
  const checkTime = moment().subtract(interval, 'ms').format('YYYY/MM/DD HH:mm')
  if (lastStatusUpdate === null) {
    lastStatusUpdate = checkTime
  }
  if (lastStatusUpdate !== checkTime) {
    resetBuffer('status')
  }
  getRecentlyUpdated(checkTime)
    .then( async (data) => {
      const issues = data.issuess
      if (issues && issues.length > 0) {
        timedLog('[JIRA] Change detected, output below')
        let alreadyReported = 0
        for (let i = 0; i < issues.length; i++) {
          if (reportBuffer.status.hasOwnProperty(issues[i].key) === false) {
            timedLog('[JIRA] [Ticket status]', issues[i].key, 'was set to', issues[i].fields.status.name);
            reportBuffer.status[issues[i].key] = issues[i]
            // const created = moment(issues[i].fields.created)
            // console.log(created)
            // const now = moment()
            // console.log(now)
            // const duration = moment.duration(now.diff(created)).as('days')
            const link = `${process.env.JIRA_PROTOCOL}://${process.env.JIRA_HOST}/browse/${data.key}`
            const response = {};
            response.attachments = [{
              title: `DONE: ${issues[i].key}: ${issues[i].fields.summary}`,
              title_link: link,
              // text: `Completed after ${Math.floor(duration)} days`
            }]
            const msg = `${issues[i].key} was set to ${ issues[i].fields.status.name}`;
            const sent = await driver.sendToRoom(response, ROOMS[0])
          } else {
            alreadyReported += 1
          }
        }
        if (alreadyReported !== 0) {
          timedLog(`Already reported ${alreadyReported} status changes, skipping.`)
        }
      } else {
        timedLog('[JIRA] No changed statuses to "Done" detected since:', lastStatusUpdate)
      }
      lastStatusUpdate = checkTime
    })
};

// Process messages
const processMessages = async(err, message, messageOptions) => {
if (!err) {
    if (message.u._id === myUserId) return;
    const roomname = await driver.getRoomName(message.rid);

    console.log('got message ' + message.msg)
    var response = {};
    // new RegExp(/LXL-[0-9]+/g)
    if (message.msg.match(new RegExp(/LXL-[0-9]+/g))) {
      const data = await fetchTicket(message.msg)
      console.log(data)
      const link = `${process.env.JIRA_PROTOCOL}://${process.env.JIRA_HOST}/browse/${data.key}`
      response.attachments = [{
        title: `${data.key}: ${data.fields.summary}`,
        title_link: link,
        thumb_url: data.fields.priority.iconUrl,
        text: `Status: ${data.fields.status.name}\nAssignee: ${data.fields.assignee.displayName}`
      }]
    } else if (message.msg in respmap) {
        response = respmap[message.msg];
    }
    if (Object.keys(response).length !== 0) {
      const sentmsg = await driver.sendToRoomId(response, message.rid)
    }
  }
}

runbot()