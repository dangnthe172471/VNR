'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import styles from './page.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface QuizQuestion {
  question: string
  options: {
    A: string
    B: string
    C: string
    D: string
  }
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

const STORAGE_KEY = 'vnr-chat-history'
const AVATAR_IMAGE = '/ho-chi-minh.png'
const AVATAR_NAME = 'Chủ tịch Hồ Chí Minh'

const formatMessage = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\n\n+/g, '\n\n')
    .replace(/\*\s/g, '\n• ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim()
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'chat' | 'game'>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<{ isCorrect: boolean; explanation: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY)
      if (savedHistory) {
        const parsedMessages = JSON.parse(savedHistory) as Message[]
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages)
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
      } catch (error) {
        console.error('Error saving chat history:', error)
      }
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const messageToSend = input.trim()

    const userMessage: Message = {
      role: 'user',
      content: messageToSend
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || `HTTP ${response.status}`)
      }

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || data.details || 'Failed to get response')
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Xin lỗi, đã có lỗi xảy ra: ${error.message || 'Unknown error'}. Vui lòng thử lại.`
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing chat history:', error)
    }
  }

  const generateQuestion = async () => {
    setIsGenerating(true)
    setCurrentQuestion(null)
    setSelectedAnswer(null)
    setResult(null)

    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to generate question')
      }

      if (data.success && data.quiz) {
        setCurrentQuestion(data.quiz)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error: any) {
      alert(`Lỗi: ${error.message || 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const checkAnswer = async (answer: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQuestion || selectedAnswer !== null) return

    setSelectedAnswer(answer)
    setIsChecking(true)

    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check',
          selectedAnswer: answer,
          question: currentQuestion,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to check answer')
      }

      if (data.success) {
        setResult({
          isCorrect: data.isCorrect,
          explanation: data.explanation,
        })
      }
    } catch (error: any) {
      alert(`Lỗi: ${error.message || 'Unknown error'}`)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            💬 Lịch Sử Đảng Cộng Sản Việt Nam
          </h1>
          <p className={styles.subtitle}>
            Học tập và nghiên cứu lịch sử Đảng - Lịch sử bằng vàng
          </p>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'chat' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Trò chuyện
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'game' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('game')}
          >
            🎮 Trắc nghiệm
          </button>
        </div>

        {activeTab === 'chat' && (
          <div className={styles.chatContainer}>
            <div className={styles.chatHeader}>
              <span className={styles.currentCharacter}>
                <Image
                  src={AVATAR_IMAGE}
                  alt={AVATAR_NAME}
                  width={32}
                  height={32}
                  className={styles.characterHeaderImage}
                />
                {' '}
                {AVATAR_NAME}
              </span>
              {messages.length > 0 && (
                <button className={styles.clearButton} onClick={clearChat}>
                  🗑️ Xóa lịch sử
                </button>
              )}
            </div>

            <div className={styles.messages}>
              {messages.length === 0 ? (
                <div className={styles.welcomeMessage}>
                  <p>👋 Chào mừng bạn đến với Hệ thống Học tập Lịch sử Đảng!</p>
                  <p>Bạn có thể hỏi về: sự ra đời của Đảng (1920-1930), lãnh đạo đấu tranh giành chính quyền (1930-1945), kháng chiến chống Pháp và Mỹ (1945-1975), xây dựng và đổi mới (1975-2018), cương lĩnh, đường lối, các kỳ Đại hội Đảng, và bài học lịch sử.</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage
                      }`}
                  >
                    <div className={styles.messageContent}>
                      {msg.role === 'assistant' && (
                        <div className={`${styles.avatar} ${styles.characterIcon}`}>
                          <Image
                            src={AVATAR_IMAGE}
                            alt={AVATAR_NAME}
                            width={100}
                            height={100}
                            className={styles.avatarImage}
                          />
                        </div>
                      )}
                      {msg.role === 'user' && (
                        <div className={`${styles.avatar} ${styles.userAvatar}`}>
                          👤
                        </div>
                      )}
                      <div className={styles.messageText}>{formatMessage(msg.content)}</div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className={`${styles.message} ${styles.assistantMessage}`}>
                  <div className={styles.messageContent}>
                    <div className={`${styles.avatar} ${styles.characterIcon}`}>
                      <Image
                        src={AVATAR_IMAGE}
                        alt={AVATAR_NAME}
                        width={100}
                        height={100}
                        className={styles.avatarImage}
                      />
                    </div>
                    <div className={styles.loading}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputContainer}>
              <textarea
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Hỏi về lịch sử Đảng Cộng sản Việt Nam..."
                rows={2}
                disabled={isLoading}
              />
              <button
                className={styles.sendButton}
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'game' && (
          <div className={styles.gameContainer}>
            <div className={styles.gameHeader}>
              <h2>🎯 Trắc Nghiệm Lịch Sử Đảng</h2>
              <button
                className={styles.newQuestionButton}
                onClick={generateQuestion}
                disabled={isGenerating}
              >
                {isGenerating ? '⏳ Đang tạo...' : '✨ Câu hỏi mới'}
              </button>
            </div>

            <div className={styles.gameContent}>
              {!currentQuestion && !isGenerating && (
                <div className={styles.gameWelcome}>
                  <p>🎮 Chào mừng đến với Trắc Nghiệm Lịch Sử Đảng!</p>
                  <p>Nhấn nút "Câu hỏi mới" để bắt đầu chơi.</p>
                  <p>Bạn sẽ được hỏi về: sự ra đời của Đảng, các thời kỳ lịch sử, cương lĩnh đường lối, các kỳ Đại hội Đảng, và bài học lịch sử của Đảng Cộng sản Việt Nam.</p>
                </div>
              )}

              {isGenerating && (
                <div className={styles.gameLoading}>
                  <div className={styles.loading}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p>Đang tạo câu hỏi...</p>
                </div>
              )}

              {currentQuestion && (
                <div className={styles.questionContainer}>
                  <div className={styles.questionText}>
                    {currentQuestion.question}
                  </div>

                  <div className={styles.optionsContainer}>
                    {(['A', 'B', 'C', 'D'] as const).map((option) => {
                      const isSelected = selectedAnswer === option
                      const isCorrect = result && currentQuestion.correctAnswer === option
                      const isWrong = result && isSelected && !result.isCorrect
                      const isDisabled = selectedAnswer !== null

                      return (
                        <button
                          key={option}
                          className={`${styles.optionButton} ${isSelected ? styles.selected : ''
                            } ${isCorrect ? styles.correct : ''} ${isWrong ? styles.wrong : ''
                            }`}
                          onClick={() => checkAnswer(option)}
                          disabled={isDisabled || isChecking}
                        >
                          <span className={styles.optionLabel}>{option}.</span>
                          <span className={styles.optionText}>
                            {currentQuestion.options[option]}
                          </span>
                          {isCorrect && <span className={styles.checkmark}>✓</span>}
                          {isWrong && <span className={styles.cross}>✗</span>}
                        </button>
                      )
                    })}
                  </div>

                  {result && (
                    <div
                      className={`${styles.resultBox} ${result.isCorrect ? styles.resultCorrect : styles.resultWrong
                        }`}
                    >
                      <div className={styles.resultIcon}>
                        {result.isCorrect ? '🎉' : '😔'}
                      </div>
                      <div className={styles.resultText}>
                        <h3>
                          {result.isCorrect
                            ? 'Chúc mừng! Bạn trả lời đúng!'
                            : 'Sai rồi! Đáp án đúng là ' +
                            currentQuestion.correctAnswer}
                        </h3>
                        <p className={styles.explanation}>{result.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}