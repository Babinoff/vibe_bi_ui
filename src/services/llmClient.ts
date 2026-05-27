import { GoogleGenAI } from '@google/genai';
import { Mistral } from '@mistralai/mistralai';
import { GenerationContext, GenerationResult } from '../types/llm';
import { parseCodeFromResponse } from './codeParser';
import { useStore } from '../store/useStore';

export class LLMClient {
  static async generateCode(
    prompt: string, 
    context: GenerationContext,
    onLog?: (msg: string) => void
  ): Promise<GenerationResult> {
    const storeState = useStore.getState();
    const provider = storeState.llmProvider;
    const mistralToken = storeState.mistralToken;
    const geminiToken = storeState.geminiToken;
    const openaiToken = storeState.openaiToken;
    const claudeToken = storeState.claudeToken;
    
    onLog?.(`Initializing ${provider} client...`);
    
    const systemInstruction = `
Твоя задача — написать Python-код (pandas) для обработки данных.
Код должен быть чистым, эффективным и содержать только необходимые импорты и логику.
Обязательно верни результат в виде Markdown блока кода (например, \`\`\`python ... \`\`\`).

ВАЖНОЕ ПРАВИЛО: 
- Входные данные уже загружены в переменную \`df\` (pandas DataFrame).
- Твой код должен преобразовать \`df\`.
- Итоговый датафрейм ДОЛЖЕН быть сохранен в переменную \`result_df\`.
- Не используй \`print()\`, просто сохрани результат в \`result_df\`.

Данные имеют следующую структуру:
Колонки: ${context.schema.map(c => c.name).join(', ')}
Типы: ${context.schema.map(c => c.type).join(', ')}

Пример данных (первые строки):
${JSON.stringify(context.sampleData, null, 2)}

${context.previousTransforms && context.previousTransforms.length > 0 ? 
  `Предыдущие преобразования:\n${context.previousTransforms.join('\n')}` : ''}
`;

    try {
      let text = '';
      if (provider === 'mistral') {
        if (!mistralToken) throw new Error('Mistral API Key is missing. Please provide it in the top menu.');
        onLog?.('Sending request to mistral-large-latest...');
        const client = new Mistral({ apiKey: mistralToken });
        const response = await client.chat.complete({
          model: 'mistral-large-latest',
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `Выполни действие пользователя: ${prompt}` }
          ],
        });
        text = (response.choices?.[0]?.message?.content as string) || '';
      } else if (provider === 'openai') {
        if (!openaiToken) throw new Error('OpenAI API Key is missing. Please provide it in the top menu.');
        onLog?.('Sending request to gpt-4o...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiToken}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            temperature: 0.2,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: `Выполни действие пользователя: ${prompt}` }
            ]
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `OpenAI API error: ${response.statusText}`);
        }
        const data = await response.json();
        text = data.choices[0].message.content;
      } else if (provider === 'claude') {
        if (!claudeToken) throw new Error('Claude API Key is missing. Please provide it in the top menu.');
        onLog?.('Sending request to claude-3-7-sonnet...');
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeToken,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 4096,
            temperature: 0.2,
            system: systemInstruction,
            messages: [
              { role: 'user', content: `Выполни действие пользователя: ${prompt}` }
            ]
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Claude API error: ${response.statusText}`);
        }
        const data = await response.json();
        text = data.content[0].text;
      } else {
        if (!geminiToken) throw new Error('Gemini API Key is missing. Please provide it in the top menu.');
        onLog?.('Sending request to gemini-3.1-pro-preview...');
        const ai = new GoogleGenAI({ apiKey: geminiToken });
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `Выполни действие пользователя: ${prompt}`,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });
        text = response.text || '';
      }

      onLog?.('Response received. Parsing code...');
      const code = parseCodeFromResponse(text);

      onLog?.('Code parsed successfully.');
      return {
        code,
        rawResponse: text,
        metadata: {
          outputColumns: [], // Would require further parsing or a structured LLM response
          variablesUsed: [],
        },
      };
    } catch (error: any) {
      console.error('Error generating code:', error);
      onLog?.(`API Error: ${error.message}`);
      throw new Error(error.message || 'Failed to generate code. Please try again.');
    }
  }

  static async generateChartConfig(
    libraryId: string,
    headers: string[],
    data: any[][],
    prompt: string,
    onLog?: (msg: string) => void,
    promptHistory?: any[],
    uniqueCategories?: Record<string, string[]>
  ): Promise<{ chartType: string, configCode: string }> {
    const storeState = useStore.getState();
    const provider = storeState.llmProvider;
    const mistralToken = storeState.mistralToken;
    const geminiToken = storeState.geminiToken;
    const openaiToken = storeState.openaiToken;
    const claudeToken = storeState.claudeToken;

    onLog?.(`Initializing ${provider} client for chart generation...`);

    let libInstruction = '';
    if (libraryId === 'echarts') {
      libInstruction = `Generate a JavaScript function that returns a valid ECharts option object. The root of this config should be the options (e.g., { xAxis: {...}, yAxis: {...}, series: [...] }).
IMPORTANT: You will receive 'headers' (array of strings) and 'data' (2D array of rows). You must write JS code to process this data into the format ECharts expects.
If you need to group data by a category (e.g. to create a legend with distinct colors), DO NOT use ECharts dataset filters. Instead, manually group the data in JS and create multiple series objects.

ECHARTS GROUPING EXAMPLE:
// If grouping by 'Category' (index 1) and plotting 'Value' (index 2) over 'Date' (index 0)
const categories = [...new Set(data.map(row => row[1]))];
const series = categories.map(category => {
  const filteredData = data.filter(row => row[1] === category);
  return {
    name: category,
    type: 'bar',
    data: filteredData.map(row => [row[0], row[2]])
  };
});
return { xAxis: { type: 'category' }, yAxis: { type: 'value' }, series };`;
    } else if (libraryId === 'chartjs') {
      libInstruction = `Generate a JavaScript function that returns a valid Chart.js configuration object with 'data' and 'options' properties.
IMPORTANT: You will receive 'headers' (array of strings) and 'data' (2D array of rows). You must write JS code to process this data into the format Chart.js expects (labels array and datasets array).

CHART.JS GROUPING EXAMPLE:
// If grouping by 'Category' (index 1) and plotting 'Value' (index 2) over 'Date' (index 0)
const labels = [...new Set(data.map(row => row[0]))]; // Unique X-axis values
const categories = [...new Set(data.map(row => row[1]))]; // Unique legend items
const datasets = categories.map(category => {
  const categoryData = labels.map(label => {
    // Find the row matching both label (X) and category (Legend)
    const row = data.find(r => r[0] === label && r[1] === category);
    return row ? row[2] : 0; // Return value or 0
  });
  return { label: category, data: categoryData };
});
return { type: 'bar', data: { labels, datasets }, options: {} };`;
    } else if (libraryId === 'plotly') {
      libInstruction = `Generate a JavaScript function that returns a valid Plotly configuration object with 'data' (array of traces) and 'options' (layout) properties.
IMPORTANT: You will receive 'headers' (array of strings) and 'data' (2D array of rows). You must write JS code to process this data into the format Plotly expects.

PLOTLY GROUPING EXAMPLE:
// If grouping by 'Category' (index 1) and plotting 'Value' (index 2) over 'Date' (index 0)
const categories = [...new Set(data.map(row => row[1]))];
const traces = categories.map(category => {
  const filteredData = data.filter(row => row[1] === category);
  return {
    name: category,
    x: filteredData.map(row => row[0]),
    y: filteredData.map(row => row[2]),
    type: 'bar'
  };
});
return { data: traces, options: { barmode: 'group' } };`;
    }

    let historyContext = '';
    if (promptHistory && promptHistory.length > 0) {
      historyContext = `\nPrevious interactions:\n`;
      const recentHistory = [...promptHistory].slice(0, 3).reverse();
      recentHistory.forEach((item, index) => {
        historyContext += `\n--- Interaction ${index + 1} ---\nUser Request: ${item.prompt}\nGenerated Code:\n${item.config}\n`;
      });
      historyContext += `\n--- Current Request ---\n`;
    }

    const uniqueCategoriesStr = uniqueCategories ? JSON.stringify(uniqueCategories, null, 2) : '{}';

    const systemInstruction = `
You are a data visualization expert.
Your task is to choose the most appropriate chart type and generate JavaScript code for it using the ${libraryId} library.
Supported chart types: 'line', 'bar', 'pie', 'scatter'.

${libInstruction}

IMPORTANT RULES:
1. Do not hardcode font colors, text colors, or background colors. Let the charting library handle them automatically so the chart can adapt to light and dark themes.
2. The code MUST be completely data-agnostic, relying ONLY on the 'headers' and 'data' arguments passed to the function. 
3. Unique Category Values: If you need to create multiple series based on a categorical column (e.g., to create a legend with distinct colors), you CAN use the exact category values provided in the "Unique Category Values" JSON below.

Input Data Headers: ${JSON.stringify(headers)}
Unique Category Values: ${uniqueCategoriesStr}
Input Data Sample (first 10 rows): ${JSON.stringify(data.slice(0, 10))}
${historyContext}
User Request: ${prompt}

You MUST return a JSON object with EXACTLY two properties:
1. "chartType": A string, one of ['line', 'bar', 'pie', 'scatter']
2. "configCode": A string containing ONLY the JavaScript function. The function MUST be named 'generateChart' and take exactly two parameters: (headers, data).

Example of configCode string:
"function generateChart(headers, data) {\\n  const labels = data.map(row => row[0]);\\n  return { type: 'bar', data: { labels, datasets: [...] } };\\n}"

Return ONLY a valid JSON object. Do not include markdown formatting like \`\`\`json. Just the raw JSON string.
`;

    try {
      let text = '{}';
      if (provider === 'mistral') {
        if (!mistralToken) throw new Error('Mistral API Key is missing. Please provide it in the top menu.');
        onLog?.(`Sending request to mistral-large-latest for ${libraryId} config...`);
        const client = new Mistral({ apiKey: mistralToken });
        const response = await client.chat.complete({
          model: 'mistral-large-latest',
          temperature: 0.1,
          responseFormat: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemInstruction }
          ],
        });
        text = (response.choices?.[0]?.message?.content as string) || '{}';
      } else if (provider === 'openai') {
        if (!openaiToken) throw new Error('OpenAI API Key is missing. Please provide it in the top menu.');
        onLog?.(`Sending request to gpt-4o for ${libraryId} config...`);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiToken}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemInstruction }
            ]
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `OpenAI API error: ${response.statusText}`);
        }
        const data = await response.json();
        text = data.choices[0].message.content;
      } else if (provider === 'claude') {
        if (!claudeToken) throw new Error('Claude API Key is missing. Please provide it in the top menu.');
        onLog?.(`Sending request to claude-3-7-sonnet for ${libraryId} config...`);
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeToken,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 4096,
            temperature: 0.1,
            system: "You must return ONLY a valid JSON object. Do not include markdown formatting like ```json.",
            messages: [
              { role: 'user', content: systemInstruction }
            ]
          })
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Claude API error: ${response.statusText}`);
        }
        const data = await response.json();
        text = data.content[0].text;
      } else {
        if (!geminiToken) throw new Error('Gemini API Key is missing. Please provide it in the top menu.');
        onLog?.(`Sending request to gemini-3-flash-preview for ${libraryId} config...`);
        const ai = new GoogleGenAI({ apiKey: geminiToken });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: systemInstruction,
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        });
        text = response.text || '{}';
      }

      onLog?.('Parsing chart configuration...');
      const result = JSON.parse(text);
      return result;
    } catch (error: any) {
      console.error('Chart generation error:', error);
      throw new Error(error.message || 'Failed to generate chart configuration');
    }
  }
}
