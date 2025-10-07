// 弥生データを読み込む関数
async function loadYayoiData() {
    try {
        console.log('データ読み込みを開始します...');
        
        // キャッシュを防ぐためのタイムスタンプ
        const timestamp = new Date().getTime();
        const response = await fetch(`yayoi_topics.json?t=${timestamp}`);
        
        if (!response.ok) {
            throw new Error(`HTTPエラー! ステータス: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('データ読み込み成功:', Object.keys(data));
        
        // データを記事形式に変換
        const articles = [];
        
        // 各カテゴリを処理
        const categories = {
            'family': { title: '家族の話', tags: ['家族', '日常', '思い出'], priority: 1 },
            'work': { title: '仕事の話', tags: ['仕事', '日常', 'バイト'], priority: 2 },
            'memory': { title: '思い出の話', tags: ['思い出', '過去', '経験'], priority: 3 },
            'place': { title: '場所の話', tags: ['場所', '大阪', '沖縄'], priority: 4 },
            'future': { title: '将来の話', tags: ['将来', '夢', '目標'], priority: 5 }
        };
        
        let articleId = 0;
        for (const [category, config] of Object.entries(categories)) {
            if (data[category] && Array.isArray(data[category])) {
                console.log(`${category}カテゴリ: ${data[category].length}件のメッセージ`);
                
                // メッセージを品質でフィルタリング
                const filteredMessages = filterQualityMessages(data[category]);
                console.log(`${category}カテゴリ: ${filteredMessages.length}件が品質基準を満たしました`);
                
                filteredMessages.forEach((msg, index) => {
                    // 日付を日本語形式に変換
                    const japaneseDate = msg.date
                        .replace('2025/', '2025年')
                        .replace('(', '（')
                        .replace(')', '）');
                    
                    articles.push({
                        id: `article-${articleId++}`,
                        title: config.title,
                        date: japaneseDate,
                        category: category,
                        tags: [...config.tags],
                        content: msg.content,
                        source: 'Yayopedia',
                        fullContent: msg.content,
                        time: msg.time,
                        originalDate: msg.date,
                        priority: config.priority
                    });
                });
            } else {
                console.warn(`${category}カテゴリのデータが見つかりません`);
            }
        }
        
        console.log(`記事総数: ${articles.length}`);
        
        // 日付でソート（新しい順）
        articles.sort((a, b) => {
            try {
                const dateA = new Date(a.originalDate.replace(/\(/g, ' ').replace(/\)/g, ''));
                const dateB = new Date(b.originalDate.replace(/\(/g, ' ').replace(/\)/g, ''));
                return dateB - dateA;
            } catch (e) {
                console.error('日付ソートエラー:', e);
                return 0;
            }
        });
        
        return articles;
        
    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
        showError('データの読み込みに失敗しました。ページを更新してください。');
        return [];
    }
}

// 品質フィルタリング関数
function filterQualityMessages(messages) {
    return messages.filter(msg => {
        const content = msg.content.trim();
        
        // 除外条件
        if (content.length < 10) return false; // 短すぎる
        if (content.length > 500) return false; // 長すぎる
        if (/^\[スタンプ\]$/.test(content)) return false; // スタンプのみ
        if (/^https?:\/\//.test(content)) return false; // URLのみ
        if (/^[0-9]+月[0-9]+日/.test(content)) return false; // 日付のみ
        if (/^[0-9]+:[0-9]+$/.test(content)) return false; // 時刻のみ
        
        // 品質基準
        const hasSubstance = content.includes('。') || content.includes('！') || content.includes('？');
        const hasMeaningfulContent = /[あ-ん]|[ア-ン]/.test(content); // 日本語を含む
        const notJustEmoji = !/^[^\u3040-\u309F゠-ヿ一-龯ぁ-ゖァ-ヺー　-〿]+$/.test(content);
        
        return hasSubstance && hasMeaningfulContent && notJustEmoji;
    });
}

// エラーメッセージを表示
function showError(message) {
    const container = document.getElementById('articles-container');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3>エラーが発生しました</h3>
                <p>${message}</p>
                <button class="retry-button" onclick="location.reload()">
                    ページを更新
                </button>
            </div>
        `;
    }
}

// 記事を表示する関数
function displayArticles(articles) {
    const container = document.getElementById('articles-container');
    if (!container) {
        console.error('コンテナが見つかりません');
        return;
    }
    
    if (articles.length === 0) {
        showError('品質基準を満たす記事が見つかりませんでした。');
        return;
    }
    
    // 統計情報を更新
    updateArticleStats(articles);
    
    container.innerHTML = '';
    
    articles.forEach((article, index) => {
        const articleElement = document.createElement('article');
        articleElement.className = 'article-card';
        articleElement.dataset.category = article.category;
        articleElement.style.opacity = '0';
        articleElement.style.transform = 'translateY(20px)';
        
        // 内容を要約
        const summary = createArticleSummary(article.content);
        
        articleElement.innerHTML = `
            <div class="article-header">
                <div class="article-date">${article.date} ${article.time}</div>
                <div class="article-category">${getCategoryName(article.category)}</div>
            </div>
            <h3 class="article-title">${article.title}</h3>
            <div class="article-tags">
                ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <p class="article-content">${escapeHtml(summary)}</p>
            <div class="article-stats">
                <span class="article-source">${article.source}</span>
                <button class="article-read-more" onclick="showFullArticle('${article.id}')">
                    続きを読む <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
        
        container.appendChild(articleElement);
        
        // アニメーション
        setTimeout(() => {
            articleElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            articleElement.style.opacity = '1';
            articleElement.style.transform = 'translateY(0)';
        }, 100 * (index % 5));
    });
}

// 記事の要約を作成
function createArticleSummary(content) {
    // 最初の文を取得
    const firstSentence = content.split('。')[0] + (content.includes('。') ? '。' : '');
    
    // 長すぎる場合は切り詰める
    if (firstSentence.length > 150) {
        return firstSentence.substring(0, 150) + '...';
    }
    
    return firstSentence;
}

// 統計情報を更新
function updateArticleStats(articles) {
    const totalArticles = articles.length;
    const uniqueDates = new Set(articles.map(a => a.originalDate)).size;
    
    // DOM要素を更新
    const totalElement = document.getElementById('totalArticles');
    const daysElement = document.getElementById('totalDays');
    const messagesElement = document.getElementById('totalMessages');
    
    if (totalElement) totalElement.textContent = totalArticles;
    if (daysElement) daysElement.textContent = uniqueDates;
    if (messagesElement) messagesElement.textContent = totalArticles.toLocaleString();
}

// カテゴリ名を日本語に変換
function getCategoryName(category) {
    const names = {
        'family': '家族',
        'work': '仕事',
        'memory': '思い出',
        'place': '場所',
        'future': '将来'
    };
    return names[category] || category;
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 全文表示関数
function showFullArticle(articleId) {
    const article = window.loadedArticles.find(a => a.id === articleId);
    if (article) {
        alert(article.fullContent);
    }
}

// カテゴリフィルタリング
function filterArticles(category) {
    const articles = document.querySelectorAll('.article-card');
    
    articles.forEach(article => {
        if (category === 'all' || article.dataset.category === category) {
            article.style.display = 'block';
        } else {
            article.style.display = 'none';
        }
    });
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM読み込み完了');
    
    const articles = await loadYayoiData();
    window.loadedArticles = articles; // グローバルに保存
    displayArticles(articles);
    
    // カテゴリボタンのイベントリスナー
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterArticles(this.dataset.category);
        });
    });
});