import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAt8Ezz3Y9fF5yTZtt3ChH7swxyzmyThy4';

const MODEL_NAMES = ['gemini-2.0-flash', 'gemini-2.5-flash'];

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

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required', success: false },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    if (action === 'generate') {
      const prompt = `Bạn là giáo viên chuyên về Lịch sử Đảng Cộng sản Việt Nam. Tạo một câu hỏi trắc nghiệm mới về Lịch sử Đảng với 4 đáp án A, B, C, D.

Yêu cầu:
- 1 đáp án đúng duy nhất
- Đáp án rõ ràng, không gây nhầm lẫn
- Giải thích chi tiết nhưng không quá dài

QUAN TRỌNG: Chỉ trả về JSON, không có text khác trước hoặc sau JSON.

Format JSON:
{
  "question": "Câu hỏi về Lịch sử Đảng",
  "options": {
    "A": "Đáp án A",
    "B": "Đáp án B",
    "C": "Đáp án C",
    "D": "Đáp án D"
  },
  "correctAnswer": "A",
  "explanation": "Giải thích chi tiết nhưng không quá dài"
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
          if (error.message?.includes('API key') || error.message?.includes('quota') || error.message?.includes('Quota')) {
            throw error;
          }
        }
      }

      if (!result) {
        throw lastError || new Error('All models failed');
      }

      if (!result.response?.text) {
        throw new Error('Invalid response from AI model');
      }

      const text = result.response.text();

      let jsonText = text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const quizData: QuizQuestion = JSON.parse(jsonMatch[0]);

      if (!quizData.question || !quizData.options || !quizData.correctAnswer || !quizData.explanation ||
        !quizData.options.A || !quizData.options.B || !quizData.options.C || !quizData.options.D) {
        throw new Error('Invalid quiz data structure');
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

