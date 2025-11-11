import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCMJ3TjoLAMbkBJ5FCxmD02-zJqd2ZZgZc';

const MODEL_NAMES = ['gemini-2.0-flash', 'gemini-2.5-flash'];

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    const systemPrompt = `Bạn là Chủ tịch Hồ Chí Minh, dựa trên những tài liệu lịch sử, lời nói và tác phẩm đã được công bố chính thống.

Nhiệm vụ của bạn là:

Trả lời các câu hỏi của người dùng bằng giọng điệu giản dị, gần gũi, khiêm tốn nhưng sâu sắc, giống phong cách của Bác Hồ.

Luôn dùng ngôn ngữ trong sáng, chuẩn mực và tích cực, khuyến khích tinh thần học tập, đoàn kết, yêu nước, cần - kiệm - liêm - chính - chí công vô tư.

Khi trích dẫn hoặc diễn giải tư tưởng, ghi rõ đó là dựa trên lời nói, bài viết hoặc phong cách Hồ Chí Minh, không nói như thể bạn là Bác.

Nếu người dùng hỏi về các vấn đề lịch sử hoặc đạo đức, hãy phân tích dưới góc nhìn tư tưởng Hồ Chí Minh, có thể trích dẫn các câu nói nổi tiếng.

Khi trả lời, hãy mở đầu bằng lời chào thân mật như:

"Bác xin chào các cháu." hoặc "Cháu hỏi rất hay, Bác xin nói thế này..."

Cuối cùng, luôn giữ mục tiêu là giáo dục, truyền cảm hứng và khơi dậy lòng yêu nước cho người nghe.`;

    const prompt = `${systemPrompt}\n\nCâu hỏi: ${message}\n\nTrả lời:`;

    const generationConfig = {
      maxOutputTokens: 1000,
      temperature: 0.7,
    };

    let result;
    let lastError: any = null;

    for (const modelName of MODEL_NAMES) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        );

        result = await Promise.race([
          model.generateContent(prompt),
          timeoutPromise
        ]) as any;

        break;
      } catch (error: any) {
        lastError = error;
        if (error.message?.includes('API key') || error.message?.includes('quota') || error.message?.includes('Quota') || error.message?.includes('timeout')) {
          throw error;
        }
      }
    }

    if (!result) {
      throw lastError || new Error('All models failed');
    }

    const text = result.response.text();

    if (!text?.trim()) {
      throw new Error('Empty response from Gemini API');
    }

    return NextResponse.json({
      message: text,
      success: true
    });

  } catch (error: any) {
    console.error('Error calling Gemini API:', error);

    let errorDetails = error.message || 'Unknown error';
    let errorStatus = error.status || 500;

    if (error.message?.includes('API key')) {
      errorDetails = 'Invalid or missing API key. Please check your GEMINI_API_KEY in .env.local';
      errorStatus = 401;
    } else if (error.message?.includes('timeout')) {
      errorDetails = 'Request timeout. Please try again.';
      errorStatus = 408;
    } else if (error.message?.includes('model') || error.message?.includes('Model')) {
      errorDetails = `Model error: ${error.message}`;
      errorStatus = 400;
    } else if (error.message?.includes('quota') || error.message?.includes('Quota')) {
      errorDetails = 'API quota exceeded. Please check your Gemini API quota.';
      errorStatus = 429;
    }

    return NextResponse.json(
      {
        error: 'Failed to get response from AI',
        details: errorDetails,
        success: false
      },
      { status: errorStatus }
    );
  }
}

