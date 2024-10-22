import { handleRequest } from "@growthbook/edge-cloudflare";
import { v4 as uuidv4 } from 'uuid';
import { parse } from "cookie";

export interface Env {
	GROWTHBOOK_CLIENT_KEY: string;
	GROWTHBOOK_DECRYPTION_KEY?: string;
	GROWTHBOOK_API_HOST: string;
}
export default {
	fetch: async function (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Parse the original URL
		const originalUrl = new URL(request.url);

		// Check if the 'fromWorker' param is already present
		if (!originalUrl.searchParams.has('fromWorker')) {
			// Append the 'fromWorker=true' query parameter
			originalUrl.searchParams.set('fromWorker', 'true');
		}

		// Modify the request to include the new URL with 'fromWorker' query param
		const modifiedRequest = new Request(originalUrl.toString(), request);

		const fullDomain = originalUrl.hostname;

		// Extract the main domain by removing the subdomain if present
		const domainParts = fullDomain.split('.');
		let rootDomain = domainParts.length > 2 ? domainParts.slice(-2).join('.') : fullDomain;

		const RUDDER_ANNONYMOUS_ID_COOKIE_NAME = "rudder_anonymous_id";
		const CACHED_EVENTS_COOKIE_NAME = "cached_analytics_events";
		const WEBSITE_STATUS_COOKIE_NAME = "website_status";
		const USER_LANGUAGE_COOKIE_NAME = "language";
		const CLIENT_INFORMATION_COOKIE_NAME = "client_information";
		const SIGNUP_DEVICE_COOKIE_NAME = "signup_device";
		const UTM_DATA_COOKIE_NAME = "utm_data";
		const REQ_HEADERS = parse(request.headers.get("Cookie") ?? "");
		let eventsCache: { name: string, properties: { experimentId: string, variationId: number } }[] = [];
		let device_type = "";
		let client_information = "";
		const country = new String(request.cf?.country).toLocaleLowerCase();
		let website_status = "";
		let user_language = "";
		let device_language = "";
		let utm_data: { utm_source: string, utm_medium: string, utm_campaign: string } = { utm_source: "", utm_medium: "", utm_campaign: "" }
		if (REQ_HEADERS) {
			if (REQ_HEADERS[CACHED_EVENTS_COOKIE_NAME]) eventsCache = JSON.parse(REQ_HEADERS[CACHED_EVENTS_COOKIE_NAME]);
			if (REQ_HEADERS[UTM_DATA_COOKIE_NAME]) utm_data = JSON.parse(REQ_HEADERS[UTM_DATA_COOKIE_NAME]) ?? {};
			if (REQ_HEADERS[CLIENT_INFORMATION_COOKIE_NAME]) client_information = REQ_HEADERS[CLIENT_INFORMATION_COOKIE_NAME] ?? "";
			if (REQ_HEADERS[USER_LANGUAGE_COOKIE_NAME])
				user_language = REQ_HEADERS[USER_LANGUAGE_COOKIE_NAME] ?? "";
			if (REQ_HEADERS[WEBSITE_STATUS_COOKIE_NAME])
				website_status = REQ_HEADERS[WEBSITE_STATUS_COOKIE_NAME] ?? "";
			if (REQ_HEADERS[SIGNUP_DEVICE_COOKIE_NAME])
				device_type = REQ_HEADERS[SIGNUP_DEVICE_COOKIE_NAME] ?? "";
			if (REQ_HEADERS[USER_LANGUAGE_COOKIE_NAME])
				device_language = REQ_HEADERS[USER_LANGUAGE_COOKIE_NAME] ?? "";
		}

		const anonymousId =
			REQ_HEADERS[RUDDER_ANNONYMOUS_ID_COOKIE_NAME] ??
			uuidv4();
		// Create a new GrowthBook instance and handle the request
		let response = await handleRequest(modifiedRequest, env, {
			apiHost: env.GROWTHBOOK_API_HOST,
			clientKey: env.GROWTHBOOK_CLIENT_KEY,
			// routes: [
			// 	{ pattern: "staging.deriv.com/([a-z]{3,})/.*", type: "regex", "behavior": "proxy", "includeFileExtensions": false },
			// 	{ pattern: "staging.deriv.com/([a-z]{2}|zh-cn|zh-tw)/.*", type: "regex", "behavior": "proxy", "includeFileExtensions": false },
			// 	{ pattern: "staging.deriv.com/eu/([a-z]{2}|zh-cn|zh-tw)/.*", type: "regex", "behavior": "proxy", "includeFileExtensions": false },
			// ],
			enableStreaming: true,
			edgeTrackingCallback: async (experiment, results) => {
				// Handle tracking events if needed
				eventsCache.push({
					name: "experiment_viewed", properties: {
						experimentId: experiment.key,
						variationId: results.variationId,
					}
				});
			},
			attributes: {
				id: anonymousId,
				url: modifiedRequest.url,
				is_authorised: !!client_information,
				loggedIn: !!client_information,
				...(device_type && { device_type }),
				...(country && { country }),
				...(user_language && { user_language }),
				...(device_language && { device_language }),
				...(utm_data?.utm_source && { utm_source: utm_data.utm_source }),
				...(utm_data?.utm_medium && { utm_medium: utm_data.utm_medium }),
				...(utm_data?.utm_campaign && { utm_campaign: utm_data.utm_campaign }),
			},
		});

		// Inject the Set-Cookie header into the response
		response = new Response(response.body, response);

		response.headers.append(
			'Set-Cookie',
			`rudder_anonymous_id=${anonymousId}; Domain=.${rootDomain}; Path=/; Secure;`
		);
		if (eventsCache?.[0]) {
			response.headers.append(
				'Set-Cookie',
				`cached_analytics_events=${JSON.stringify(eventsCache)}; Domain=.${rootDomain}; Path=/; Secure;`
			);
		}
		// Return the final response with the Set-Cookie header
		return response;
	},
};
