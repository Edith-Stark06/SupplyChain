import React, { useState } from 'react'
import axios from 'axios'

export default function Claims() {
  const [form, setForm] = useState({
    partId: '',
    claimantId: '',
    insurerId: '',
    description: ''
  })
  const [status, setStatus] = useState(null)

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const submitClaim = async () => {
    setStatus('Submitting claim...')
    try {
      const res = await axios.post('http://localhost:5000/claims', form, {
        headers: { 'x-user-role': 'CONSUMER' }
      })
      if (res.data && res.data.status === 'CREATED') {
        setStatus('✔ Claim submitted successfully!')
        setForm({ partId: '', claimantId: '', insurerId: '', description: '' })
      } else {
        setStatus('✖ Failed: ' + (res.data.message || JSON.stringify(res.data)))
      }
    } catch (err) {
      setStatus('✖ Error: ' + err.message)
    }
  }

  return (
    <div className="form-container">
      <h2>File a Claim</h2>
      <p style={{ fontSize: 12, color: '#666' }}>
        Report an issue or anomaly with an aircraft part for investigation.
      </p>
      <input
        name="partId"
        placeholder="Part ID"
        value={form.partId}
        onChange={handleChange}
      />
      <input
        name="claimantId"
        placeholder="Your ID / Organization"
        value={form.claimantId}
        onChange={handleChange}
      />
      <input
        name="insurerId"
        placeholder="Insurer ID"
        value={form.insurerId}
        onChange={handleChange}
      />
      <textarea
        name="description"
        placeholder="Describe the issue or concern..."
        value={form.description}
        onChange={handleChange}
        style={{ width: '100%', height: 80, padding: 8, marginTop: 8 }}
      />
      <button onClick={submitClaim} style={{ marginTop: 8 }}>Submit Claim</button>
      <div style={{ marginTop: 12 }}>{status}</div>
    </div>
  )
}
