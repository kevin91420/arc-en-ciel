export async function GET() {
  return new Response("google-site-verification: google319b17f3a7a0558d.html", {
    headers: { "Content-Type": "text/html" },
  });
}
