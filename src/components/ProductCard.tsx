import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  key?: React.Key;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Link
      to={`/products/${product.slug}`}
      onClick={() => window.umami?.track('view_product_card', { product_slug: product.slug })}
      className="group relative bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col"
    >
      {/* Product image */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent z-10 opacity-40" />
        <img
          src={product.images.cover}
          alt={product.name}
          className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Price badge */}
        <div className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-sm border border-zinc-700 rounded-full px-4 py-1.5 flex items-center gap-2">
          <span className="text-zinc-500 line-through text-xs">{product.originalPrice}</span>
          <span className="text-white font-bold text-sm">{product.price}</span>
        </div>
      </div>

      {/* Product info */}
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-indigo-400" />
          <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Digital Product</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">
          {product.name}
        </h3>
        <p className="text-zinc-400 text-sm leading-relaxed mb-6 line-clamp-2 flex-1">
          {product.tagline}
        </p>
        <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-bold uppercase tracking-widest group-hover:gap-3 transition-all">
          View Product <ArrowRight size={14} />
        </div>
      </div>
    </Link>
  );
};
