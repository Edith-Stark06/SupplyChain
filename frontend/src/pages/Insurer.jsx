import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Insurer() {
  const [ledger, setLedger] = useState([])
  const [claims, setClaims] = useState([])
  const [tab, setTab] = useState('ledger') // 'ledger' or 'claims'
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load recent ledger entries
      const ledgerRes = await axios.get('http://localhost:5000/ledger')
      if (ledgerRes.data && ledgerRes.data.ledger) {
        setLedger(ledgerRes.data.ledger.slice(-10)) // last 10
      }

      // Load claims (with INSURER role header)
      const claimsRes = await axios.get('http://localhost:5000/claims', {
        headers: { 'x-user-role': 'INSURER' }
      })
      if (claimsRes.data && claimsRes.data.claims) {
        setClaims(claimsRes.data.claims)
      }
    } catch (err) {
      console.warn('Failed to load data:', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Insurer Dashboard</h2>
      <div style={{ marginBottom: 12 }}>
        <button 
          onClick={() => setTab('ledger')}
          style={{ fontWeight: tab === 'ledger' ? 'bold' : 'normal' }}
        >
          Recent Transactions ({ledger.length})
        </button>
        <button 
          onClick={() => setTab('claims')}
          style={{ fontWeight: tab === 'claims' ? 'bold' : 'normal', marginLeft: 8 }}
        >
          Claims ({claims.length})
        </button>
        <button onClick={loadData} style={{ marginLeft: 8 }}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {tab === 'ledger' && (
        <div>
          <h3>On-Chain Transaction Log</h3>
          {ledger.length === 0 ? (
            <p>No transactions recorded.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>TX ID</th>
                  <th>Part ID</th>
                  <th>Hash (preview)</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(tx => (
                  <tr key={tx.txId}>
                    <td>{tx.txId}</td>
                    <td style={{ fontWeight: 'bold' }}>{tx.partId}</td>
                    <td style={{ maxWidth: 180, overflowWrap: 'break-word', fontSize: 11 }}>
                      {tx.hash.substring(0, 16)}...
                    </td>
                    <td style={{ fontSize: 12 }}>{new Date(tx.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'claims' && (
        <div>
          <h3>Insurance Claims</h3>
          {claims.length === 0 ? (
            <p>No claims yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Part ID</th>
                  <th>Claimant</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(claim => (
                  <tr key={claim.CLAIM_ID}>
                    <td>{claim.CLAIM_ID}</td>
                    <td style={{ fontWeight: 'bold' }}>{claim.PART_ID}</td>
                    <td>{claim.CLAIMANT_ID}</td>
                    <td style={{ 
                      color: claim.STATUS === 'OPEN' ? '#ff9800' : '#4caf50',
                      fontWeight: 'bold'
                    }}>
                      {claim.STATUS}
                    </td>
                    <td style={{ fontSize: 12 }}>{claim.CREATED_AT}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
