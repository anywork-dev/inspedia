// Simple OpenAI-style API example using DeepSeek
// This example demonstrates how to use the OpenAI client library with DeepSeek API

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { decode } from './toon-lib';

// Load environment variables from .env file
dotenv.config();

// API Provider configurations
const API_PROVIDERS = {
    deepseek: {
        name: 'DeepSeek',
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: process.env.DEEPSEEK_API_KEY || 'your-deepseek-api-key-here',
        defaultModel: 'deepseek-chat',
        supportsVision: false,
        maxTokens: 4096
    },
    // openai: {
    //     name: 'OpenAI',
    //     baseURL: 'https://api.openai.com/v1',
    //     apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
    //     defaultModel: 'gpt-4',
    //     supportsVision: true,
    //     maxTokens: 8192
    // },
    gemini: {
        name: 'Google Gemini',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: process.env.GEMINI_API_KEY || 'your-gemini-api-key-here',
        defaultModel: 'gemini-2.5-flash',
        supportsVision: true,
        maxTokens: 8192
    }
};

// Current provider selection
let currentProvider = 'deepseek';
let currentModel = null; // Will use provider default if null
let client = null;

// Initialize client with selected provider
function initializeClient(provider = 'deepseek') {
    const config = API_PROVIDERS[provider];
    if (!config) {
        throw new Error(`Provider '${provider}' not supported. Available providers: ${Object.keys(API_PROVIDERS).join(', ')}`);
    }

    currentProvider = provider;
    client = new OpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: false // Only for server-side usage
    });

    console.log(`Initialized ${config.name} client with model: ${config.defaultModel}`);
    return client;
}

// Get current provider configuration
function getCurrentProvider() {
    return API_PROVIDERS[currentProvider];
}

// Get current model (returns custom model or provider default)
function getCurrentModel() {
    return currentModel || getCurrentProvider().defaultModel;
}

// Set custom model for current provider
function setModel(modelName) {
    if (!modelName || typeof modelName !== 'string') {
        throw new Error('Model name must be a non-empty string');
    }
    currentModel = modelName;
    console.log(`Set model to: ${modelName} for provider: ${getCurrentProvider().name}`);
    return currentModel;
}

// Reset to provider's default model
function resetModel() {
    currentModel = null;
    const defaultModel = getCurrentProvider().defaultModel;
    console.log(`Reset to provider default model: ${defaultModel}`);
    return defaultModel;
}

// Set both provider and model at once
function setProviderAndModel(provider, model = null) {
    switchProvider(provider);
    if (model) {
        setModel(model);
    }
    return { provider: currentProvider, model: getCurrentModel() };
}

// Switch API provider
function switchProvider(provider) {
    if (!API_PROVIDERS[provider]) {
        throw new Error(`Provider '${provider}' not supported. Available providers: ${Object.keys(API_PROVIDERS).join(', ')}`);
    }
    return initializeClient(provider);
}

// List all available providers
function listProviders() {
    console.log('Available API Providers:');
    console.log('========================');
    Object.entries(API_PROVIDERS).forEach(([key, config]) => {
        console.log(`${key}: ${config.name}`);
        console.log(`  Model: ${config.defaultModel}`);
        console.log(`  Vision: ${config.supportsVision ? 'Yes' : 'No'}`);
        console.log(`  Max Tokens: ${config.maxTokens}`);
        console.log('');
    });
}

// Initialize with default provider
initializeClient(currentProvider);

// Example 1: Simple chat completion
async function simpleChatExample() {
    try {
        const provider = getCurrentProvider();
        const model = getCurrentModel();
        console.log(`Using provider: ${provider.name} with model: ${model}`);

        const response = await client.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'What is artificial intelligence?' }
            ],
            max_tokens: Math.min(1000, provider.maxTokens),
            temperature: 0.7
        });

        console.log('Response:', response.choices[0].message.content);
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Example 2: Streaming response
async function streamingExample() {
    try {
        const model = getCurrentModel();
        console.log(`Using streaming with model: ${model}`);

        const stream = await client.chat.completions.create({
            model: model,
            messages: [
                { role: 'user', content: 'Explain quantum computing in simple terms.' }
            ],
            stream: true,
            max_tokens: 500
        });

        console.log('Streaming response:');
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            process.stdout.write(content);
        }
        console.log('\n');
    } catch (error) {
        console.error('Stream error:', error);
        throw error;
    }
}

