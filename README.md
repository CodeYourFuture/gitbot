# CYF GitBot

[![Node.js CI](https://github.com/CodeYourFuture/gitbot/actions/workflows/push.yml/badge.svg)](https://github.com/CodeYourFuture/gitbot/actions/workflows/push.yml)

Integrating GitHub and Slack via Netlify.

## What is this?

Trainees often accidentally create repos in the CYF GitHub organization. This leads to lots of excess repos and makes
it hard to manage the org.

A [webhook](https://docs.github.com/en/developers/webhooks-and-events/webhooks/about-webhooks) in GitHub is
configured to send all repo events (_"Repository created, deleted, archived, unarchived, publicized, privatized,
edited, renamed, or transferred."_) in the CYF org to a [Netlify function](https://functions.netlify.com/) (in CYF's
account).

The function in turn interacts with Slack to post messages notifying org owners of any new repository, allowing them
to review and (if necessary) delete the new repo.

## Architecture

The sequence diagram below shows the series of events and calls.

_(Note the grey section is currently aspirational.)_

```mermaid
sequenceDiagram
    actor Trainee
    participant GitHub
    participant Netlify
    participant Slack
    Trainee->>GitHub: Create repo CodeYourFuture/{name}
    GitHub->>+Netlify: POST /repo_event
    Netlify->>+Slack: POST /chat.postMessage
    Note right of Slack: Post in #35;cyf-github-owners
    Slack-->>-Netlify: 200 OK
    Netlify-->>-GitHub: 200 OK
    actor Admin
    alt Delete the repo
    Admin->>Slack: Click "Delete repo"
    Slack->>+Netlify: POST /slack_interaction
    Netlify->>+GitHub: DELETE /repos/CodeYourFuture/{name}
    GitHub-->>-Netlify: 204 No Content
    rect rgb(235, 235, 235)
    Netlify->>+Slack: POST /services/...
    Note right of Slack: Update the post
    Slack-->>-Netlify: 200 OK
    end
    Netlify-->>-Slack: 200 OK
    else Dismiss the message
    rect rgb(235, 235, 235)
    Admin->>Slack: Click "Dismiss"
    Slack->>+Netlify: POST /slack_interaction
    Netlify->>+Slack: POST /services/...
    Note right of Slack: Update the post
    Slack-->>-Netlify: 200 OK
    Netlify-->>-Slack: 200 OK
    end
    end
```

## Configuration

The Netlify functions require the following environment variables:

- `GITHUB_TOKEN`: Token used to delete repos in GitHub
- `GITHUB_WEBHOOK_SECRET`: Secret used to verify webhook calls from GitHub
- `SLACK_CHANNEL`: The channel to post messages in (currently [#cyf-github-owners](https://codeyourfuture.slack.com/archives/C03LSS9TNRW))
- `SLACK_SIGNING_SECRET`: Secret used to verify webhook calls from Slack
- `SLACK_TOKEN`: Token used to post messages to Slack
