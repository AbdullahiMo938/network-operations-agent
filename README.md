# Network Operations Agent

An AI-powered network monitoring and operations agent built using **Cloudflare Workers, Durable Objects, TypeScript and Workers AI**.

The project monitors website availability, detects outages, tracks incident history, calculates reliability metrics and sends automated Discord notifications when websites go down or recover.

The goal is to demonstrate how cloud infrastructure, persistent state, automation and AI can work together to support network operations.

## Features

### 1. Automated Network Monitoring
- Monitors multiple website endpoints.
- Runs automatically every five minutes using Cloudflare Cron Triggers.
- Measures HTTP status codes and response times.
- Detects unavailable endpoints and connection failures.
- Uses request timeouts to prevent checks from hanging.

### 2. Persistent Incident Management
- Records website outages with timestamps.
- Tracks active and resolved incidents.
- Prevents duplicate incident creation.
- Maintains incident history using Cloudflare Durable Objects.
- Preserves monitoring state across Worker restarts.

### 3. Network Reliability Analytics
- Calculates website uptime percentages.
- Measures average response times.
- Identifies the slowest websites.
- Calculates total and average downtime.
- Identifies the most unreliable websites.
- Tracks ongoing outages and their duration.

### 4. Discord Alerting
- Sends automatic notifications when a website becomes unavailable.
- Sends recovery notifications when a website returns online.
- Prevents repeated alerts for ongoing incidents.
- Records notification timestamps and delivery status.
- Handles Discord delivery failures without stopping scheduled monitoring.

### 5. AI-Powered Network Operations
- Accepts natural-language questions through an API.
- Identifies user intent and routes requests to the appropriate operation.
- Retrieves monitoring and incident information.
- Uses Workers AI to explain operational results.

Example questions:

- Which websites are currently offline?
- Show me the recent network checks.
- Which website has the worst uptime?
- What are the longest-running incidents?
- Show me the total downtime for each website.

The application uses deterministic intent routing for operational actions, with AI used to interpret and explain the results.

## Technology Stack

| Technology | Purpose |
|---|---|
| TypeScript | Application development |
| Cloudflare Workers | Serverless application runtime |
| Cloudflare Durable Objects | Persistent state and incident management |
| Cloudflare Workers AI | Natural-language processing and explanations |
| Cloudflare Cron Triggers | Automated monitoring |
| Discord Webhooks | Outage and recovery notifications |
| Wrangler | Local development and deployment |
| GitHub | Version control |

## Architecture

The application follows a serverless architecture.

1. Cloudflare Cron Triggers invoke the scheduled monitoring function every five minutes.
2. The monitoring function checks configured website endpoints.
3. Results are recorded in the Network Operations Agent.
4. The Agent maintains persistent monitoring and incident state through Durable Objects.
5. New incidents trigger Discord outage notifications.
6. Resolved incidents trigger Discord recovery notifications.
7. Users can query monitoring information through the `/ask` API endpoint.
8. Workers AI generates explanations based on the retrieved operational data.

## Project Structure

```text
network-operations-agent/
│
├── src/
│   ├── index.ts
│   └── env.d.ts
│
├── worker-configuration.d.ts
├── wrangler.jsonc
├── package.json
├── package-lock.json
├── tsconfig.json
├── .gitignore
└── .dev.vars
```

## Getting Started

### Prerequisites

- Node.js and npm
- A Cloudflare account
- Wrangler CLI
- A Discord server and webhook

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY>
cd network-operations-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.dev.vars` file in the project root:

```env
DISCORD_WEBHOOK_URL="YOUR_DISCORD_WEBHOOK_URL"
```

Keep this file private. It should be excluded from Git using `.gitignore`.

### 4. Authenticate with Cloudflare

```bash
npx wrangler login
```

### 5. Generate Cloudflare types

```bash
npx wrangler types
```

### 6. Start local development

```bash
npm run dev
```

The local Worker runs at:

```text
http://localhost:8787
```

### 7. Test scheduled monitoring

Start the Worker and trigger the scheduled handler manually:

```powershell
Invoke-RestMethod -Uri "http://localhost:8787/cdn-cgi/local/scheduled?cron=*/5+*+*+*+*" -Method GET
```

Check the Wrangler terminal for monitoring logs and your Discord channel for notifications.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Basic Worker response |
| `/ask` | POST | Natural-language network operations queries |
| `/test-ai` | GET | Test AI integration |
| `/test-network` | GET | Test endpoint monitoring |
| `/test-memory` | GET | Inspect persistent Agent state |
| `/test-discord` | GET | Test Discord notifications |

The test endpoints are intended for development and should be removed or protected before production deployment.

### Example: Ask the Agent

```powershell
Invoke-RestMethod -Uri "http://localhost:8787/ask" -Method POST -ContentType "application/json" -Body '{"message":"Show me all active incidents and their total downtime."}'
```

## Monitoring Configuration

The current scheduled monitoring configuration checks:

- example.com
- google.com
- cloudflare.com

Monitoring runs every five minutes.

The monitored websites can be changed in the `scheduled()` function in `src/index.ts`.

## Testing

TypeScript compilation can be checked using:

```bash
npx tsc --noEmit
```

The project has been manually tested for:

- Successful endpoint checks.
- Failed endpoint checks.
- Incident creation.
- Duplicate incident prevention.
- Incident recovery.
- Persistent state across Worker restarts.
- Uptime and response-time analytics.
- Discord outage notifications.
- Discord recovery notifications.
- Duplicate alert prevention.
- Notification history and delivery status.

## Future Improvements

Planned development includes:

- Interactive network monitoring dashboard.
- Historical performance visualisations.
- Advanced AI-assisted incident investigation.
- Improved automated testing.
- Enhanced security and production deployment.
- More detailed monitoring and alerting capabilities.

## Author

**Abdullahi Mohamoud**

Computer Science graduate – Queen Mary University of London.

GitHub: abdullahimo938
