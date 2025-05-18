// backend/src/services/formularyService.ts
import * as fs from 'fs';
import * as path from 'path';

export interface FormularyEntry {
  generic_name: string;
  brand_names?: string[];
  tier: number;
  copay: number;
  prior_auth: boolean;
  prior_auth_criteria?: string;
  quantity_limits: boolean;
  quantity_limit_details?: string;
  step_therapy: boolean;
  step_therapy_alternatives?: string[];
  alternatives?: string[];
  specialty_pharmacy_required?: boolean;
  infusion_required?: boolean;
}

export interface FormularyData {
  plan_id: string;
  plan_name: string;
  carrier: string;
  type: string;
  tier_structure: {
    [key: string]: {
      name: string;
      copay: number;
      description: string;
    };
  };
  formulary: {
    [medicationName: string]: FormularyEntry;
  };
  coverage_policies: any;
}

export class FormularyService {
  private formularies: Map<string, FormularyData> = new Map();

  constructor() {
    this.loadFormularies();
    
    // Debug: Log sample medication from each formulary
    this.formularies.forEach((formulary, planId) => {
      console.log(`[Formulary] ${planId} sample medications:`, Object.keys(formulary.formulary).slice(0, 5));
      
      // Check specific medications for debugging
      if (formulary.formulary['humira']) {
        console.log(`[Formulary] ${planId} - Humira details:`, formulary.formulary['humira']);
      }
      if (formulary.formulary['adalimumab']) {
        console.log(`[Formulary] ${planId} - Adalimumab details:`, formulary.formulary['adalimumab']);
      }
    });
  }

  private loadFormularies() {
    try {
      const formularyDir = path.join(__dirname, '../data/formularies');
      const files = fs.readdirSync(formularyDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(formularyDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          this.formularies.set(data.plan_id, data);
          console.log(`[Formulary] Loaded ${data.plan_name} (${data.plan_id})`);
        }
      }
      
      console.log(`[Formulary] Loaded ${this.formularies.size} formularies`);
    } catch (error) {
      console.error('[Formulary] Error loading formularies:', error);
    }
  }

  public checkCoverage(planId: string, medicationName: string): {
    isFound: boolean;
    entry?: FormularyEntry;
    matchedName?: string;
    formulary?: FormularyData;
  } {
    const formulary = this.formularies.get(planId);
    
    if (!formulary) {
      console.warn(`[Formulary] Plan not found: ${planId}`);
      return { isFound: false };
    }

    // Normalize medication name for search
    const normalizedMedication = medicationName.toLowerCase().trim();
    console.log(`[Formulary] Searching for: "${normalizedMedication}" in ${formulary.plan_name}`);
    console.log(`[Formulary] Available medications:`, Object.keys(formulary.formulary));

    // Try exact match first (case insensitive)
    for (const [key, entry] of Object.entries(formulary.formulary)) {
      if (key.toLowerCase() === normalizedMedication) {
        console.log(`[Formulary] Found exact match: ${key}`);
        return {
          isFound: true,
          entry,
          matchedName: key,
          formulary
        };
      }
    }

    // Try to find by generic name or brand name
    for (const [key, entry] of Object.entries(formulary.formulary)) {
      // Check if medication matches generic name
      if (entry.generic_name && entry.generic_name.toLowerCase() === normalizedMedication) {
        console.log(`[Formulary] Found by generic name: ${key}`);
        return {
          isFound: true,
          entry,
          matchedName: key,
          formulary
        };
      }

      // Check if medication matches any brand name
      if (entry.brand_names) {
        for (const brandName of entry.brand_names) {
          if (brandName.toLowerCase() === normalizedMedication) {
            console.log(`[Formulary] Found by brand name: ${brandName} -> ${key}`);
            return {
              isFound: true,
              entry,
              matchedName: key,
              formulary
            };
          }
        }
      }
    }

    // Special case mappings for common variations
    const commonMappings: { [key: string]: string } = {
      'tylenol': 'acetaminophen',
      'advil': 'ibuprofen',
      'humira': 'adalimumab',
      'lipitor': 'atorvastatin',
      'prinivil': 'lisinopril',
      'zestril': 'lisinopril',
      'synthroid': 'levothyroxine',
      'glucophage': 'metformin',
      'prilosec': 'omeprazole',
      'zoloft': 'sertraline',
      'norvasc': 'amlodipine'
    };

    const mappedName = commonMappings[normalizedMedication];
    if (mappedName) {
      console.log(`[Formulary] Trying mapped name: ${normalizedMedication} -> ${mappedName}`);
      return this.checkCoverage(planId, mappedName);
    }

    // Partial match (starts with) - be more flexible
    for (const [key, entry] of Object.entries(formulary.formulary)) {
      if (key.toLowerCase().includes(normalizedMedication) || 
          normalizedMedication.includes(key.toLowerCase()) ||
          (entry.generic_name && entry.generic_name.toLowerCase().includes(normalizedMedication))) {
        console.log(`[Formulary] Found partial match: ${key}`);
        return {
          isFound: true,
          entry,
          matchedName: key,
          formulary
        };
      }
    }

    console.log(`[Formulary] Medication not found in ${formulary.plan_name}: ${medicationName}`);
    return { isFound: false, formulary };
  }

  public getSuggestedAlternatives(planId: string, medicationName: string, currentEntry?: FormularyEntry): FormularyEntry[] {
    const formulary = this.formularies.get(planId);
    if (!formulary) return [];

    const alternatives: FormularyEntry[] = [];

    // If we have the current entry, look for its listed alternatives
    if (currentEntry && currentEntry.alternatives) {
      for (const altName of currentEntry.alternatives) {
        const altResult = this.checkCoverage(planId, altName);
        if (altResult.isFound && altResult.entry) {
          alternatives.push(altResult.entry);
        }
      }
    }

    // If no alternatives found, look for medications in lower tiers
    if (alternatives.length === 0 && currentEntry) {
      for (const [, entry] of Object.entries(formulary.formulary)) {
        if (entry.tier < currentEntry.tier && 
            !entry.prior_auth && 
            alternatives.length < 3) {
          alternatives.push(entry);
        }
      }
    }

    return alternatives;
  }

  public getAllPlans(): string[] {
    return Array.from(this.formularies.keys());
  }

  public getPlanInfo(planId: string): FormularyData | undefined {
    return this.formularies.get(planId);
  }
}

export const formularyService = new FormularyService();