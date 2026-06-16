import { useEffect, useState } from 'react';
import { suppliersAPI } from '../services/api';
import DataTable from '../components/DataTable';
import Badge from '../components/Badge';
import { Users } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await suppliersAPI.getAll();
      setSuppliers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const columns = [
    { header: 'Supplier Name', accessor: 'name', cell: r => <span className="font-semibold text-primary">{r.name}</span> },
    { header: 'Contact Person', accessor: 'contact_person' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { 
      header: 'Reliability', 
      accessor: 'reliability_score',
      cell: r => {
        const score = r.reliability_score * 100;
        let colorClass = 'text-success';
        if (score < 80) colorClass = 'text-warning';
        if (score < 60) colorClass = 'text-danger';
        
        return <span className={`font-bold ${colorClass}`}>{score.toFixed(0)}%</span>;
      }
    },
    { header: 'Status', accessor: 'status', cell: r => <Badge type={r.status} text={r.status} /> }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Users className="text-accent" />
          <h1 className="text-xl font-bold text-primary m-0">Supplier Management</h1>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={suppliers} 
        isLoading={loading}
      />
    </div>
  );
}
