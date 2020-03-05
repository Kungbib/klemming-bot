var env = require('node-env-file')
env(__dirname + '/../.env')

// ***************************
// *         JIRA            *
// ***************************
      
const axios = require('axios').default
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const myLog = require('./log.js')

async function fetchTicket (issueNumber) {
  myLog('[JIRA]', 'Fetching ticket', issueNumber)
  const url = `https://jira.kb.se/rest/api/2/issue/${issueNumber}?expand=&fields=*all&properties=*all&fieldsByKeys=false`
  try {
    const response = await axios.get(
      url,
      {
        auth: {
          username: process.env.JIRA_USER,
          password: process.env.JIRA_PASS
        }
      }
    )
    myLog('[JIRA]', 'Successful fetch:', issueNumber)
    return response.data
  } catch (error) {
    console.error('[JIRA]', 'Failed to fetch:', issueNumber, error)
    return error
  }
}

async function getRecentlyCreated (lastUpdate, project = 'LXL') {
  const jql = `project = LXL AND created > "${lastUpdate}"`
  myLog('[JIRA] Querying with JQL:', jql)
  const url = `https://jira.kb.se/rest/api/2/search?expand=changelog&fields=updated,key,issuetype,creator,status&jql=${encodeURI(jql)}`
  try {
    const response = await axios.get(
      url,
      {
        auth: {
          username: process.env.JIRA_USER,
          password: process.env.JIRA_PASS
        }
      }
    )
    myLog('[JIRA]', 'Successfully fetched recently created for project:', project)
    return response.data
  } catch (error) {
    console.error('[JIRA]', 'Failed to fetch recently created for project:', project, error)
    return error
  }
}

async function getRecentlyUpdated (lastUpdate, project = 'LXL') {
  const jql = `project = LXL AND status changed TO "Done" AFTER "${lastUpdate}"`
  myLog('[JIRA] Querying with JQL:', jql)
  const url = `https://jira.kb.se/rest/api/2/search?expand=changelog&fields=updated,key,issuetype,status&jql=${encodeURI(jql)}`
  try {
    const response = await axios.get(
      url,
      {
        auth: {
          username: process.env.JIRA_USER,
          password: process.env.JIRA_PASS
        }
      }
    )
    myLog('[JIRA]', 'Successfully fetched recently updated for project:', project)
    return response.data
  } catch (error) {
    console.error('[JIRA]', 'Failed to fetch recently updated for project:', project, error)
    return error
  }
}

function fetchIssue (issueNumber) {
  console.log('[JIRA]', 'Fetching issue', issueNumber)
  const url = `https://jira.kb.se/rest/api/2/issue/${issueNumber}?expand=&fields=*all&properties=*all&fieldsByKeys=false`

  axios({
    method: 'get',
    url: url,
    auth: {
      username: process.env.JIRA_USER,
      password: process.env.JIRA_PASS
    }
  })
    .then((res) => {
      console.log('[JIRA]', 'Result from', issueNumber)
      console.log(res.data.fields.status.name)
    })
    .catch((error) => {
      console.log('[JIRA]', 'Something went wrong:', error)
    })
}

module.exports = {
  fetchTicket,
  getRecentlyUpdated,
  getRecentlyCreated
}
