// backend/src/services/webResearchService.ts
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface AlternativeDrug {
  name: string;
  genericName?: string;
  brandName?: string;
  cashPrice?: number;
  pharmacy?: string;
  source?: string;
  availability?: string;
  savings?: number;
}

export interface PriceComparison {
  pharmacy: string;
  price: number;
  discounts?: string[];
}

export interface PAStrategy {
  strategy: string;
  successRate?: string;
  requirements?: string[];
}

export interface WebResearchResult {
  query: string;
  searchTime: number;
  timestamp: string;
  alternatives: AlternativeDrug[];
  priceComparisons: PriceComparison[];
  paStrategies: PAStrategy[];
  patientPrograms: string[];
  summary: string;
  sources: string[];
}

export class WebResearchService {
  private cache: Map<string, { result: WebResearchResult; timestamp: number }> = new Map();
  private cacheTimeout = 3600000; // 1 hour in milliseconds

  async findAlternatives(drugName: string, currentCopay?: number): Promise<WebResearchResult> {
    const startTime = Date.now();
    console.log(`[WebResearch] Starting GoodRx price search for ${drugName}`);

    // Check cache first
    const cached = this.getCachedResult(`goodrx-${drugName}`);
    if (cached) {
      console.log(`[WebResearch] Using cached result for ${drugName}`);
      return cached;
    }

    try {
      // Super simple, focused prompt
      const prompt = `Search GoodRx for ${drugName} pricing as JSON`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You search GoodRx for medication pricing. Return only JSON with current prices."
          },
          {
            role: "user",
            content: prompt,
          }
        ],
        model: "compound-beta-mini",  // Changed from compound-beta to compound-beta-mini
        temperature: 0.1,
        max_tokens: 500,  // Much smaller limit
      });

      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('No response from Groq Compound Beta');
      }

      console.log('[WebResearch] Raw GoodRx response received, parsing...');
      console.log('[WebResearch] DEBUG - Raw response:', responseContent);
      
      // Parse the JSON response - much simpler now
      let parsedData;
      try {
        // Try to extract JSON from the response
        const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                         responseContent.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1] || jsonMatch[0];
          parsedData = JSON.parse(jsonString);
          console.log('[WebResearch] DEBUG - Parsed data:', parsedData);
        } else {
          // If no JSON blocks found, try parsing the whole response
          parsedData = JSON.parse(responseContent);
        }
      } catch (parseError) {
        console.error('[WebResearch] Failed to parse JSON:', parseError);
        console.log('[WebResearch] Raw response:', responseContent);
        
        // Return a structured fallback response
        parsedData = {
          drugName: drugName,
          prices: [],
          alternatives: [],
          summary: `GoodRx search completed but response format was unexpected. Found pricing information for ${drugName}.`,
          sources: ["GoodRx"]
        };
      }

      // Construct the final result - adapt whatever format we get
      const searchTime = Date.now() - startTime;
      
      // Convert different possible structures to our standard format
      let priceComparisons = [];
      
      // Handle various possible response formats
      if (parsedData.prices && Array.isArray(parsedData.prices)) {
        // Format: {prices: [{price: 2.00, description: "GoodRx discount"}]}
        priceComparisons = parsedData.prices.map(item => ({
          pharmacy: item.description || 'Cash Price',
          price: item.price,
          discounts: []
        }));
      } else if (parsedData.priceComparisons && Array.isArray(parsedData.priceComparisons)) {
        // Already in our format
        priceComparisons = parsedData.priceComparisons;
      } else if (typeof parsedData.price === 'number') {
        // Single price format
        priceComparisons = [{
          pharmacy: 'GoodRx',
          price: parsedData.price,
          discounts: []
        }];
      } else if (parsedData[drugName] || parsedData[drugName.toLowerCase()]) {
        // Nested format: {Lisinopril: {prices: [...], pharmacies: {...}}} or {lisinopril: {...}}
        const drugData = parsedData[drugName] || parsedData[drugName.toLowerCase()];
        
        // Handle prices array format: {prices: [{dosage: "2.5mg", price: 4.99, pharmacy: "CVS"}]}
        if (drugData.prices && Array.isArray(drugData.prices)) {
          drugData.prices.forEach((item: any) => {
            // Handle flat price format
            if (item.price && item.pharmacy) {
              const price = typeof item.price === 'string' ? 
                parseFloat(item.price.replace(/[$,]/g, '')) : item.price;
              priceComparisons.push({
                pharmacy: item.pharmacy || 'Cash Price',
                price: price,
                discounts: item.dosage ? [`${item.dosage}`] : []
              });
            }
            // Handle nested pharmacies format: {dosage: "10mg", price: "$4.50", pharmacies: [...]}
            else if (item.pharmacies && Array.isArray(item.pharmacies)) {
              item.pharmacies.forEach((pharmacy: any) => {
                if (pharmacy.price && pharmacy.name) {
                  const price = typeof pharmacy.price === 'string' ? 
                    parseFloat(pharmacy.price.replace(/[$,]/g, '')) : pharmacy.price;
                  priceComparisons.push({
                    pharmacy: pharmacy.name,
                    price: price,
                    discounts: item.dosage ? [`${item.dosage}`] : []
                  });
                }
              });
            }
            // Handle direct price without pharmacy (use dosage as identifier)
            else if (item.price && item.dosage) {
              const price = typeof item.price === 'string' ? 
                parseFloat(item.price.replace(/[$,]/g, '')) : item.price;
              priceComparisons.push({
                pharmacy: `GoodRx (${item.dosage})`,
                price: price,
                discounts: []
              });
            }
          });
        }
        
        // Extract from pharmacies object (previous format)
        if (drugData.pharmacies) {
          Object.entries(drugData.pharmacies).forEach(([pharmacy, data]: [string, any]) => {
            // Add original price
            if (data.price) {
              const price = typeof data.price === 'string' ? 
                parseFloat(data.price.replace(/[$,]/g, '')) : data.price;
              priceComparisons.push({
                pharmacy: pharmacy,
                price: price,
                discounts: []
              });
            }
            
            // Add coupon price if different
            if (data.price_with_coupon && data.price_with_coupon !== data.price) {
              const couponPrice = typeof data.price_with_coupon === 'string' ? 
                parseFloat(data.price_with_coupon.replace(/[$,]/g, '')) : data.price_with_coupon;
              priceComparisons.push({
                pharmacy: `${pharmacy} (with coupon)`,
                price: couponPrice,
                discounts: data.discount ? [data.discount] : []
              });
            }
          });
        }
        
        // Extract from prices object (alternative nested format)
        if (drugData.prices && !Array.isArray(drugData.prices)) {
          Object.entries(drugData.prices).forEach(([dosage, data]: [string, any]) => {
            if (data.average_retail_price) {
              const price = typeof data.average_retail_price === 'string' ? 
                parseFloat(data.average_retail_price.replace(/[$,]/g, '')) : data.average_retail_price;
              priceComparisons.push({
                pharmacy: `Average Retail (${dosage})`,
                price: price,
                discounts: []
              });
            }
            
            if (data.price_with_goodrx_coupon) {
              const couponPrice = typeof data.price_with_goodrx_coupon === 'string' ? 
                parseFloat(data.price_with_goodrx_coupon.replace(/[$,]/g, '')) : data.price_with_goodrx_coupon;
              priceComparisons.push({
                pharmacy: `GoodRx (${dosage})`,
                price: couponPrice,
                discounts: data.discount ? [data.discount] : []
              });
            }
          });
        }
      }
      
      const result: WebResearchResult = {
        query: `GoodRx pricing for ${drugName}`,
        searchTime,
        timestamp: new Date().toISOString(),
        alternatives: parsedData.alternatives || [],
        priceComparisons: priceComparisons,
        paStrategies: [],
        patientPrograms: parsedData.discounts || parsedData.programs || [],
        summary: parsedData.summary || `Found GoodRx pricing for ${drugName}`,
        sources: ["GoodRx"]
      };

      // Cache the result
      this.cacheResult(`goodrx-${drugName}`, result);

      console.log(`[WebResearch] GoodRx search completed in ${searchTime}ms`);
      return result;

    } catch (error) {
      const searchTime = Date.now() - startTime;
      console.error(`[WebResearch] GoodRx search error after ${searchTime}ms:`, error);
      
      // Return fallback response
      return {
        query: `GoodRx pricing for ${drugName}`,
        searchTime,
        timestamp: new Date().toISOString(),
        alternatives: [],
        priceComparisons: [],
        paStrategies: [],
        patientPrograms: [],
        summary: `GoodRx search failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        sources: []
      };
    }
  }

  async findPriceComparison(drugName: string): Promise<WebResearchResult> {
    const startTime = Date.now();
    console.log(`[WebResearch] Starting price comparison for ${drugName}`);

    // Check cache first
    const cached = this.getCachedResult(`prices-${drugName}`);
    if (cached) {
      console.log(`[WebResearch] Using cached price data for ${drugName}`);
      return cached;
    }

    try {
      const prompt = `Search for current cash prices of ${drugName} at major pharmacies. Please find:

1. GoodRx prices and discount codes
2. CVS, Walgreens, Rite Aid, and other major pharmacy prices
3. Online pharmacy prices (if available)
4. Manufacturer discount programs or coupons
5. Generic vs brand name pricing differences

Return as JSON with this structure:
{
  "priceComparisons": [
    {
      "pharmacy": "pharmacy name",
      "price": number,
      "discounts": ["available discounts"]
    }
  ],
  "alternatives": [
    {
      "name": "generic or alternative name",
      "cashPrice": number,
      "savings": number
    }
  ],
  "patientPrograms": ["manufacturer programs", "discount cards"],
  "summary": "price comparison summary",
  "sources": ["source websites"]
}`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a pharmacy price research specialist. Search for the most current pricing information and return valid JSON."
          },
          {
            role: "user",
            content: prompt,
          }
        ],
        model: "compound-beta",
        temperature: 0.1,
      });

      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        throw new Error('No response from Groq Compound Beta');
      }

      // Parse response similar to alternatives search
      let parsedData;
      try {
        const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                         responseContent.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1] || jsonMatch[0];
          parsedData = JSON.parse(jsonString);
        } else {
          parsedData = JSON.parse(responseContent);
        }
      } catch (parseError) {
        console.error('[WebResearch] Failed to parse price JSON:', parseError);
        parsedData = {
          priceComparisons: [],
          alternatives: [],
          patientPrograms: [],
          summary: 'Price research completed but format was unexpected.',
          sources: []
        };
      }

      const searchTime = Date.now() - startTime;
      const result: WebResearchResult = {
        query: `Price comparison for ${drugName}`,
        searchTime,
        timestamp: new Date().toISOString(),
        alternatives: parsedData.alternatives || [],
        priceComparisons: parsedData.priceComparisons || [],
        paStrategies: [],
        patientPrograms: parsedData.patientPrograms || [],
        summary: parsedData.summary || `Price comparison completed for ${drugName}`,
        sources: parsedData.sources || []
      };

      this.cacheResult(`prices-${drugName}`, result);

      console.log(`[WebResearch] Price research completed in ${searchTime}ms`);
      return result;

    } catch (error) {
      const searchTime = Date.now() - startTime;
      console.error(`[WebResearch] Price research error after ${searchTime}ms:`, error);
      
      return {
        query: `Price comparison for ${drugName}`,
        searchTime,
        timestamp: new Date().toISOString(),
        alternatives: [],
        priceComparisons: [],
        paStrategies: [],
        patientPrograms: [],
        summary: `Price research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sources: []
      };
    }
  }

  async researchPAStrategies(drugName: string): Promise<WebResearchResult> {
    const startTime = Date.now();
    console.log(`[WebResearch] Researching PA strategies for ${drugName}`);

    const cached = this.getCachedResult(`pa-${drugName}`);
    if (cached) {
      console.log(`[WebResearch] Using cached PA data for ${drugName}`);
      return cached;
    }

    try {
      const prompt = `Research prior authorization (PA) requirements and strategies for ${drugName}. Search for:

1. Common PA denial reasons for this medication
2. Successful appeal strategies and documentation requirements
3. Alternative medications that don't require PA
4. Step therapy requirements and how to bypass them
5. Clinical criteria that improve approval rates

Return as JSON:
{
  "paStrategies": [
    {
      "strategy": "detailed strategy description",
      "successRate": "percentage or qualitative rate",
      "requirements": ["list of requirements"]
    }
  ],
  "alternatives": [
    {
      "name": "alternative drug name",
      "genericName": "generic name",
      "priorAuthRequired": false
    }
  ],
  "summary": "summary of PA landscape for this drug",
  "sources": ["medical literature", "insurance resources"]
}`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a healthcare policy researcher specializing in prior authorization. Provide evidence-based strategies and return valid JSON."
          },
          {
            role: "user",
            content: prompt,
          }
        ],
        model: "compound-beta",
        temperature: 0.1,
      });

      const responseContent = completion.choices[0]?.message?.content;
      
      let parsedData;
      try {
        const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                         responseContent.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1] || jsonMatch[0];
          parsedData = JSON.parse(jsonString);
        } else {
          parsedData = JSON.parse(responseContent);
        }
      } catch (parseError) {
        console.error('[WebResearch] Failed to parse PA JSON:', parseError);
        parsedData = {
          paStrategies: [],
          alternatives: [],
          summary: 'PA research completed but format was unexpected.',
          sources: []
        };
      }

      const searchTime = Date.now() - startTime;
      const result: WebResearchResult = {
        query: `Prior authorization strategies for ${drugName}`,
        searchTime,
        timestamp: new Date().toISOString(),
        alternatives: parsedData.alternatives || [],
        priceComparisons: [],
        paStrategies: parsedData.paStrategies || [],
        patientPrograms: [],
        summary: parsedData.summary || `PA research completed for ${drugName}`,
        sources: parsedData.sources || []
      };

      this.cacheResult(`pa-${drugName}`, result);

      console.log(`[WebResearch] PA research completed in ${searchTime}ms`);
      return result;

    } catch (error) {
      const searchTime = Date.now() - startTime;
      console.error(`[WebResearch] PA research error after ${searchTime}ms:`, error);
      
      return {
        query: `Prior authorization research for ${drugName}`,
        searchTime,
        timestamp: new Date().toISOString(),
        alternatives: [],
        priceComparisons: [],
        paStrategies: [],
        patientPrograms: [],
        summary: `PA research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sources: []
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await groq.chat.completions.create({
        messages: [{ role: "user", content: "Search for the current date and return it." }],
        model: "compound-beta",
        max_tokens: 50
      });
      
      return !!response.choices[0]?.message?.content;
    } catch (error) {
      console.error('[WebResearch] Health check failed:', error);
      return false;
    }
  }

  // Cache management
  private getCachedResult(key: string): WebResearchResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.result;
  }

  private cacheResult(key: string, result: WebResearchResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.cache.clear();
    console.log('[WebResearch] Cache cleared');
  }
}

export const webResearchService = new WebResearchService();