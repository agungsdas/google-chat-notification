const github = require('@actions/github');
const axios = require('axios');
const { capitalCase } = require('change-case');

const statusColorPalette = {
  success: "#2cbe4e",
  cancelled: "#ffc107",
  failure: "#ff0000"
};

const statusText = {
  success: "Succeeded",
  cancelled: "Cancelled",
  failure: "Failed"
};

const textButton = (text, url) => ({
  textButton: {
    text,
    onClick: { openLink: { url } }
  }
});

const notify = async (name, url, status) => {
  const { owner, repo } = github.context.repo;
  const { eventName, sha, ref } = github.context;
  const { number } = github.context.issue;
  const repoUrl = `https://github.com/${owner}/${repo}`;
  const eventPath = eventName === 'pull_request' ? `/pull/${number}` : `/commit/${sha}`;
  const eventUrl = `${repoUrl}${eventPath}`;
  const checksUrl = `${repoUrl}/actions/runs/${ github.context.runId }`;

  let commiterName = ''
  let commiterEmail = ''
  let message = ''
  let environment = ref || 'undefined'

  if (github.context.eventName === 'push') {
    const pushPayload = github.context.payload || {}
    commiterName = pushPayload.commits?.[0]?.committer?.name
    commiterEmail = pushPayload.commits?.[0]?.committer?.email
    message = pushPayload.commits?.[0]?.message
  }

  if (environment.toLowerCase().includes('dev')) {
    environment = 'Dev'
  }
  if (environment.toLowerCase().includes('staging') || environment.toLowerCase().includes('release') || environment.toLowerCase().includes('hotfix')) {
    environment = 'Staging'
  }
  if (environment.toLowerCase().includes('production') || environment.toLowerCase().includes('master') || environment.toLowerCase().includes('main')) {
    environment = 'Production'
  }
  if (environment.toLowerCase().includes('non-production') || environment.toLowerCase().includes('nonproduction')) {
    environment = 'Non Production'
  }

  const body = {
    cards: [
      {
      sections: [
        {
          widgets: [{
            textParagraph: {
              text: `<b>${name} <font color="${statusColorPalette[status]}">${statusText[status]}</font></b>`
            }
          }]
        },
        {
          widgets: [
            {
              keyValue: {
                topLabel: "repository",
                content: `${capitalCase(repo)}`,
                contentMultiline: true,
                button: textButton("OPEN REPOSITORY", repoUrl),
              }
            },
            {
              keyValue: {
                topLabel: "changes",
                content: message || '-',
                contentMultiline: true,
                button: textButton("OPEN COMMIT", eventUrl),
              }
            },
            commiterName ? {
              keyValue: {
                topLabel: "updated by",
                content: `${commiterName} - ${commiterEmail}`,
                contentMultiline: true,
              }
            } : undefined,
            {
              keyValue: {
                topLabel: "environment",
                content: environment,
                contentMultiline: true,
              }
            },
          ].filter(Boolean)
        },
        {
          widgets: [{
            buttons: [textButton("OPEN WORKFLOW", checksUrl)]
          }]
        }
      ]
    }
  ]
  };

  const response = await axios.default.post(url, body);
  if (response.status !== 200) {
    throw new Error(`Google Chat notification failed. response status=${response.status}`);
  }
}

module.exports = {
  notify,
}