import './DataTable.css';

export default function DataTable({ columns, data, onRowClick, isLoading = false }) {
  
  if (isLoading) {
    return (
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, rIdx) => (
              <tr key={`skeleton-${rIdx}`}>
                {columns.map((_, cIdx) => (
                  <td key={cIdx}>
                    <div className="skeleton-line" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ width: col.width || 'auto' }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="data-table__empty">
                No data available.
              </td>
            </tr>
          ) : (
            data.map((row, rIdx) => (
              <tr 
                key={row.id || rIdx} 
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? 'data-table__row--clickable' : ''}
              >
                {columns.map((col, cIdx) => (
                  <td key={cIdx}>
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
