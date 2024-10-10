# Cloudflare Worker for GrowthBook Integration

This Cloudflare Worker integrates with GrowthBook to dynamically handle requests, track experiments, and manage user attributes. The worker also appends the `fromWorker=true` query parameter to requests and manages cookies for tracking anonymous users and cached events.

## Features

- **GrowthBook Integration**: Manages user attributes and tracks experiment views using GrowthBook.
- **Cookie Management**: Sets cookies for tracking user sessions, cached events, and other attributes.
- **Query Parameter**: Appends `fromWorker=true` to all outgoing requests to indicate Worker origin.
- **Geo-location Handling**: Extracts country information from the request using Cloudflare's `cf.country`.
- **Flexible Deployment**: Configured for both **staging** and **production** environments.

## Environment Variables

The Worker uses the following environment variables:

| Variable                   | Description                                                                 |
|-----------------------------|-----------------------------------------------------------------------------|
| `GROWTHBOOK_CLIENT_KEY`      | The GrowthBook client key for making API requests.                          |
| `GROWTHBOOK_DECRYPTION_KEY`  | (Optional) The decryption key for GrowthBook data.                          |
| `GROWTHBOOK_API_HOST`        | The API host for GrowthBook (e.g., `https://api.growthbook.io`).            |

## How It Works

1. The Worker checks if the `fromWorker` query parameter is present. If not, it appends `fromWorker=true` to the URL.
2. It extracts cookies such as `rudder_anonymous_id`, `cached_analytics_events`, and `utm_data` from the request headers.
3. It tracks user interactions and experiments with GrowthBook.
4. It sets cookies for session tracking and stores experiment results.
5. It manages user attributes such as device type, language, country, and UTM data.

## Setting Up

### 1. **Install Dependencies**
Ensure you have installed the required dependencies for running the worker (e.g., GrowthBook, uuid, cookie parser). 

If using `npm`:

```bash
npm install
```

### 2. **Configure Wrangler**

Set up your `wrangler.toml` configuration file to handle both **staging** and **production** environments.

#### Example `wrangler.toml`:

```toml
name = "my-worker"
type = "javascript"
account_id = "your-cloudflare-account-id"
workers_dev = true
compatibility_date = "2024-10-03"

# Staging environment
[env.staging]
vars = { ENVIRONMENT = "", PROXY_TARGET="", GROWTHBOOK_CLIENT_KEY = "", GROWTHBOOK_API_HOST="" }
route = "https://staging.example.com/*"

# Production environment
[env.production]
vars = { ENVIRONMENT = "", PROXY_TARGET="", GROWTHBOOK_CLIENT_KEY = "", GROWTHBOOK_API_HOST="" }
route = "https://example.com/*"
```

### 3. **Set Environment Variables**

Use Cloudflare's environment settings to configure your environment variables for both **staging** and **production**:

```bash
# Staging environment
wrangler secret put GROWTHBOOK_CLIENT_KEY --env staging
wrangler secret put GROWTHBOOK_DECRYPTION_KEY --env staging
wrangler secret put GROWTHBOOK_API_HOST --env staging

# Production environment
wrangler secret put GROWTHBOOK_CLIENT_KEY --env production
wrangler secret put GROWTHBOOK_DECRYPTION_KEY --env production
wrangler secret put GROWTHBOOK_API_HOST --env production
```

### 4. **Deploy to Staging and Production**

To deploy to the **staging** environment:

```bash
wrangler publish --env staging
```

To deploy to the **production** environment:

```bash
wrangler publish --env production
```

### 5. **Testing**

You can test the worker by making a request to your domain with and without the `fromWorker=true` query parameter to verify that the Worker is bypassing the redirect rules when necessary.

## Cookie Management

The following cookies are managed by the Worker:

| Cookie Name                   | Description                                                  |
|-------------------------------|--------------------------------------------------------------|
| `rudder_anonymous_id`          | Tracks the anonymous user session.                           |
| `cached_analytics_events`      | Stores cached events related to experiment tracking.         |
| `utm_data`                     | Stores UTM parameters for campaign tracking.                 |
| `client_information`           | Stores client information to verify if the user is logged in.|

## Query Parameters

The Worker appends the `fromWorker=true` query parameter to the request URL to signal that the request is coming from the Worker and to bypass any global redirect rules that might interfere with the Worker’s execution.

## Geo-Location

The Worker uses Cloudflare’s `request.cf.country` to extract the client's country information and uses this information for tracking purposes and to customize the user experience.

---

### Example Usage

Visit `https://deriv.com` to trigger the worker. If you want to bypass the redirect rule for testing purposes, visit `https://deriv.com/?fromWorker=true`.