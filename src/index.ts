import { DurableObject } from "cloudflare:workers";
import { Agent, routeAgentRequest , callable } from "agents";

// Original Durable Object demonstration
export class MyDurableObject extends DurableObject<Env> {
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
    }

    async sayHello(name: string): Promise<string> {
        return `Hello, ${name}!`;
    }
}


//  Network Operations Agent
export class NetworkOperationsAgent extends Agent<
    Env,
    { status: string; incidentsHandled: number }
> {
    initialState = {
        status: "Online",
        incidentsHandled: 0,
    };

    onRequest(): Response {
        return Response.json(this.state);
    }

    @callable()
    async recordIncident(): Promise<void> {
        this.setState({
            ...this.state,
            incidentsHandled: this.state.incidentsHandled + 1,
        });
    }
    getStatus() {
    return this.state;
}
}

// Worker entry point
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        console.log("Requested path:", url.pathname);

        // Keep our original greeting demonstration
        if (url.pathname === "/") {
            const stub = env.MY_DURABLE_OBJECT.getByName("foo");
            const greeting = await stub.sayHello("Network Operations Agent");

            return new Response(greeting);
        }
        if (url.pathname === "/test-incident") {
        const agent = env.NETWORK_OPERATIONS_AGENT.getByName("network-ops");

        await agent.recordIncident();

    return Response.json(await agent.getStatus());
}

        // Route requests to our AI Agent
        return (
            (await routeAgentRequest(request, env)) ??
            new Response("Not found", { status: 404 })
        );
    },
} satisfies ExportedHandler<Env>;