import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface KatexRendererProps {
  content: string;
}

export default function KatexRenderer({ content }: KatexRendererProps) {
  return (
    <div className="math-content text-right font-sans" dir="rtl">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          span: ({ node, className, children, ...props }) => {
            if (className?.includes('katex')) {
              return (
                <span dir="ltr" className="inline-block px-1 select-all font-mono" {...props}>
                  {children}
                </span>
              );
            }
            return <span className={className} {...props}>{children}</span>;
          },
          div: ({ node, className, children, ...props }) => {
            if (className?.includes('katex-display')) {
              return (
                <div dir="ltr" className="my-3 overflow-x-auto py-2 text-center" {...props}>
                  {children}
                </div>
              );
            }
            return <div className={className} {...props}>{children}</div>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}