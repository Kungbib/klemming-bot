var env = require('node-env-file')
env(__dirname + '/../.env')
const fetchTicket = require('../utils/jira.js').fetchTicket


// this module is used to create local conversations with your bot
module.exports = function localConversations (controller) {
  controller.hears(new RegExp(/LXL-[0-9]+/g), 'channel', async (bot, message) => {
    console.log('Got request for ticket:', message.text)
    const data = await fetchTicket(message.text)
    console.log('[JIRA]', 'Got data:', data.fields.status.name)
    const link = `${process.env.JIRA_PROTOCOL}://${process.env.JIRA_HOST}/browse/${data.key}`
    await bot.reply(message, {
      attachments: [{
        title: `${data.key}: ${data.fields.summary}`,
        title_link: link,
        thumb_url: data.fields.priority.iconUrl,
        text: `Status: ${data.fields.status.name}\nAssignee: ${data.fields.assignee.displayName}`
      }]
    })
  })
}
