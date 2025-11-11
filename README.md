# Chatbot Lịch Sử - Next.js với Gemini API

Ứng dụng chatbot mô phỏng nhân vật lịch sử Việt Nam, sử dụng Next.js và Google Gemini API.

## Tính năng

- 💬 Trò chuyện với các nhân vật lịch sử Việt Nam
- 🎭 Chọn từ nhiều nhân vật lịch sử khác nhau
- 📚 Giải thích các sự kiện lịch sử quan trọng
- 🎮 Giao diện đẹp, hiện đại và dễ sử dụng
- 📱 Responsive, hoạt động tốt trên mobile

## Nhân vật lịch sử

- 👴 Chủ tịch Hồ Chí Minh
- ⚔️ Lê Lợi
- 🛡️ Trần Hưng Đạo
- 📜 Nguyễn Trãi

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env.local` (nếu chưa có) và thêm API key:
```
GEMINI_API_KEY=AIzaSyCMJ3TjoLAMbkBJ5FCxmD02-zJqd2ZZgZc
```

3. Chạy development server:
```bash
npm run dev
```

4. Mở trình duyệt tại [http://localhost:3000](http://localhost:3000)

## Cấu trúc project

```
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # API route cho Gemini
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Trang chính với chat interface
├── next.config.js
├── package.json
└── tsconfig.json
```

## Công nghệ sử dụng

- **Next.js 14** - React framework với App Router
- **TypeScript** - Type safety
- **Google Gemini API** - AI model cho chatbot
- **CSS Modules** - Styling

## Sử dụng

1. Chọn một nhân vật lịch sử từ danh sách
2. Nhập câu hỏi của bạn vào ô input
3. Nhấn Enter hoặc click nút gửi
4. Chatbot sẽ trả lời như nhân vật lịch sử đó

## Build cho production

```bash
npm run build
npm start
```

## License

MIT

