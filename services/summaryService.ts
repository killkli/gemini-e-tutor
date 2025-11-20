import { GoogleGenAI } from '@google/genai';
import { TranscriptEntry } from '../types';

export async function generateLearningSummary(
  transcript: TranscriptEntry[],
  previousSummary: string | undefined,
  apiKey: string,
  summaryModel: string,
  subject: 'english' | 'chinese'
): Promise<string> {
  if (!apiKey) {
    console.error("API key not provided for summary generation");
    return previousSummary || "尚無學習總結";
  }

  // If transcript is too short, don't generate summary yet
  if (transcript.length < 4) {
    return previousSummary || "對話內容尚不足以產生學習總結";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Use Gemini 2.0 Flash for fast, cost-effective summarization
    // Note: Using 'gemini-2.0-flash' as it's the current production model for text
    // If 'gemini-2.5-flash' becomes available for text-only, we can switch

    // The SDK has changed, we need to use models.generateContent directly
    // or get the model correctly if that method exists.
    // Based on SDK docs, we should use ai.models.generateContent but let's check if we can get a model instance.
    // It seems `getGenerativeModel` is gone in the new SDK version or we are using it wrong.
    // Let's try using the `generateContent` method on the `models` module directly if possible,
    // but standard usage usually involves getting a model object.

    // Re-checking the SDK definition, it seems we should use:
    // const response = await ai.models.generateContent({ model: '...', contents: ... })

    const transcriptText = transcript
      .map(t => `${t.speaker === 'user' ? '學生' : '家教'}: ${t.text}`)
      .join('\n');

    const subjectName = subject === 'english' ? '英文' : '國語';
    const prompt = `
你是一位專業的${subjectName}教學顧問。請根據以下的師生對話記錄，以及之前的學習狀況（如果有的話），
為這位學生產生一份簡短的「學習狀況總結」。
這份總結將會提供給未來的 AI 家教參考，以便更客製化地進行教學。

之前的學習狀況：
${previousSummary || "無"}

本次對話記錄：
${transcriptText}

請總結以下幾點（請用繁體中文，不可超過 1000 字）：
1. 學生的${subjectName}程度估計（初級/中級/高級）。請依據以下YES/NO準則評估（在總結中簡要列出每個準則的YES/NO），並根據YES數決定程度（0-4:初級、5-8:中級、9-12:高級）：
   - 能流利使用基本問候語、數字和自我介紹（YES/NO）
   - 能正確使用簡單現在式句子（YES/NO）
   - 能正確使用過去式和現在進行式（YES/NO）
   - 能使用未來式或情態動詞（如can, should）（YES/NO）
   - 詞彙量豐富，能討論日常話題如工作、旅行、興趣（YES/NO）
   - 發音清晰，少有母語干擾（YES/NO）
   - 能理解並回應中等複雜度的問題或敘述個人意見（YES/NO）
   - 文法結構多樣，錯誤率低（少於20%）（YES/NO）
   - 能正確使用比較級和最高級形容詞（YES/NO）
   - 能使用條件句（第一、二類，如if + 現在式）（YES/NO）
   - 能使用連接詞建構複合句（如because, although, however）（YES/NO）
   - 說話流利，少停頓，能維持長對話無明顯猶豫（YES/NO）
2. 擅長的部份（例如：發音清晰、詞彙豐富等）
3. 需要加強的部份（例如：文法錯誤、發音問題、詞彙量不足等）
4. 對未來教學的具體建議（例如：多練習過去式、糾正發音等）

請直接輸出總結內容，不要有額外的開場白。
    `;

    const response = await ai.models.generateContent({
      model: summaryModel,
      contents: prompt
    });

    return response.text || "無法產生總結";
  } catch (error) {
    console.error("Failed to generate learning summary:", error);
    return previousSummary || "產生學習總結時發生錯誤";
  }
}
