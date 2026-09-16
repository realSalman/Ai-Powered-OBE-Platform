import { AnonymizationContext } from './ai.types';

/**
 * Anonymizes student-identifiable data before sending to LLM.
 * Creates a per-request mapping of real names/IDs → pseudonyms.
 * Skips anonymization for student role (they only see their own data).
 */
export class AIAnonymizer {
  private nameCounter = 0;
  private context: AnonymizationContext = {
    forwardNameMap: new Map(),
    reverseNameMap: new Map(),
    forwardIdMap: new Map(),
    reverseIdMap: new Map(),
  };

  /**
   * Should anonymization be applied for this role?
   * Students see their own data — no need to anonymize.
   */
  static shouldAnonymize(role: string): boolean {
    return role !== 'student';
  }

  /**
   * Generate next pseudonym: Student A, Student B, ..., Student Z, Student AA, ...
   */
  private nextPseudonym(): string {
    const index = this.nameCounter++;
    if (index < 26) {
      return `Student ${String.fromCharCode(65 + index)}`;
    }
    // For classes > 26 students
    const first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
    const second = String.fromCharCode(65 + (index % 26));
    return `Student ${first}${second}`;
  }

  /**
   * Get or create a pseudonym for a student name.
   */
  private getNamePseudonym(realName: string): string {
    if (!realName) return realName;
    const existing = this.context.forwardNameMap.get(realName);
    if (existing) return existing;

    const pseudonym = this.nextPseudonym();
    this.context.forwardNameMap.set(realName, pseudonym);
    this.context.reverseNameMap.set(pseudonym, realName);
    return pseudonym;
  }

  /**
   * Get or create a pseudonym for a student ID.
   */
  private getIdPseudonym(realId: string): string {
    if (!realId) return realId;
    const existing = this.context.forwardIdMap.get(realId);
    if (existing) return existing;

    const idx = this.context.forwardIdMap.size;
    const pseudonym = `ID_${String.fromCharCode(65 + (idx % 26))}${idx >= 26 ? Math.floor(idx / 26) : ''}`;
    this.context.forwardIdMap.set(realId, pseudonym);
    this.context.reverseIdMap.set(pseudonym, realId);
    return pseudonym;
  }

  /**
   * Anonymize an array of data objects containing student info.
   * Replaces name, studentId, and email fields.
   */
  anonymize(data: any[]): { anonymized: any[]; context: AnonymizationContext } {
    const anonymized = data.map((item) => this.anonymizeObject(item));
    return { anonymized, context: this.context };
  }

  /**
   * Recursively anonymize a single object.
   */
  private anonymizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.anonymizeObject(item));

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'email') {
        // Remove emails entirely
        continue;
      }
      if (key === 'name' && typeof value === 'string' && this.looksLikeStudentContext(obj)) {
        result[key] = this.getNamePseudonym(value);
      } else if (key === 'studentId' && typeof value === 'string') {
        result[key] = this.getIdPseudonym(value);
      } else if (typeof value === 'object') {
        result[key] = this.anonymizeObject(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Heuristic: does this object represent a student?
   * Checks for student-like fields (studentId, roles containing 'student', etc.)
   */
  private looksLikeStudentContext(obj: any): boolean {
    if (obj.studentId) return true;
    if (obj.roles && Array.isArray(obj.roles) && obj.roles.includes('student')) return true;
    // If the parent context is a student marks or enrollment query result
    if (obj.student && typeof obj.student === 'object') return false; // this is the parent, not the student
    return false;
  }

  /**
   * De-anonymize AI response text by replacing pseudonyms with real names/IDs.
   */
  deAnonymize(text: string): string {
    let result = text;

    // Replace name pseudonyms (longer pseudonyms first to avoid partial matches)
    const namePairs = Array.from(this.context.reverseNameMap.entries())
      .sort((a, b) => b[0].length - a[0].length);

    for (const [pseudonym, realName] of namePairs) {
      result = result.split(pseudonym).join(realName);
    }

    // Replace ID pseudonyms
    const idPairs = Array.from(this.context.reverseIdMap.entries())
      .sort((a, b) => b[0].length - a[0].length);

    for (const [pseudonym, realId] of idPairs) {
      result = result.split(pseudonym).join(realId);
    }

    return result;
  }

  /**
   * Get the current anonymization context (for debugging/logging).
   */
  getContext(): AnonymizationContext {
    return this.context;
  }
}
