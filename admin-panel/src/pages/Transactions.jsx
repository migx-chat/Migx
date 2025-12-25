import { useState, useEffect } from 'react';

export function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadTransactions();
  }, [page]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      // Mock data for now
      const mockData = [
        { id: 1, from: 'user1', to: 'user2', amount: 100, type: 'transfer', created_at: new Date().toISOString() },
        { id: 2, from: 'merchant1', to: 'user3', amount: 500, type: 'commission', created_at: new Date().toISOString() },
        { id: 3, from: 'admin', to: 'user1', amount: 1000, type: 'reward', created_at: new Date().toISOString() }
      ];
      setTransactions(mockData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page">Loading...</div>;
  if (error) return <div className="page error">Error: {error}</div>;

  return (
    <div className="page">
      <h2>💰 Transaction History</h2>

      {transactions.length === 0 ? (
        <p>No transactions found</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((trans) => (
              <tr key={trans.id}>
                <td>{trans.id}</td>
                <td>{trans.from}</td>
                <td>{trans.to}</td>
                <td>
                  <span style={{ fontWeight: 'bold', color: '#0a5229' }}>
                    +{trans.amount}
                  </span>
                </td>
                <td>
                  <span className="transaction-badge" style={{ background: getTypeColor(trans.type) }}>
                    {trans.type}
                  </span>
                </td>
                <td>{new Date(trans.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={transactions.length === 0}>
          Next
        </button>
      </div>

      <style>{`
        .transaction-badge {
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

function getTypeColor(type) {
  switch (type) {
    case 'transfer':
      return '#3498DB';
    case 'commission':
      return '#2ECC71';
    case 'reward':
      return '#F39C12';
    case 'game_spend':
      return '#E74C3C';
    default:
      return '#95A5A6';
  }
}
