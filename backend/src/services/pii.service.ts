import axios from 'axios';

export class PiiService {
  static async redact(text: string): Promise<string> {
    const ANALYZER_URL = process.env.PRESIDIO_ANALYZER_URL?.includes('presidio-analyzer') 
      ? 'http://localhost:5001' 
      : (process.env.PRESIDIO_ANALYZER_URL || 'http://localhost:5001');

    const ANONYMIZER_URL = process.env.PRESIDIO_ANONYMIZER_URL?.includes('presidio-anonymizer')
      ? 'http://localhost:5002'
      : (process.env.PRESIDIO_ANONYMIZER_URL || 'http://localhost:5002');
    console.log(`🔌 PII Service conecting to Presidio Analyzer: ${ANALYZER_URL}`);

    try {
      const analyzeResponse = await axios.post(`${ANALYZER_URL}/analyze`, {
        text: text,
        language: "en",
        return_decision_process: false
      });

      const findings = analyzeResponse.data;

      if (findings.length === 0) return text;

      const anonymizeResponse = await axios.post(`${ANONYMIZER_URL}/anonymize`, {
        text: text,
        analyzer_results: findings,
        anonymizers: {
          DEFAULT: { type: "replace", new_value: "<REDACTED>" },
          PHONE_NUMBER: { type: "replace", new_value: "<PHONE>" },
          EMAIL_ADDRESS: { type: "replace", new_value: "<EMAIL>" },
          PERSON: { type: "replace", new_value: "<PERSON>" },
          CREDIT_CARD: { type: "replace", new_value: "<CREDIT_CARD>" }
        }
      });

      return anonymizeResponse.data.text;

    } catch (error) {
      console.error(`⚠️ Error conectando con Presidio en ${ANALYZER_URL}`);
      return text;
    }
  }
}