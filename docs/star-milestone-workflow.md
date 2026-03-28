# Star Milestone Social Post Workflow

TradeClaw includes a GitHub Actions workflow that automatically generates social media content when star milestones are reached.

## How It Works

The workflow triggers when someone stars the repository (`watch: started` event). It:

1. Checks current star count via GitHub API
2. Detects if a milestone was hit (10, 25, 50, 100, 250, 500, 1000)
3. If milestone reached → creates a GitHub issue with a full social post kit
4. Always writes a job summary with ready-to-post content

## Milestones

| Stars | Reward |
|-------|--------|
| 10 | First social post kit |
| 25 | Reddit submission template |
| 50 | r/selfhosted post |
| 100 | Full launch post |
| 250 | Growth milestone |
| 500 | Halfway celebration |
| 1000 | Grand milestone |

## Extending with Twitter/Discord

### Auto-Tweet via Twitter API

Add these secrets to your repo:
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_TOKEN_SECRET`

Then add a step after the `github-script` step:

```yaml
- name: Post to Twitter
  if: steps.milestone.outputs.milestone != ''
  uses: ethomson/send-tweet-action@v1
  with:
    status: ${{ steps.milestone.outputs.tweet_text }}
    consumer-key: ${{ secrets.TWITTER_API_KEY }}
    consumer-secret: ${{ secrets.TWITTER_API_SECRET }}
    access-token: ${{ secrets.TWITTER_ACCESS_TOKEN }}
    access-token-secret: ${{ secrets.TWITTER_ACCESS_TOKEN_SECRET }}
```

### Discord Webhook Notification

Add `DISCORD_WEBHOOK` secret, then add:

```yaml
- name: Post to Discord
  if: steps.milestone.outputs.milestone != ''
  run: |
    curl -X POST "${{ secrets.DISCORD_WEBHOOK }}" \
      -H "Content-Type: application/json" \
      -d '{"embeds": [{"title": "⭐ Milestone!", "description": "TradeClaw hit ${{ steps.milestone.outputs.stars }} stars!", "color": 56483}]}'
```

### Slack Webhook

```yaml
- name: Post to Slack
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {"text": "⭐ TradeClaw just hit ${{ steps.milestone.outputs.stars }} GitHub stars!"}
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Manual Testing

Use `workflow_dispatch` to simulate any star count:

1. Go to **Actions** → **Star Milestone Social Post**
2. Click **Run workflow**
3. Enter a star count (e.g., `100` to test the 100-star milestone)
4. Check the job summary for generated content

## Files

- `.github/workflows/star-milestone-social.yml` — main workflow
- `.github/workflows/star-milestone.yml` — legacy simple milestone issue creator