// Example 3: Structured output (JSON mode)
async function structuredOutputExample() {
    try {
        const model = getCurrentModel();
        console.log(`Using structured output with model: ${model}`);

        const response = await client.chat.completions.create({
            model: model,
            messages: [
                {
                    role: 'user',
                    content: 'Generate 3 business ideas for sustainable tech startups. Return as JSON with fields: name, description, market, challenges.'
                }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 800
        });

        const result = JSON.parse(response.choices[0].message.content);
        console.log('Structured output:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Structured output error:', error);
        throw error;
    }
}

// Example 4: Function calling (tool use)
async function functionCallingExample() {
    const tools = [
        {
            type: 'function',
            function: {
                name: 'get_weather',
                description: 'Get current weather information for a location',
                parameters: {
                    type: 'object',
                    properties: {
                        location: {
                            type: 'string',
                            description: 'City name or location'
                        },
                        unit: {
                            type: 'string',
                            enum: ['celsius', 'fahrenheit'],
                            description: 'Temperature unit'
                        }
                    },
                    required: ['location']
                }
            }
        }
    ];

    try {
        const model = getCurrentModel();
        console.log(`Using function calling with model: ${model}`);

        const response = await client.chat.completions.create({
            model: model,
            messages: [
                { role: 'user', content: 'What\'s the weather like in Tokyo?' }
            ],
            tools: tools,
            tool_choice: 'auto'
        });

        const toolCall = response.choices[0].message.tool_calls;
        if (toolCall) {
            console.log('Tool call requested:', toolCall[0].function);
            // In a real application, you would execute the function here
            // For this example, we'll just return mock data
            return {
                function: toolCall[0].function.name,
                arguments: JSON.parse(toolCall[0].function.arguments)
            };
        }

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Function calling error:', error);
        throw error;
    }
}

// Example 5: Provider switching demonstration
async function providerSwitchingExample() {
    try {
        console.log('=== Provider Switching Demo ===');

        // List all available providers
        listProviders();

        // Test with current provider
        console.log('\n1. Testing with current provider:');
        const response1 = await simpleChatExample();

        // Switch to OpenAI
        console.log('\n2. Switching to OpenAI:');
        switchProvider('openai');
        const response2 = await simpleChatExample();

        // Switch to Gemini
        console.log('\n3. Switching to Gemini:');
        switchProvider('gemini');
        const response3 = await simpleChatExample();

        // Switch back to original provider
        console.log('\n4. Switching back to DeepSeek:');
        switchProvider('deepseek');

        console.log('\n=== Provider switching completed ===');
        return { deepseek: response1, openai: response2, gemini: response3 };
    } catch (error) {
        console.error('Provider switching error:', error);
        throw error;
    }
}

// Example 6: Model management demonstration
async function modelManagementExample() {
    try {
        console.log('=== Model Management Demo ===');

        // Start with default
        console.log('\n1. Default model:');
        await simpleChatExample();

        // Set custom model for current provider
        console.log('\n2. Setting custom model:');
        if (currentProvider === 'deepseek') {
            setModel('deepseek-coder'); // Example custom model
        } else if (currentProvider === 'openai') {
            setModel('gpt-4.1'); // Example custom model
        } else if (currentProvider === 'gemini') {
            setModel('gemini-2.5-flash'); // Example custom model
        }
        await simpleChatExample();

        // Switch provider and set model
        console.log('\n3. Switching provider with custom model:');
        setProviderAndModel('openai', 'gpt-4-turbo');
        await simpleChatExample();

        // Reset to default
        console.log('\n4. Resetting to default model:');
        resetModel();
        await simpleChatExample();

        console.log('\n=== Model management completed ===');
        return true;
    } catch (error) {
        console.error('Model management error:', error);
        throw error;
    }
}

// Example 7: Vision - Image analysis with text input
async function visionExample(imagePath, question) {
    try {
        const provider = getCurrentProvider();
        const model = getCurrentModel();

        // Check if current provider supports vision
        if (!provider.supportsVision) {
            throw new Error(`Provider ${provider.name} does not support vision. Use 'openai' or 'gemini' providers for image analysis.`);
        }

        console.log(`Using vision-capable provider: ${provider.name} with model: ${model}`);

        // Helper function to convert image to base64
        async function imageToBase64(imagePath) {
            const fs = await import('fs/promises');
            const path = await import('path');

            try {
                const imageBuffer = await fs.readFile(imagePath);
                return imageBuffer.toString('base64');
            } catch (error) {
                throw new Error(`Failed to read image: ${error.message}`);
            }
        }

        // Determine MIME type from file extension
        function getMimeType(imagePath) {
            const ext = imagePath.toLowerCase().split('.').pop();
            const mimeTypes = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp'
            };
            return mimeTypes[ext] || 'image/jpeg';
        }

        const base64Image = await imageToBase64(imagePath);
        const mimeType = getMimeType(imagePath);

        const response = await client.chat.completions.create({
            model: model,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: question || 'What do you see in this image? Please describe it in detail.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`,
                                detail: 'high'
                            }
                        }
                    ]
                }
            ],
            temperature: 0.4
        });

        console.log(response.choices[0].message.content);
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Vision analysis error:', error);
        throw error;
    }
}

