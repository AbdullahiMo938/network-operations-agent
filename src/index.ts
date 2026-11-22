
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




//  Network Operations Agent
// Network Operations Agent
export class NetworkOperationsAgent extends Agent<
    Env,
    {
        status: string;
        incidentsHandled: number;
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
        recentChecks: [],
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


await agent.recordCheck({
    url: args.url,
    online: result.online,
    statusCode: result.statusCode,
    responseTime: result.responseTime,
    checkedAt: new Date().toISOString()
});

const followUp = await env.AI.run(
    "@cf/zai-org/glm-4.7-flash",
    {
        messages: [
            {
                role: "system",
                content: "You are a network operations assistant. Explain network-checking results clearly and concisely."
            },
            {
                role: "user",
                content: "Check whether https://example.com is online."
            },
            {
                role: "assistant",
                content: "I am checking the website.",
                tool_calls: [
                    {
                        id: toolCall.id,
                        type: "function",
                        function: {
                            name: "check_endpoint",
                            arguments: toolCall.function.arguments
                        }
                    }
                ]
            },
            {
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
            }
        ]
    }
);

return Response.json({
    success: true,
    networkResult: result,
    aiExplanation: followUp.choices[0]?.message.content
});
}



}
        // Test incident tracking
        if (url.pathname === "/test-incident") {
            const agent = env.NETWORK_OPERATIONS_AGENT.getByName("network-ops");

            await agent.recordIncident();

            return Response.json(await agent.getStatus());
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
                content: "You are a network operations assistant. Answer network-related questions. If the user asks you to check whether a website is online, use the check_endpoint tool."
            },
            {
                role: "user",
                content: userMessage
            }
        ],

        tools: [{
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
        }],

        tool_choice: "auto"
    });

const toolCall = aiResponse.choices[0]?.message.tool_calls?.[0];

if (
    toolCall?.type === "function" &&
    toolCall.function.name === "check_endpoint"
) {


const args = JSON.parse(toolCall.function.arguments);
const result = await checkEndpoint(args.url);

const agent = env.NETWORK_OPERATIONS_AGENT.getByName("network-ops");   // <-- add
await agent.recordCheck({                                              // <-- add
    url: args.url,                                                     // <-- add
    online: result.online,                                             // <-- add
    statusCode: result.statusCode,                                     // <-- add
    responseTime: result.responseTime,                                 // <-- add
    checkedAt: new Date().toISOString()                                // <-- add
});                                                                    // <-- add



const followUp = await env.AI.run("@cf/zai-org/glm-4.7-flash", {
    messages: [
        {
            role: "system",
            content: "You are a network operations assistant. Explain network-checking results clearly and concisely."
        },
        {
            role: "user",
            content: userMessage
        },
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
    tool: "check_endpoint",
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