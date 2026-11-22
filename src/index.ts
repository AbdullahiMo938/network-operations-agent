
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

// first network tool
async function checkEndpoint(url: string) {
    const startTime = Date.now();
    

    try {
        const response = await fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        });

        return {
            online: response.ok,
            statusCode: response.status,
            responseTime: Date.now() - startTime,
        };
    } catch (error) {
        return {
            online: false,
            statusCode: null,
            responseTime: Date.now() - startTime,
        };
    }
}
    // Incident structure
    type Incident = {
        url: string;
        startedAt: string;
        resolvedAt: string | null;
        status: "active" | "resolved";
    };



//  Network Operations Agent
// Network Operations Agent
export class NetworkOperationsAgent extends Agent<
    Env,
    {
        status: string;
        incidentsHandled: number;
        activeIncidents: string[];
        incidentHistory: Incident[];
        recentChecks: {
            url: string;
            online: boolean;
            statusCode: number | null;
            responseTime: number;
            checkedAt: string;
        }[];
    }
> {
    initialState = {
    status: "Online",
    incidentsHandled: 0,
    activeIncidents: [],
    incidentHistory: [],
    recentChecks: [],
};

    onRequest(): Response {
        return Response.json(this.state);
    }

    @callable()
    async recordIncident(url: string): Promise<void> {
        const activeIncidents = this.state.activeIncidents ?? [];

        if (activeIncidents.includes(url)) {
            return;
        }

        const newIncident: Incident = {
            url,
            startedAt: new Date().toISOString(),
            resolvedAt: null,
            status: "active",
        };

        this.setState({
            ...this.state,
            incidentsHandled: this.state.incidentsHandled + 1,
            activeIncidents: [
                ...activeIncidents,
                url
            ],
            incidentHistory: [
                ...(this.state.incidentHistory ?? []),
                newIncident
            ],
        });
    }
    @callable()
    async resolveIncident(url: string): Promise<void> {
        const activeIncidents = this.state.activeIncidents ?? [];

        if (!activeIncidents.includes(url)) {
            return;
        }

        const incidentHistory = this.state.incidentHistory ?? [];

        this.setState({
            ...this.state,
            activeIncidents: activeIncidents.filter(
                (incident) => incident !== url
            ),
            incidentHistory: incidentHistory.map((incident) =>
                incident.url === url && incident.status === "active"
                    ? {
                        ...incident,
                        resolvedAt: new Date().toISOString(),
                        status: "resolved" as const,
                    }
                    : incident
            ),
        });
}
    @callable()
    async recordCheck(check: {
        url: string;
        online: boolean;
        statusCode: number | null;
        responseTime: number;
        checkedAt: string;
    }): Promise<void> {
        console.log("recordCheck called:", check.url)
        this.setState({
            ...this.state,
            recentChecks: [
                check,
                ...(this.state.recentChecks ?? [])
            ].slice(0, 10),
        });
    }

    @callable()
    getStatus() {
        return this.state;
    }
}
type Intent = "incident_history" | "recent_checks" | "check_endpoint" | "unknown";

function detectIntent(message: string): Intent {
    const m = message.toLowerCase();

    // 1. Incidents first, so "incident history" doesn't match the history rule below
    if (/\b(incidents?|outages?|downtime|recovery|recovered|resolved)\b/.test(m)) {
        return "incident_history";
    }

    // 2. Historical network checks
    if (/\b(previous|past|history|historical|recent|earlier|stored|compare|trend|last)\b/.test(m)) {
        return "recent_checks";
    }

    // 3. A new live check
    if (/\b(check|online|offline|up|down|ping|reachable|test)\b/.test(m)) {
        return "check_endpoint";
    }

    return "unknown";
}

// Worker entry point
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        console.log("Requested path:", url.pathname);

        // Original greeting demonstration
        if (url.pathname === "/") {
            const stub = env.MY_DURABLE_OBJECT.getByName("foo");
            const greeting = await stub.sayHello("Network Operations Agent");

            return new Response(greeting);
        }
        // Temporary incident recovery test

