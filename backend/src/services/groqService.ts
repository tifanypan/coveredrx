// backend/src/services/groqService.ts
import Groq from 'groq-sdk';
import { Medication } from '../../../shared/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface NormalizedMedicationResult {
  medication: Medication;
  confidence: number;
  searchResults?: string;
}

export class GroqService {
  async normalizeMedication(userInput: string): Promise<NormalizedMedicationResult> {
    try {
      console.log(`[Groq] Normalizing medication: "${userInput}"`);
      
      const prompt = `You are a pharmaceutical expert. The user entered: "${userInput}"

Please normalize this medication and provide structured information. If you need current FDA data, search for it.

Return a JSON response with this exact structure:
{
  "name": "Standard medication name",
  "genericName": "Generic name if different from name",
  "brandName": "Brand name if applicable", 
  "strength": "Strength with units (e.g., 10mg, 25mcg)",
  "dosageForm": "Form (tablet, capsule, liquid, etc.)",
  "ndc": "NDC code if available",
  "confidence": 0.95
}

For example:
- "tylenol" → {"name": "Acetaminophen", "genericName": "Acetaminophen", "brandName": "Tylenol", "strength": "500mg", "dosageForm": "tablet", "confidence": 0.9}
- "lisinopril 10mg" → {"name": "Lisinopril", "genericName": "Lisinopril", "strength": "10mg", "dosageForm": "tablet", "confidence": 0.95}

Always return valid JSON only.`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system", 
            content: "You are a medical AI assistant. Always return valid JSON responses. Use web search if you need current drug information."
          },
          {
            role: "user",
            content: prompt,
          }
        ],
        model: "compound-beta-mini", // Uses web search automatically
        temperature: 0.1, // Low temperature for consistent results
      });

      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('No response from Groq');
      }

      // Log the executed tools (web searches) if any
      const executedTools = completion.choices[0]?.message?.executed_tools;
      if (executedTools && executedTools.length > 0) {
        console.log('[Groq] Used tools:', executedTools.map(tool => tool.type).join(', '));
      }

      // Parse the JSON response
      let medicationData;
      try {
        // Extract JSON from response if it's wrapped in text
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
        medicationData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('[Groq] Failed to parse JSON response:', responseContent);
        throw new Error('Invalid JSON response from Groq');
      }

      // Validate required fields
      if (!medicationData.name) {
        throw new Error('Missing medication name in Groq response');
      }

      // Construct normalized medication
      const medication: Medication = {
        name: medicationData.name,
        genericName: medicationData.genericName || medicationData.name,
        brandName: medicationData.brandName,
        strength: medicationData.strength,
        dosageForm: medicationData.dosageForm || 'tablet',
        ndc: medicationData.ndc
      };

      const result: NormalizedMedicationResult = {
        medication,
        confidence: medicationData.confidence || 0.8,
        searchResults: executedTools?.length > 0 ? 'Used web search for current data' : undefined
      };

      console.log('[Groq] Successfully normalized:', medication.name);
      return result;

    } catch (error) {
      console.error('[Groq] Error normalizing medication:', error);
      
      // Return fallback response
      const fallbackMedication: Medication = {
        name: userInput,
        genericName: userInput,
        strength: 'Unknown',
        dosageForm: 'tablet'
      };

      return {
        medication: fallbackMedication,
        confidence: 0.1,
        searchResults: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: "Say 'healthy'" }],
        model: "llama-3.3-70b-versatile", // Use basic model for health check
        max_tokens: 10
      });
      
      return response.choices[0]?.message?.content?.includes('healthy') || false;
    } catch (error) {
      console.error('[Groq] Health check failed:', error);
      return false;
    }
  }
}

export const groqService = new GroqService();