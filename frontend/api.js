export async function sendToSupport(messages) {
  const res = await fetch('/.netlify/functions/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${txt}`)
  }
  return res.json()
}
