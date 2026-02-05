# Vitrine de Recomendações - Implementação Frontend

Widget JavaScript para exibir recomendações de produtos personalizadas.

## Instalação

### 1. Adicione o container HTML

Na página de produto, adicione o elemento onde a vitrine será renderizada:

```html
<div id="vitrine-recomendacoes"></div>
```

### 2. Inclua o script via jsDelivr

```html
<script src="https://cdn.jsdelivr.net/gh/mymetric/constance-vitrine-frontend@main/vitrine.js"></script>
```

Para usar uma versão específica (recomendado em produção):

```html
<script src="https://cdn.jsdelivr.net/gh/mymetric/constance-vitrine-frontend@27dfe2c/vitrine.js"></script>
```

## Requisitos

### dataLayer (Google Tag Manager)

O script busca o `product_id` do dataLayer. Certifique-se de que o dataLayer contém o ID do produto em uma das seguintes estruturas:

**Enhanced Ecommerce (UA):**
```javascript
dataLayer.push({
  ecommerce: {
    detail: {
      products: [{ id: '8893000' }]
    }
  }
});
```

**GA4 Ecommerce:**
```javascript
dataLayer.push({
  ecommerce: {
    items: [{ item_id: '8893000' }]
  }
});
```

**Estrutura simples:**
```javascript
dataLayer.push({
  productId: '8893000'
});
// ou
dataLayer.push({
  product_id: '8893000'
});
```

## Funcionalidades

- **Histórico de navegação**: Salva os últimos produtos visualizados no localStorage
- **Carousel responsivo**: Adapta-se a diferentes tamanhos de tela
- **Badge de desconto**: Exibe automaticamente o percentual de desconto
- **Lazy loading**: Imagens carregam sob demanda
- **CSS incluso**: Estilos injetados automaticamente

## Customização de Estilos

Os estilos são injetados com a classe `.vitrine-*`. Para sobrescrever, use CSS com maior especificidade:

```css
#vitrine-recomendacoes .vitrine-title {
  font-size: 28px;
  color: #333;
}

#vitrine-recomendacoes .vitrine-item {
  flex: 0 0 220px;
}

#vitrine-recomendacoes .vitrine-badge {
  background: #000;
}
```

## Configuração via Frontend

Os pesos são passados pelo frontend via `window.VITRINE_CONFIG`. Defina **antes** de carregar o script:

```html
<script>
  window.VITRINE_CONFIG = {
    // Quantidade de produtos
    limit: 12,

    // Pesos do algoritmo (devem somar ~1.0)
    weights: {
      grade: 0.25,      // Disponibilidade/estoque
      shipping: 0.15,   // Custo de frete
      discount: 0.20,   // Desconto
      similarity: 0.25, // Similaridade textual
      history: 0.15     // Histórico de navegação
    }
  };
</script>
<script src="https://cdn.jsdelivr.net/gh/mymetric/constance-vitrine-frontend@main/vitrine.js"></script>
```

### A/B Testing

**Variante A** - Foco em conversão (desconto + disponibilidade):
```html
<script>
  window.VITRINE_CONFIG = {
    weights: { grade: 0.35, shipping: 0.10, discount: 0.30, similarity: 0.15, history: 0.10 }
  };
</script>
```

**Variante B** - Foco em relevância (similaridade + histórico):
```html
<script>
  window.VITRINE_CONFIG = {
    weights: { grade: 0.15, shipping: 0.10, discount: 0.15, similarity: 0.35, history: 0.25 }
  };
</script>
```

## Troubleshooting

### Vitrine não aparece

1. Verifique se o container `#vitrine-recomendacoes` existe na página
2. Abra o console do navegador e procure por erros `[Vitrine]`
3. Verifique se o dataLayer contém o `product_id`

### Produto não encontrado

A API aceita tanto o `id` do produto quanto o `parent_id` (idProduto). Se o produto não for encontrado, verifique se o ID está correto no catálogo.

### Debug

Para verificar se um produto existe:

```
https://constance-vitrine-production.up.railway.app/api/v1/health/product-lookup/{ID}
```

## API Reference

**Endpoint:** `POST /api/v1/recommendations/`

**Request:**
```json
{
  "product_id": "8893000",
  "navigation_history": ["1234000", "5678000"],
  "weights": {
    "grade": 0.25,
    "shipping": 0.15,
    "discount": 0.20,
    "similarity": 0.25,
    "history": 0.15
  },
  "limit": 10
}
```

**Response:**
```json
{
  "reference_product_id": "8893000",
  "recommendations": [
    {
      "product": {
        "id": "10115039",
        "title": "Sandália Verniz Off White Tira",
        "price": 169.99,
        "sale_price": 79.99,
        "image_url": "https://...",
        "link": "https://...",
        "category": "Sapatos > Sandálias",
        "sizes_available": []
      },
      "total_score": 0.729,
      "score_breakdown": { ... }
    }
  ]
}
```
