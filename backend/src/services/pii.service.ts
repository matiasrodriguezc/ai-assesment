import axios from 'axios';

export class PiiService {
  static async redact(text: string): Promise<string> {
    // 🔥 FIX: Lógica simplificada. 
    // Si existe la variable de entorno (Docker), la usa. Si no, usa localhost (Local).
    const ANALYZER_URL = process.env.PRESIDIO_ANALYZER_URL || 'http://localhost:5001';
    const ANONYMIZER_URL = process.env.PRESIDIO_ANONYMIZER_URL || 'http://localhost:5002';

    console.log(`🔌 PII Service connecting to Presidio Analyzer: ${ANALYZER_URL}`);

    try {
      // 1. Analizar texto (Detectar entidades)
      const analyzeResponse = await axios.post(`${ANALYZER_URL}/analyze`, {
        text: text,
        language: "en",
        return_decision_process: false
      });

      const findings = analyzeResponse.data;

      // Si no encontró nada, devolvemos el texto original para ahorrar tiempo
      if (!findings || findings.length === 0) {
        return text;
      }

      // 2. Anonimizar texto (Reemplazar entidades)
      const anonymizeResponse = await axios.post(`${ANONYMIZER_URL}/anonymize`, {
        text: text,
        analyzer_results: findings,
        anonymizers: {
          DEFAULT: { type: "replace", new_value: "<REDACTED>" },
          PHONE_NUMBER: { type: "replace", new_value: "<PHONE>" },
          EMAIL_ADDRESS: { type: "replace", new_value: "<EMAIL>" },
          PERSON: { type: "replace", new_value: "<PERSON>" },
          CREDIT_CARD: { type: "replace", new_value: "<CREDIT_CARD>" },
          US_SSN: { type: "replace", new_value: "<ID_NUM>" }
        }
      });

      return anonymizeResponse.data.text;

    } catch (error: any) {
      // Si falla Presidio, fallamos "abierto" (devolvemos el texto original) 
      // o "cerrado" (tiramos error) dependiendo de tu política de seguridad.
      // Aquí logueamos y devolvemos original para no romper el flujo en la demo.
      console.error(`⚠️ Error connecting to Presidio at ${ANALYZER_URL}:`, error.message);
      return text;
    }
  }
}