import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);

  const theme = searchParams.get('theme') ?? 'dark';
  const width = searchParams.get('width') ?? '100%';
  const height = searchParams.get('height') ?? '80';

  const script = `(function(){
  var s=document.currentScript;
  var theme=(s&&s.getAttribute('data-theme'))||${JSON.stringify(theme)};
  var w=(s&&s.getAttribute('data-width'))||${JSON.stringify(width)};
  var h=parseInt((s&&s.getAttribute('data-height'))||${JSON.stringify(height)},10)||80;
  var origin=${JSON.stringify(origin)};
  var iframe=document.createElement('iframe');
  iframe.src=origin+'/live/widget?theme='+encodeURIComponent(theme);
  iframe.width=w;
  iframe.height=String(h);
  iframe.setAttribute('frameborder','0');
  iframe.setAttribute('scrolling','no');
  iframe.style.cssText='border:none;border-radius:12px;overflow:hidden;display:block;width:'+w+';max-width:100%;';
  if(s&&s.parentNode){s.parentNode.insertBefore(iframe,s.nextSibling);}
  else{document.body&&document.body.appendChild(iframe);}
})();`;

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