// Example 6: Vision - Multiple images comparison
async function multipleImageAnalysis(imagePaths, comparisonQuestion) {
    try {
        const fs = await import('fs/promises');
        const model = getCurrentModel();

        console.log(`Using multiple image analysis with model: ${model}`);

        // Process multiple images
        const imageContents = await Promise.all(
            imagePaths.map(async (imagePath, index) => {
                const imageBuffer = await fs.readFile(imagePath);
                const base64Image = imageBuffer.toString('base64');
                const ext = imagePath.toLowerCase().split('.').pop();
                const mimeType = {
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png',
                    'gif': 'image/gif',
                    'webp': 'image/webp'
                }[ext] || 'image/jpeg';

                return {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${base64Image}`,
                        detail: 'high'
                    }
                };
            })
        );

        const response = await client.chat.completions.create({
            model: model,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: comparisonQuestion || 'Compare these images and identify similarities and differences.'
                        },
                        ...imageContents
                    ]
                }
            ],
            max_tokens: 2000,
            temperature: 0.5
        });

        console.log('Multi-image analysis:', response.choices[0].message.content);
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Multi-image analysis error:', error);
        throw error;
    }
}

// Example 7: Vision - Image with structured output
async function imageAnalysisWithStructuredOutput(imagePath, analysisType) {
    try {
        const fs = await import('fs/promises');

        const imageBuffer = await fs.readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const ext = imagePath.toLowerCase().split('.').pop();
        const mimeType = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp'
        }[ext] || 'image/jpeg';

        const analysisPrompts = {
            'objects': 'Analyze this image and list all visible objects with their approximate positions. Return as JSON with format: {"objects": [{"name": "object_name", "position": "top/bottom/left/center/right", "confidence": 0.95}]}',
            'colors': 'Extract the dominant colors from this image. Return as JSON with format: {"colors": [{"hex": "#RRGGBB", "name": "color_name", "percentage": 0.3}]}',
            'text': 'Extract any visible text from this image. Return as JSON with format: {"text": [{"content": "extracted text", "position": "description", "confidence": 0.9}]}',
            'layout': 'Describe the layout and composition of this image. Return as JSON with format: {"layout": {"style": "description", "elements": ["element1", "element2"], "balance": "symmetrical/asymmetrical"}}'
        };

        const prompt = analysisPrompts[analysisType] || analysisPrompts['objects'];
        const model = getCurrentModel();

        console.log(`Using structured image analysis with model: ${model}`);

        const response = await client.chat.completions.create({
            model: model,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`,
                                detail: 'high'
                            }
                        }
                    ]
                }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 1000,
            temperature: 0.1
        });

        const result = JSON.parse(response.choices[0].message.content);
        console.log('Structured image analysis:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Structured image analysis error:', error);
        throw error;
    }
}

