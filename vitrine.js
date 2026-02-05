(function() {
  'use strict';

  // Configurações padrão
  const DEFAULTS = {
    apiUrl: 'https://constance-vitrine-production.up.railway.app/api/v1/recommendations/',
    containerId: 'vitrine-recomendacoes',
    limit: 10,
    weights: {
      grade: 0.25,
      shipping: 0.15,
      discount: 0.20,
      similarity: 0.25,
      history: 0.15
    },
    historyKey: 'vitrine_nav_history',
    maxHistoryItems: 20
  };

  // Mescla configurações externas (window.VITRINE_CONFIG) com defaults
  const EXT = window.VITRINE_CONFIG || {};
  const CONFIG = {
    ...DEFAULTS,
    ...EXT,
    weights: {
      ...DEFAULTS.weights,
      ...(EXT.weights || {})
    }
  };

  // Pega o product_id do dataLayer
  function getProductIdFromDataLayer() {
    if (typeof dataLayer === 'undefined') {
      console.warn('[Vitrine] dataLayer não encontrado');
      return null;
    }

    // Procura o evento de pageview ou produto no dataLayer
    for (let i = dataLayer.length - 1; i >= 0; i--) {
      const item = dataLayer[i];

      // Tenta diferentes estruturas comuns do dataLayer
      if (item.ecommerce?.detail?.products?.[0]?.id) {
        return item.ecommerce.detail.products[0].id;
      }
      if (item.ecommerce?.items?.[0]?.item_id) {
        return item.ecommerce.items[0].item_id;
      }
      if (item.productId) {
        return item.productId;
      }
      if (item.product_id) {
        return item.product_id;
      }
    }

    console.warn('[Vitrine] product_id não encontrado no dataLayer');
    return null;
  }

  // Gerencia histórico de navegação
  function getNavigationHistory() {
    try {
      const history = localStorage.getItem(CONFIG.historyKey);
      return history ? JSON.parse(history) : [];
    } catch (e) {
      return [];
    }
  }

  function addToNavigationHistory(productId) {
    if (!productId) return;

    try {
      let history = getNavigationHistory();

      // Remove se já existe (para mover para o início)
      history = history.filter(id => id !== productId);

      // Adiciona no início
      history.unshift(productId);

      // Limita o tamanho
      history = history.slice(0, CONFIG.maxHistoryItems);

      localStorage.setItem(CONFIG.historyKey, JSON.stringify(history));
    } catch (e) {
      console.warn('[Vitrine] Erro ao salvar histórico:', e);
    }
  }

  // Busca recomendações da API
  async function fetchRecommendations(productId) {
    const history = getNavigationHistory().filter(id => id !== productId);

    const payload = {
      product_id: productId,
      navigation_history: history.slice(0, 10),
      weights: CONFIG.weights,
      limit: CONFIG.limit
    };

    try {
      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[Vitrine] Erro ao buscar recomendações:', error);
      return null;
    }
  }

  // Formata preço em BRL
  function formatPrice(price) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  }

  // Calcula percentual de desconto
  function getDiscountPercent(price, salePrice) {
    if (!salePrice || salePrice >= price) return 0;
    return Math.round((1 - salePrice / price) * 100);
  }

  // Renderiza as recomendações
  function renderRecommendations(data) {
    const container = document.getElementById(CONFIG.containerId);
    if (!container) {
      console.warn(`[Vitrine] Container #${CONFIG.containerId} não encontrado`);
      return;
    }

    if (!data?.recommendations?.length) {
      container.style.display = 'none';
      return;
    }

    const html = `
      <div class="vitrine-wrapper">
        <h2 class="vitrine-title">Produtos Recomendados</h2>
        <div class="vitrine-carousel">
          ${data.recommendations.map(rec => {
            const product = rec.product;
            const discount = getDiscountPercent(product.price, product.sale_price);
            const finalPrice = product.sale_price || product.price;

            return `
              <a href="${product.link}" class="vitrine-item" data-product-id="${product.id}">
                ${discount > 0 ? `<span class="vitrine-badge">-${discount}%</span>` : ''}
                <img src="${product.image_url}" alt="${product.title}" class="vitrine-image" loading="lazy">
                <div class="vitrine-info">
                  <h3 class="vitrine-product-title">${product.title}</h3>
                  <div class="vitrine-prices">
                    ${discount > 0 ? `<span class="vitrine-price-old">${formatPrice(product.price)}</span>` : ''}
                    <span class="vitrine-price">${formatPrice(finalPrice)}</span>
                  </div>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;
    container.style.display = 'block';
  }

  // Injeta CSS
  function injectStyles() {
    if (document.getElementById('vitrine-styles')) return;

    const styles = `
      .vitrine-wrapper {
        max-width: 1200px;
        margin: 40px auto;
        padding: 0 20px;
        font-family: inherit;
      }
      .vitrine-title {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 20px;
        text-align: center;
      }
      .vitrine-carousel {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 10px;
      }
      .vitrine-carousel::-webkit-scrollbar {
        height: 6px;
      }
      .vitrine-carousel::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      .vitrine-carousel::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 3px;
      }
      .vitrine-item {
        flex: 0 0 200px;
        scroll-snap-align: start;
        text-decoration: none;
        color: inherit;
        background: #fff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        transition: transform 0.2s, box-shadow 0.2s;
        position: relative;
      }
      .vitrine-item:hover {
        transform: translateY(-4px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      }
      .vitrine-badge {
        position: absolute;
        top: 8px;
        left: 8px;
        background: #e53935;
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 4px;
        z-index: 1;
      }
      .vitrine-image {
        width: 100%;
        height: 200px;
        object-fit: cover;
      }
      .vitrine-info {
        padding: 12px;
      }
      .vitrine-product-title {
        font-size: 14px;
        font-weight: 500;
        margin: 0 0 8px;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .vitrine-prices {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .vitrine-price-old {
        font-size: 12px;
        color: #999;
        text-decoration: line-through;
      }
      .vitrine-price {
        font-size: 16px;
        font-weight: 600;
        color: #222;
      }
      @media (max-width: 768px) {
        .vitrine-item {
          flex: 0 0 160px;
        }
        .vitrine-image {
          height: 160px;
        }
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'vitrine-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  // Inicializa a vitrine
  async function init() {
    const productId = getProductIdFromDataLayer();
    if (!productId) return;

    // Adiciona ao histórico
    addToNavigationHistory(productId);

    // Injeta estilos
    injectStyles();

    // Busca e renderiza recomendações
    const data = await fetchRecommendations(productId);

    // Salva resultado em window para acesso externo
    window.VITRINE_RESULT = data;

    if (data) {
      renderRecommendations(data);
    }

    // Chama callback se definido
    if (typeof CONFIG.onLoad === 'function') {
      CONFIG.onLoad(data);
    }
  }

  // Aguarda DOM e dataLayer
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Pequeno delay para garantir que dataLayer está populado
    setTimeout(init, 500);
  }

})();
