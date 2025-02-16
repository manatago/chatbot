// DOM要素の取得
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

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
const API_URL = 'https://kyozai.net/rag/index.php';

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

        // APIにリクエストを送信
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `prompt=${encodeURIComponent(message)}`
        });

        // レスポンスからpreタグの内容を取得
        const html = await response.text();
        const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
        
        if (!match) {
            throw new Error('レスポンスの形式が不正です');
        }

        const aiResponse = match[1].trim();
        // AIメッセージの表示
        appendMessage(aiResponse, 'ai');

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