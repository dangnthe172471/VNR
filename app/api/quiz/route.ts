import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCMJ3TjoLAMbkBJ5FCxmD02-zJqd2ZZgZc';

const MODEL_NAMES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export async function POST(request: NextRequest) {
  try {
    const { action, selectedAnswer, question } = await request.json();

    const genAI = new GoogleGenerativeAI(API_KEY);

    if (action === 'generate') {
      const prompt = `Tạo câu hỏi trắc nghiệm về Lịch sử Đảng Cộng sản Việt Nam với 4 đáp án A, B, C, D. Chủ đề: sự ra đời Đảng (1920-1930), đấu tranh giành chính quyền (1930-1945), kháng chiến chống Pháp và Mỹ (1945-1975), xây dựng và đổi mới (1975-2018), cương lĩnh đường lối, Đại hội Đảng, nhân vật lãnh đạo.

Yêu cầu: 1 đáp án đúng, đáp án rõ ràng, giải thích ngắn gọn.

Trả về JSON (chỉ JSON, không text khác):
{
  "question": "Câu hỏi",
  "options": {"A": "Đáp án A", "B": "Đáp án B", "C": "Đáp án C", "D": "Đáp án D"},
  "correctAnswer": "A",
  "explanation": "Giải thích ngắn gọn"
}`;

      const generationConfig = {
        maxOutputTokens: 500,
        temperature: 0.5,
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
            setTimeout(() => reject(new Error('Request timeout')), 20000)
          );

          result = await Promise.race([
            model.generateContent(prompt),
            timeoutPromise
          ]) as any;

          break;
        } catch (error: any) {
          lastError = error;
          console.error(`Error with model ${modelName}:`, error.message);
          if (error.message?.includes('API key') || error.message?.includes('quota') || error.message?.includes('Quota')) {
            throw error;
          }
        }
      }

      if (!result) {
        throw lastError || new Error('All models failed');
      }

      const text = result.response.text();
      console.log('Quiz API response:', text.substring(0, 200));

      let quizData: QuizQuestion;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          quizData = JSON.parse(jsonMatch[0]);

          if (!quizData.question || !quizData.options || !quizData.correctAnswer || !quizData.explanation) {
            throw new Error('Invalid quiz data structure');
          }
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError: any) {
        console.error('Parse error:', parseError);
        quizData = {
          question: "Đảng Cộng sản Việt Nam được thành lập vào thời gian nào?",
          options: {
            A: "3/2/1930",
            B: "2/9/1945",
            C: "19/8/1945",
            D: "30/4/1975"
          },
          correctAnswer: "A",
          explanation: "Đảng Cộng sản Việt Nam được thành lập ngày 3/2/1930 tại Hương Cảng (Trung Quốc) dưới sự chủ trì của Nguyễn Ái Quốc (Hồ Chí Minh). Đây là sự kiện lịch sử trọng đại, đánh dấu bước ngoặt vĩ đại của cách mạng Việt Nam."
        };
      }

      return NextResponse.json({
        success: true,
        quiz: quizData
      });

    } else if (action === 'check') {
      if (!question || !selectedAnswer) {
        return NextResponse.json(
          { error: 'Missing question or answer' },
          { status: 400 }
        );
      }

      const quizData = question as QuizQuestion;
      const isCorrect = selectedAnswer === quizData.correctAnswer;

      return NextResponse.json({
        success: true,
        isCorrect,
        correctAnswer: quizData.correctAnswer,
        explanation: quizData.explanation
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error in quiz API:', error);

    let errorDetails = error.message || 'Unknown error';
    let errorStatus = error.status || 500;

    if (error.message?.includes('API key')) {
      errorDetails = 'Invalid or missing API key';
      errorStatus = 401;
    } else if (error.message?.includes('timeout')) {
      errorDetails = 'Request timeout. Please try again.';
      errorStatus = 408;
    } else if (error.message?.includes('quota') || error.message?.includes('Quota')) {
      errorDetails = 'API quota exceeded. Please check your Gemini API quota.';
      errorStatus = 429;
    } else if (error.message?.includes('model') || error.message?.includes('Model')) {
      errorDetails = `Model error: ${error.message}`;
      errorStatus = 400;
    }

    return NextResponse.json(
      {
        error: 'Failed to process quiz request',
        details: errorDetails,
        success: false
      },
      { status: errorStatus }
    );
  }
}

