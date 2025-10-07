// 弥生データを読み込む関数
async function loadYayoiData() {
    try {
        const response = await fetch('yayoi_topics.json');
        const data = await response.json();
        
        // データを記事形式に変換
        const articles = [];
        
        // 各カテゴリを処理
        const categories = {
            'family': { title: '家族の話', tags: ['家族', '日常', '思い出'] },
            'work': { title: '仕事の話', tags: ['仕事', '日常', 'バイト'] },
            'memory': { title: '思い出の話', tags: ['思い出', '過去', '経験'] },
            'place': { title: '場所の話', tags: ['場所', '大阪', '沖縄'] },
            'future': { title: '将来の話', tags: ['将来', '夢', '目標'] }
        };
        
        for (const [category, config] of Object.entries(categories)) {
            if (data[category] && Array.isArray(data[category])) {
                data[category].forEach((msg, index) => {
                    // 日付を日本語形式に変換
                    const japaneseDate = msg.date
                        .replace('2025/', '2025年')
                        .replace('(', '（')
                        .replace(')', '）');
                    
                    articles.push({
                        id: `${category}-${msg.date.replace(/\//g, '-')}-${index}`,
                        title: config.title,
                        date: japaneseDate,
                        category: category,
                        tags: [...config.tags],
                        content: msg.content.length > 150 ? msg.content.substring(0, 150) + '...' : msg.content,
                        source: 'Yayopedia',
                        fullContent: msg.content,
                        time: msg.time
                    });
                });
            }
        }
        
        // 日付でソート（新しい順）
        articles.sort((a, b) => {
            const dateA = new Date(a.date.replace('年', '/').replace('（', '(').replace('）', ')'));
            const dateB = new Date(b.date.replace('年', '/').replace('（', '(').replace('）', ')'));
            return dateB - dateA;
        });
        
        return articles;
        
    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
        return [];
    }
}

// 記事を表示する関数
function displayArticles(articles) {
    const container = document.getElementById('articles-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    articles.forEach(article => {
        const articleElement = document.createElement('article');
        articleElement.className = 'article-card';
        articleElement.innerHTML = `
            <div class="article-header">
                <div class="article-date">${article.date} ${article.time}</div>
                <div class="article-category">${article.category}</div>
            </div>
            <h3 class="article-title">${article.title}</h3>
            <div class="article-tags">
                ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <p class="article-content">${article.content}</p>
            <div class="article-stats">
                <span class="article-source">${article.source}</span>
                <button class="article-read-more" onclick="showFullArticle('${article.id}')">
                    続きを読む <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
        
        container.appendChild(articleElement);
    });
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', async function() {
    const articles = await loadYayoiData();
    displayArticles(articles);
});
