declare global {
  interface Window {
    loadPyodide: any;
  }
}

let pyodideInstance: any = null;

export class PythonRunner {
  static async init(onLog?: (msg: string) => void) {
    if (!pyodideInstance) {
      if (!window.loadPyodide) {
        onLog?.('Injecting Pyodide script...');
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Pyodide script'));
          document.head.appendChild(script);
        });
      }
      
      onLog?.('Downloading and initializing Python runtime (Pyodide)... This may take a moment.');
      pyodideInstance = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
      });
      
      onLog?.('Loading pandas library...');
      await pyodideInstance.loadPackage('pandas');
      onLog?.('Python runtime ready.');
    }
    return pyodideInstance;
  }

  static async run(code: string, headers: string[], data: any[][], onLog?: (msg: string) => void) {
    const pyodide = await this.init(onLog);
    
    onLog?.('Preparing data for Python...');
    // Convert data to JSON string to pass to Python
    const inputJson = JSON.stringify(data.map(row => {
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    }));

    // Set up the Python environment
    pyodide.globals.set('input_json', inputJson);
    
    const wrapperCode = `
import pandas as pd
import json
import sys
import io

def run_user_code():
    data_dicts = json.loads(input_json)
    df = pd.DataFrame(data_dicts)
    
    # Create globals for user code
    user_globals = {'pd': pd, 'df': df}
    
    # Safely pass the user code
    import builtins
    user_globals['__builtins__'] = builtins
    
    # Redirect stdout to capture prints
    old_stdout = sys.stdout
    redirected_output = sys.stdout = io.StringIO()
    
    try:
        user_code = ${JSON.stringify(code)}
        exec(user_code, user_globals)
    finally:
        sys.stdout = old_stdout
    
    output_df = user_globals.get('result_df', user_globals['df'])
    printed_text = redirected_output.getvalue()
    
    return output_df, printed_text

result_df, printed_text = run_user_code()
result_json = result_df.to_json(orient='split', date_format='iso')

# Return both JSON data and printed text
json.dumps({
    "df_json": result_json,
    "printed_text": printed_text
})
`;

    onLog?.('Executing Python code...');
    try {
      const combinedJsonStr = await pyodide.runPythonAsync(wrapperCode);
      onLog?.('Execution successful. Parsing results...');
      
      const combinedObj = JSON.parse(combinedJsonStr);
      const resultObj = JSON.parse(combinedObj.df_json);
      
      if (combinedObj.printed_text) {
        onLog?.('Output from Python print():\\n' + combinedObj.printed_text);
      }
      
      return {
        headers: resultObj.columns,
        data: resultObj.data,
        printed_text: combinedObj.printed_text
      };
    } catch (error: any) {
      console.error('Python execution error:', error);
      throw new Error(error.message || 'Python execution failed');
    }
  }
}
