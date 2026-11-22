
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
if (url.pathname === "/test-resolve") {
    const agent = env.NETWORK_OPERATIONS_AGENT.getByName("network-ops");

    await agent.resolveIncident(
        "https://this-domain-should-not-exist-12345.com"
    );

    return Response.json(await agent.getStatus());
}
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
                    content: "You are a network operations assistant. Explain network-checking results clearly and concisely."
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

    const aiResponse = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
        messages: [
            {
                role: "system",
               content: "You are a network operations assistant. Follow these tool-selection rules carefully: 1. Use check_endpoint ONLY when the user explicitly requests a new live network check. 2. Use get_recent_checks whenever the user asks about previous checks, historical results, response-time comparisons, failed checks, or network activity. 3. Never perform a new network check when the user only asks about historical data. 4. When comparing response times, use the stored results and calculate the difference in milliseconds."
            },
            {
                role: "user",
                content: userMessage
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
            description: "Retrieves the 10 most recent network endpoint checks stored in persistent memory.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    }
],

        tool_choice: "auto"
    });

    const toolCall = aiResponse.choices[0]?.message.tool_calls?.[0];

    if (toolCall?.type === "function") {
        let result: unknown;
        const agent = env.NETWORK_OPERATIONS_AGENT.getByName("network-ops");

        if (toolCall.function.name === "check_endpoint") {
            const args = JSON.parse(toolCall.function.arguments);
            const checkResult = await checkEndpoint(args.url);

            await agent.recordCheck({
                url: args.url,
                online: checkResult.online,
                statusCode: checkResult.statusCode,
                responseTime: checkResult.responseTime,
                checkedAt: new Date().toISOString()
            });

        if (!checkResult.online) {
            await agent.recordIncident(args.url);
        } else {
            await agent.resolveIncident(args.url);
        }

            result = checkResult;
        } else if (toolCall.function.name === "get_recent_checks") {
            const status = await agent.getStatus();
            result = status.recentChecks ?? [];
        } else {
            result = { error: `Unknown tool: ${toolCall.function.name}` };
        }

        const followUp = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
            messages: [
                {
                    role: "system",
                    content: "You are a network operations assistant. Explain network-checking results and historical network activity clearly and concisely."
                },
                { role: "user", content: userMessage },
                {
                    role: "assistant",
                    content: "I am retrieving the requested network information.",
                    tool_calls: [{
                        id: toolCall.id,
                        type: "function",
                        function: {
                            name: toolCall.function.name,
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
            tool: toolCall.function.name,
            result,
            answer: followUp.choices[0]?.message.content
        });
    }

    return Response.json({
        success: true,
        answer: aiResponse.choices[0]?.message.content
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