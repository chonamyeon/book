import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY is missing. AI features will not work.");
}
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
    },
    safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ]
});

/**
 * Summarizes the given text into 3 key points.
 */
export const summarizeReview = async (text) => {
    try {
        if (!apiKey) return null;
        const prompt = `다음 책 리뷰를 읽고, 아래 4가지 구성 요소(내용)를 포함하여 우아하고 철학적인 문체로 '지혜의 갈무리'를 작성해줘. 한국어로 답변해줘.

1. **책을 선택한 이유**: 이 책이 현재 우리 사회나 독자 개인에게 왜 필요한지 설명 (한 문단)
2. **저자 소개**: 저자의 이력이나 다른 저서와의 연결 고리를 짧게 언급하여 신뢰도 유지 (한 문단)
3. **추천 대상**: "이런 고민을 가진 분들이 읽으면 좋습니다"라는 가이드 제공 (한 문단)
4. **지혜의 요약**: 책에서 돋보이는 핵심 통찰 3가지를 '1. 2. 3.' 형식으로 요약 (숫자로 시작)

리뷰 내용:
${text}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Summarize Error:", error);
        return null;
    }
};

/**
 * Generates an inspiring "Thought of the Day" based on book contents.
 */
export const generateDailyThought = async (bookTitle, author) => {
    try {
        if (!apiKey) return null;
        const prompt = `${author}의 저서 '${bookTitle}'에서 영감을 얻어, 오늘 하루를 살아가는 사람들에게 힘이 될 수 있는 짧고 철학적인 생각 한 조각을 적어줘. 마치 오래된 도서관의 사서가 건네는 쪽지처럼 차분하고 따뜻한 어조여야 해.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini DailyThought Error:", error);
        return null;
    }
};

/**
 * Generic chat with Gemini - Uses Chat Session for better context handling
 */
export const chatWithGemini = async (message, history = []) => {
    try {
        if (!apiKey) return "API 키가 설정되지 않았습니다. 관리자에게 문의해 주세요.";

        // Use standard startChat for more reliable message threading
        // We filter out any previous system messages from history to keep it pure
        const chatSession = model.startChat({
            history: history
                .filter(h => h.role === 'user' || h.role === 'model')
                .map(h => ({
                    role: h.role,
                    parts: h.parts
                })),
        });

        const result = await chatSession.sendMessage(message);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Chat Detailed Error:", error);

        const errorMsg = error.toString().toLowerCase();

        // Detailed error classification
        if (errorMsg.includes("safety") || errorMsg.includes("blocked")) {
            return "보안 정책에 의해 답변을 드릴 수 없는 질문입니다. 다른 방식으로 물어봐 주세요.";
        }
        if (errorMsg.includes("api_key") || errorMsg.includes("401") || errorMsg.includes("403")) {
            return "연결 설정(API Key)에 문제가 있습니다. 관리자에게 확인을 요청해 주세요.";
        }
        if (errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("failed to fetch")) {
            return "네트워크 상태가 불안정하여 지혜를 가져오지 못했습니다. 인터넷 연결을 확인 후 다시 시도해 주세요.";
        }
        if (errorMsg.includes("quota") || errorMsg.includes("429")) {
            return "현재 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
        }

        return "지혜를 짜내는 중에 예상치 못한 문제가 발생했습니다. (잠시 후 다시 시도)";
    }
};
