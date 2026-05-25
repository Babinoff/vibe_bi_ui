/**
 * Extracts code from a Markdown response.
 */
export function parseCodeFromResponse(response: string): string {
  const codeBlockRegex = /```(?:python|javascript|js)?\n([\s\S]*?)```/i;
  const match = response.match(codeBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // If no markdown code block is found, return the raw response
  return response.trim();
}
