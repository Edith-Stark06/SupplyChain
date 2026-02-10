import React, { useState } from 'react'
import axios from 'axios'

export default function Verify() {
  const [partId, setPartId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const doVerify = async () => {
    setLoading(true)
    setResult(null)
    try {
      // Call the new canonical DB-backed verification endpoint
      const res = await axios.get(`http://localhost:5000/verifyDbPart/${encodeURIComponent(partId)}`)
      const data = res.data
      if (data.status === 'VERIFIED') {
        setResult({
          type: 'success',
          verdict: data.verdict,
          isMatched: data.isMatched,
          message: data.isMatched ? '✔ Part is AUTHENTIC and untampered!' : '✖ Part has been TAMPERED with!',
          details: data
        })
      } else {
        setResult({
          type: 'error',
          message: data.message || 'Verification error',
          details: data
        })
      }
    } catch (err) {
      let msg = 'Error: ' + err.message
      if (err.response && err.response.status === 404) {
        msg = 'Part not found in database or blockchain'
      }
      setResult({
        type: 'error',
        message: msg,
        details: err.response?.data || null
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Verify Part Authenticity</h2>
      <p style={{ fontSize: 12, color: '#666' }}>Enter a Part ID to verify it against the blockchain audit trail.</p>
      <input 
        placeholder="Part ID (e.g., SHI300)" 
        value={partId} 
        onChange={e => setPartId(e.target.value)}
        disabled={loading}
      />
      <button onClick={doVerify} disabled={loading}>
        {loading ? 'Verifying...' : 'Verify Part'}
      </button>
      {result && (
        <div style={{
          marginTop: 16,
          padding: 12,
          border: `2px solid ${result.type === 'success' ? '#4caf50' : '#f44336'}`,
          borderRadius: 4,
          backgroundColor: result.type === 'success' ? '#f1f8f5' : '#fef5f5'
        }}>
          <h3 style={{ color: result.type === 'success' ? '#4caf50' : '#f44336' }}>
            {result.message}
          </h3>
          {result.details && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Details</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, marginTop: 8 }}>
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