// Example 8: List available DeepSeek models
async function listAvailableModels() {
    try {
        const response = await client.models.list();

        console.log('Available DeepSeek models:');
        console.log('===========================');

        // Filter and display models
        const deepseekModels = response.data.filter(model =>
            model.id.includes('deepseek')
        );

        if (deepseekModels.length === 0) {
            console.log('No DeepSeek models found. Here are all available models:');
            response.data.forEach(model => {
                console.log(`- ${model.id}`);
            });
        } else {
            deepseekModels.forEach(model => {
                console.log(`- ${model.id}`);
                console.log(`  Created: ${new Date(model.created * 1000).toLocaleDateString()}`);
                console.log(`  Owned by: ${model.owned_by}`);
                console.log('');
            });
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching models:', error);
        throw error;
    }
}

// Example 9: Get model information with capabilities
async function getModelInfo() {
    try {
        const models = await listAvailableModels();

        // Known DeepSeek model capabilities
        const modelCapabilities = {
            'deepseek-chat': {
                description: 'General purpose chat model',
                supportsVision: false,
                maxTokens: 4096,
                bestFor: 'General conversation, text generation'
            },
            'deepseek-coder': {
                description: 'Code generation and programming assistance',
                supportsVision: false,
                maxTokens: 4096,
                bestFor: 'Code generation, debugging, programming help'
            }
        };

        console.log('\nModel Capabilities:');
        console.log('==================');

        const deepseekModels = models.filter(model =>
            model.id.includes('deepseek')
        );

        deepseekModels.forEach(model => {
            const capabilities = modelCapabilities[model.id] || {
                description: 'DeepSeek model',
                supportsVision: false,
                maxTokens: 'Unknown',
                bestFor: 'General use'
            };

            console.log(`\n${model.id}:`);
            console.log(`  Description: ${capabilities.description}`);
            console.log(`  Vision Support: ${capabilities.supportsVision ? 'Yes' : 'No'}`);
            console.log(`  Max Tokens: ${capabilities.maxTokens}`);
            console.log(`  Best For: ${capabilities.bestFor}`);
        });

        return modelCapabilities;
    } catch (error) {
        console.error('Error getting model info:', error);
        throw error;
    }
}

// Example 10: Error handling and retry logic
async function robustApiCall(prompt, maxRetries = 3) {
    const model = getCurrentModel();
    console.log(`Using robust API call with model: ${model}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await client.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                timeout: 30000 // 30 second timeout
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);

            if (attempt === maxRetries) {
                throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
            }

            // Exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Export functions for use in other modules
export {
    simpleChatExample,
    streamingExample,
    structuredOutputExample,
    functionCallingExample,
    providerSwitchingExample,
    modelManagementExample,
    visionExample,
    multipleImageAnalysis,
    imageAnalysisWithStructuredOutput,
    listAvailableModels,
    getModelInfo,
    listProviders,
    switchProvider,
    setModel,
    resetModel,
    setProviderAndModel,
    getCurrentProvider,
    getCurrentModel,
    robustApiCall
};

// Helper function to normalize file paths for cross-platform comparison
async function isRunningDirectly() {
    const path = await import('path');
    const url = await import('url');

    // Get current file path from import.meta.url
    const currentFilePath = url.fileURLToPath(import.meta.url);

    // Get script path from process.argv[1]
    const scriptPath = process.argv[1];

    // Normalize both paths for consistent comparison
    const normalizedCurrent = path.resolve(currentFilePath);
    const normalizedScript = path.resolve(scriptPath);

    return normalizedCurrent === normalizedScript;
}

// Run examples if this file is executed directly
// Using an IIFE to handle the async helper function
(async () => {
    if (await isRunningDirectly()) {
        console.log('Running DeepSeek API examples...\n');

        // Uncomment the examples you want to run
        // await simpleChatExample();
        // await streamingExample();
        // await structuredOutputExample();
        // await functionCallingExample();

        // Provider switching examples:
        // await listProviders();
        // await providerSwitchingExample();

        // Model management examples:
        // await modelManagementExample();
        // setModel('custom-model-name');
        setProviderAndModel('gemini', 'gemini-2.5-flash');

        // Model listing examples:
        // await listAvailableModels();
        // await getModelInfo();

        // Vision examples (uncomment to test, requires vision-capable provider):
        // switchProvider('openai'); // or 'gemini'
        const prompt = `Data is in TOON format (2-space indent, arrays show length and fields).

ktp[1|]{nik|name|gender|birth_date|place_of_birth|address|city|province|occupation|nationality|valid_until}:
    1234567890123456|Alice| female|1990-01-15|Jakarta|Jl. Merdeka 1|Jakarta|DKI Jakarta|Engineer|Indonesia|2035-01-15

    Task: Return only records with nationality "Indonesia" as TOON. Use the same header. Set [N] to match the row count. Output only the data.`

        let code = await visionExample('subject.jpg', 'Scan this image for text.\n\n' + prompt);
        console.log('Extracted TOON data:\n', decode(code));
        // await multipleImageAnalysis(['image1.jpg', 'image2.jpg'], 'Compare these two images');
        // await imageAnalysisWithStructuredOutput('path/to/your/image.jpg', 'objects');

        console.log('Examples completed!');
    }
})();