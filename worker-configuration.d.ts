// Generated by Wrangler by running `wrangler types`

interface Env {
    KV_GB_PAYLOAD: KVNamespace;
    ENVIRONMENT: string;
    PROXY_TARGET: string;
    GROWTHBOOK_CLIENT_KEY: string;
    GROWTHBOOK_DECRYPTION_KEY: string;
    GROWTHBOOK_API_HOST: string;
    KV_NAMESPACE: string;
    KV_KEY: string;
    route: string;
    kv_namespaces: [{ "binding": string, "id": string }];
}
