// DOM要素の取得
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const temperatureSlider = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperature-value');

// 送信制限の設定
const MAX_MESSAGE_LENGTH = 300;  // 最大文字数
const MAX_MESSAGES_PER_MINUTE = 3;  // 1分間の最大送信回数
const MESSAGE_RESET_INTERVAL = 60000;  // 1分（ミリ秒）
let messageCount = 0;  // 送信回数カウンター
let lastMessageTime = Date.now();  // 最後のメッセージ送信時刻

// 1分ごとにメッセージカウンターをリセット
setInterval(() => {
    messageCount = 0;
}, MESSAGE_RESET_INTERVAL);

// API設定
const OPENAI_API_KEY = 'YOUR_API_KEY_HERE'; // ここにAPIキーを設定
const API_URL = 'https://api.openai.com/v1/chat/completions';
const SYSTEM_PROMPT_URL = 'https://api.example.com/chatbot/system-prompt.txt'; // システムプロンプトのURL

// システムプロンプトの取得
let systemPrompt = '';
fetch(SYSTEM_PROMPT_URL)
    .then(response => response.text())
    .then(text => {
        systemPrompt = text;
    })
    .catch(error => {
        console.error('システムプロンプトの読み込みに失敗しました:', error);
        systemPrompt = 'あなたは親切なAIアシスタントです。'; // デフォルトのプロンプト
    });

// Temperature値の更新
temperatureSlider.addEventListener('input', (e) => {
    temperatureValue.textContent = e.target.value;
});

// テキストエリアの文字数カウンターを追加
const counterDiv = document.createElement('div');
counterDiv.className = 'character-counter';
document.querySelector('.input-container').appendChild(counterDiv);

// テキストエリアの高さ自動調整と文字数カウント
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = `${userInput.scrollHeight}px`;
    
    // 残り文字数を表示
    const remainingChars = MAX_MESSAGE_LENGTH - userInput.value.length;
    counterDiv.textContent = `残り${remainingChars}文字`;
    counterDiv.classList.toggle('error', remainingChars < 0);
});

// メッセージ送信処理
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // 文字数制限チェック
    if (message.length > MAX_MESSAGE_LENGTH) {
        appendMessage(`メッセージが長すぎます。${MAX_MESSAGE_LENGTH}文字以内で入力してください。`, 'ai');
        return;
    }

    // 送信回数制限チェック
    if (messageCount >= MAX_MESSAGES_PER_MINUTE) {
        const waitTime = Math.ceil((MESSAGE_RESET_INTERVAL - (Date.now() - lastMessageTime)) / 1000);
        appendMessage(`送信頻度が高すぎます。${waitTime}秒後に再度お試しください。`, 'ai');
        return;
    }

    // 送信カウンターの更新
    messageCount++;
    lastMessageTime = Date.now();

    // ユーザーメッセージの表示
    appendMessage(message, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';

    try {
        // 送信ボタンを無効化
        sendButton.disabled = true;

        // OpenAI APIにリクエスト
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: parseFloat(temperatureSlider.value),
                stream: true
            })
        });

        // ストリーミングレスポンスの処理
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';

        // AIメッセージの表示準備
        const aiMessageElement = appendMessage('', 'ai');
        const aiMessageContent = aiMessageElement.querySelector('.message-content p');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices[0].delta.content;
                        if (content) {
                            aiResponse += content;
                            aiMessageContent.textContent = aiResponse;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) {
                        console.error('Parsing error:', e);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
        appendMessage('申し訳ありません。エラーが発生しました。', 'ai');
    } finally {
        // 送信ボタンを再有効化
        sendButton.disabled = false;
    }
}

// メッセージの追加
function appendMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    const img = document.createElement('img');
    img.src = `assets/${type === 'ai' ? 'robot' : 'person'}-avatar.png`;
    img.alt = type === 'ai' ? 'AI' : 'User';
    avatar.appendChild(img);

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    const p = document.createElement('p');
    p.textContent = content;
    messageContent.appendChild(p);

    if (type === 'user') {
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(avatar);
    } else {
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

// イベントリスナーの設定
// 送信は紙飛行機ボタンのみで行う
sendButton.addEventListener('click', sendMessage);

// エンターキーは常に改行として扱う
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        return; // デフォルトの改行動作を許可
    }
});