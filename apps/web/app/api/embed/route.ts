<<<<<<< HEAD
import { NextRequest } from 'next/server';
=======
import { NextRequest, NextResponse } from 'next/server';
>>>>>>> origin/main
import { SYMBOLS } from '../../lib/signals';

const VALID_SYMBOLS = new Set(SYMBOLS.map(s => s.symbol));

export async function GET(request: NextRequest) {
<<<<<<< HEAD
  const { searchParams, origin } = new URL(request.url);

  const rawPair = searchParams.get('pair')?.toUpperCase() ?? 'BTCUSD';
  const pair = VALID_SYMBOLS.has(rawPair) ? rawPair : 'BTCUSD';

  // The JS script reads data-* attributes from the script tag itself,
  // falling back to the URL query param for the pair.
  const script = `(function(){
=======
  try {
    const { searchParams, origin } = new URL(request.url);

    const rawPair = searchParams.get('pair')?.toUpperCase() ?? 'BTCUSD';
    const pair = VALID_SYMBOLS.has(rawPair) ? rawPair : 'BTCUSD';

    // The JS script reads data-* attributes from the script tag itself,
    // falling back to the URL query param for the pair.
    const script = `(function(){
>>>>>>> origin/main
  var s=document.currentScript;
  var pair=(s&&s.getAttribute('data-pair'))||${JSON.stringify(pair)};
  var theme=(s&&s.getAttribute('data-theme'))||'dark';
  var w=parseInt((s&&s.getAttribute('data-width'))||'320',10)||320;
  var h=parseInt((s&&s.getAttribute('data-height'))||'420',10)||420;
  var origin=${JSON.stringify(origin)};
  var iframe=document.createElement('iframe');
  iframe.src=origin+'/embed/'+encodeURIComponent(pair)+'?theme='+encodeURIComponent(theme);
  iframe.width=String(w);
  iframe.height=String(h);
  iframe.setAttribute('frameborder','0');
  iframe.setAttribute('scrolling','no');
  iframe.style.cssText='border:none;border-radius:12px;overflow:hidden;display:block;';
  if(s&&s.parentNode){s.parentNode.insertBefore(iframe,s.nextSibling);}
  else{document.currentScript&&document.currentScript.parentNode&&document.currentScript.parentNode.appendChild(iframe);}
})();`;

<<<<<<< HEAD
  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
=======
    return new Response(script, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
>>>>>>> origin/main
}
