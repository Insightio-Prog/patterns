import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>Patterns — live demo</title>
        <meta
          name="description"
          content="Describe what you want to track. Claude builds the tracker."
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: 'html,body{background:#0A0908;height:100%;} *{scrollbar-width:none;} *::-webkit-scrollbar{display:none;}',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
