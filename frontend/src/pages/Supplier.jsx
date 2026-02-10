import React, { useState } from 'react'
import axios from 'axios'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'

function computeHash(form) {
  // simple canonical string for client-side pre-check
  const data = `${form.partId}|${form.supplierId}|${form.batchNo}|${form.quantity}|${form.mfgDate}`
  // use browser SubtleCrypto if available
  if (window.crypto && window.crypto.subtle) {
    const enc = new TextEncoder()
    return window.crypto.subtle.digest('SHA-256', enc.encode(data)).then(buf => {
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    })
  }
  // fallback simple hash (not cryptographically strong)
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i)
    hash |= 0
  }
  return Promise.resolve(hash.toString())
}

export default function Supplier() {
  const [form, setForm] = useState({
    supplierId: '',
    partId: '',
    partName: '',
    batchNo: '',
    quantity: 0,
    mfgDate: ''
  })
  const [status, setStatus] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [lastHash, setLastHash] = useState(null)

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const generateQrAndHash = async () => {
    const hash = await computeHash(form)
    setLastHash(hash)
    const qrText = JSON.stringify({ partId: form.partId, hash })
    const dataUrl = await QRCode.toDataURL(qrText)
    setQrDataUrl(dataUrl)
    return { hash, dataUrl }
  }

  const exportPdf = async () => {
    const { hash } = await generateQrAndHash()
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Part Verification Proof', 14, 20)
    doc.text(`Part ID: ${form.partId}`, 14, 32)
    doc.text(`Supplier ID: ${form.supplierId}`, 14, 40)
    doc.text(`Hash: ${hash}`, 14, 48)
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 14, 60, 60, 60)
    }
    doc.save(`${form.partId || 'part'}-proof.pdf`)
  }

  const submit = async () => {
    setStatus('Submitting...')
    try {
      // compute hash and attach for clarity
      const { hash } = await generateQrAndHash()
      const payload = { ...form, partHash: hash }
      const res = await axios.post('http://localhost:5000/submitPart', payload)
      if (res.data && res.data.status === 'SUCCESS') {
        setStatus('✔ Part stored successfully. TX: ' + res.data.blockchainTxId)
      } else {
        setStatus('✖ Failed: ' + (res.data.message || JSON.stringify(res.data)))
      }
    } catch (err) {
      setStatus('✖ Error: ' + err.message)
    }
  }

  return (
    <div className="form-container">
      <h2>Supplier - Submit Part</h2>
      <p style={{ fontSize: 12, color: '#666' }}>Register a new aircraft part with an immutable on-chain record.</p>
      <input name="supplierId" placeholder="Supplier ID" onChange={handleChange} />
      <input name="partId" placeholder="Part ID" onChange={handleChange} />
      <input name="partName" placeholder="Part Name" onChange={handleChange} />
      <input name="batchNo" placeholder="Batch No" onChange={handleChange} />
      <input name="quantity" type="number" placeholder="Quantity" onChange={handleChange} />
      <input name="mfgDate" type="date" placeholder="MFG Date" onChange={handleChange} />
      <div style={{ marginTop: 8 }}>
        <button onClick={submit}>Submit Part</button>
        <button onClick={generateQrAndHash} style={{ marginLeft: 8 }}>Generate QR & Hash</button>
        <button onClick={exportPdf} style={{ marginLeft: 8 }}>Export Proof (PDF)</button>
      </div>
      <div style={{ marginTop: 12 }}>{status}</div>
      {lastHash && <div><strong>Last computed hash:</strong> <code style={{ wordBreak: 'break-all' }}>{lastHash}</code></div>}
      {qrDataUrl && <div><img src={qrDataUrl} alt="QR" style={{ marginTop: 12, width: 160 }} /></div>}
    </div>
  )
}
