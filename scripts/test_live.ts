async function testLive() {
  try {
    const res = await fetch("https://productalert.vercel.app");
    console.log("Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Body length:", text.length);
    console.log("Body start:", text.slice(0, 300));
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testLive();