// Test AI connection
if (url.pathname === "/test-ai") {
    console.log("Sending request to Cloudflare AI...");

    const response = await env.AI.run(
        "@cf/zai-org/glm-4.7-flash",
        {
            messages: [
                {
                    role: "system",
                    content: "You are a network operations assistant. You can check whether websites are online. Use the check_endpoint tool when asked to check a website."
                },
                {
                    role: "user",
                    content: "Check whether https://example.com is online."
                }
            ],
tools: [
    {
        type: "function",
        function: {
            name: "check_endpoint",
            description: "Checks whether a website is online and measures its response time.",
            parameters: {
                type: "object",
                properties: {
                    url: {
                        type: "string",
                        description: "The website URL to check."
                    }
                },
                required: ["url"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_recent_checks",
            description: "Retrieves historical network health-check results ONLY. Use for previous HTTP status codes, response times and endpoint availability. NEVER use this tool for incident history.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_incident_history",
            description: "Retrieves historical incident records. Use for incidents, outages, start times, resolution times, durations, and active or resolved incidents.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    }
],
            tool_choice: "auto"
        }
    );

  

    const toolCall = response.choices[0]?.message.tool_calls?.[0];

    if (
        toolCall?.type === "function" &&
        toolCall.function.name === "check_endpoint"
    ) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await checkEndpoint(args.url);

        const agent = env.NETWORK_OPERATIONS_AGENT.getByName("network-ops");
        await agent.recordCheck({
            url: args.url,
            online: result.online,
            statusCode: result.statusCode,
            responseTime: result.responseTime,
            checkedAt: new Date().toISOString()
        });

        const followUp = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
            messages: [
                {
    role: "system",
    content: `You are a network operations assistant. Explain results clearly and concisely.

    TOOL SELECTION RULES:

    1. Use check_endpoint ONLY when the user explicitly requests a new, live network check.

    2. Use get_recent_checks when the user asks about previous network checks, response times, HTTP status codes or historical endpoint availability.

    3. Use get_incident_history when the user asks about incidents, outages, failures, incident history, incident durations, recovery times, or active and resolved incidents.

    IMPORTANT:
    - Questions about incidents MUST use get_incident_history.
    - Questions about network check results MUST use get_recent_checks.
    - Never perform a live network check when answering historical questions.
    - Do not substitute one retrieval tool for another.`
},
                { role: "user", content: "Check whether https://example.com is online." },
                {
                    role: "assistant",
                    content: "I am checking the website.",
                    tool_calls: [{
                        id: toolCall.id,
                        type: "function",
                        function: {
                            name: "check_endpoint",
                            arguments: toolCall.function.arguments
                        }
                    }]
                },
                {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                }
            ]
        });

        return Response.json({
            success: true,
            networkResult: result,
            aiExplanation: followUp.choices[0]?.message.content
        });
    }
}
         // TEMPORARY: test intent detection
        if (url.pathname === "/test-intent") {
            const q = url.searchParams.get("q") ?? "";
            return Response.json({ q, intent: detectIntent(q) });
        }

        // Test network connectivity
        if (url.pathname === "/test-network") {
            const result = await checkEndpoint("https://example.com");

            return Response.json(result);
        }

        // Interactive AI endpoint
        // Interactive endpoint "/ask"
if (url.pathname === "/ask" && request.method === "POST") {
    const body = await request.json() as { message: string };
    const userMessage = body.message;

    const intent = detectIntent(userMessage);
    const agent = env.NETWORK_OPERATIONS_AGENT.getByName("network-ops");

    let toolName: string | null = null;
    let result: unknown;

    if (intent === "incident_history") {
        toolName = "get_incident_history";
        const status = await agent.getStatus();
        result = status.incidentHistory ?? [];

    } else if (intent === "recent_checks") {
        toolName = "get_recent_checks";
        const status = await agent.getStatus();
        result = status.recentChecks ?? [];

    } else if (intent === "check_endpoint") {
        // Pull a URL or domain out of the message
        const match = userMessage.match(
            /https?:\/\/[^\s]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/i
        );

        if (match) {
            let target = match[0].replace(/[.,;:!?)]+$/, "");
            if (!/^https?:\/\//i.test(target)) {
                target = "https://" + target;
            }

            toolName = "check_endpoint";
            const checkResult = await checkEndpoint(target);

            await agent.recordCheck({
                url: target,
                online: checkResult.online,
                statusCode: checkResult.statusCode,
                responseTime: checkResult.responseTime,
                checkedAt: new Date().toISOString()
            });

            if (!checkResult.online) {
                await agent.recordIncident(target);
            } else {
                await agent.resolveIncident(target);
            }

            result = checkResult;
        }
    }

    // No tool ran (unknown intent, or a check request with no URL): plain AI answer
    if (toolName === null) {
        const aiResponse = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
            messages: [
                {
                    role: "system",
                    content: "You are a network operations assistant. Answer network-related questions briefly. If the user wants a website checked, ask them for the URL."
                },
                { role: "user", content: userMessage }
            ]
        });

        return Response.json({
            success: true,
            intent,
            answer: aiResponse.choices[0]?.message.content
        });
    }

    // A tool ran: the AI only explains the data
    const followUp = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
        messages: [
            {
                role: "system",
                content: "You are a network operations assistant. Explain the data you are given clearly and concisely. Use only the data provided. If the data is an empty list, say there are no records yet."
            },
            {
                role: "user",
                content: `Question: ${userMessage}\n\nData from ${toolName}:\n${JSON.stringify(result)}`
            }
        ]
    });

    return Response.json({
        success: true,
        intent,
        tool: toolName,
        result,
        answer: followUp.choices[0]?.message.content
    });
}
// "/test-memory"
if (url.pathname === "/test-memory") {
    const agent = env.NETWORK_OPERATIONS_AGENT.getByName("network-ops");
    return Response.json(await agent.getStatus());
}
        // Route requests to our AI Agent
        return (
            (await routeAgentRequest(request, env)) ??
            new Response("Not found", { status: 404 })
        );
        

        // Interactive AI endpoint

    
    },
} satisfies ExportedHandler<Env>;